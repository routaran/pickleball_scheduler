/**
 * DUPR Client Module
 * Handles communication with DUPR API for player search
 */

import axios, { AxiosInstance } from 'axios';

// =============================================================================
// Constants
// =============================================================================

export const DUPR_API_URL = 'https://api.dupr.gg/player/v1.0/search';
export const REQUEST_DELAY_MS = 500;
export const RETRY_COUNT = 3;
export const RETRY_DELAY_MS = 2000;

// =============================================================================
// Types
// =============================================================================

export interface PlayerRating {
  singles: number | null;
  doubles: number | null;
  singlesVerified: boolean;
  doublesVerified: boolean;
}

export interface DUPRPlayer {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  shortAddress: string;
  ratings: PlayerRating;
  duprId: string;
  profileUrl: string;
  /** Best available rating (prefers doubles, falls back to singles) */
  bestRating: number | null;
}

export interface DUPRSearchRequest {
  query: string;
  limit?: number;
  offset?: number;
  locationText?: string;
  lat?: number;
  lng?: number;
}

export interface DUPRAPIResponse {
  status: 'SUCCESS' | 'ERROR';
  result?: {
    hits: DUPRAPIHit[];
    total: number;
  };
  error?: string;
}

export interface DUPRAPIHit {
  id: number;
  fullName: string;
  firstName?: string;
  lastName?: string;
  duprId: string;
  shortAddress: string;
  ratings: {
    singles: number | 'NR';
    doubles: number | 'NR';
    singlesVerified: boolean | 'NR';
    doublesVerified: boolean | 'NR';
  };
}

// =============================================================================
// Error Classes
// =============================================================================

export class DUPRAPIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'DUPRAPIError';
  }
}

export class TokenExpiredError extends DUPRAPIError {
  constructor(message = 'Authentication token expired') {
    super(message, 401);
    this.name = 'TokenExpiredError';
  }
}

export class RateLimitError extends DUPRAPIError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

export class PlayerNotFoundError extends DUPRAPIError {
  constructor(query: string) {
    super(`Player not found: ${query}`, 404);
    this.name = 'PlayerNotFoundError';
  }
}

// =============================================================================
// DUPRClient Class
// =============================================================================

export class DUPRClient {
  private token: string;
  private lastRequestTime: number = 0;
  private axiosInstance: AxiosInstance;
  private debug: boolean;

  constructor(token: string, debug = true) {
    this.token = token;
    this.debug = debug;
    this.axiosInstance = axios.create({
      baseURL: 'https://api.dupr.gg',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[DUPRClient]', ...args);
    }
  }

  /**
   * Wait to respect rate limiting (500ms between requests)
   */
  private async rateLimitWait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < REQUEST_DELAY_MS) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Make a request to the DUPR API with retry logic
   */
  private async makeRequest(payload: DUPRSearchRequest): Promise<DUPRAPIResponse> {
    await this.rateLimitWait();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < RETRY_COUNT; attempt++) {
      try {
        this.log(`API request: query="${payload.query}" location="${payload.locationText || 'none'}" attempt=${attempt + 1}`);

        const response = await this.axiosInstance.post<DUPRAPIResponse>(
          '/player/v1.0/search',
          {
            filter: {
              locationText: payload.locationText || '',
              ...(payload.lat !== undefined && payload.lng !== undefined
                ? { lat: payload.lat, lng: payload.lng }
                : {}),
            },
            limit: payload.limit || 20,
            offset: payload.offset || 0,
            query: payload.query,
          }
        );

        const hitCount = response.data.result?.hits?.length ?? 0;
        this.log(`API response: status=${response.data.status} hits=${hitCount}`);

        return response.data;
      } catch (error) {
        lastError = error as Error;

        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const message = error.response?.data?.message || error.message;
          this.log(`API error: status=${status} message="${message}" attempt=${attempt + 1}`);

          // Don't retry auth errors
          if (status === 401) {
            this.log('Token expired or invalid - throwing TokenExpiredError');
            throw new TokenExpiredError();
          }

          // Rate limit - wait longer and retry
          if (status === 429) {
            if (attempt < RETRY_COUNT - 1) {
              this.log(`Rate limited, waiting ${RETRY_DELAY_MS}ms before retry`);
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
              continue;
            }
            throw new RateLimitError();
          }

          // Other errors - retry with backoff
          if (attempt < RETRY_COUNT - 1) {
            const delay = RETRY_DELAY_MS * (attempt + 1);
            this.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }

        this.log(`API request failed after ${RETRY_COUNT} attempts: ${lastError?.message}`);
        throw new DUPRAPIError(
          lastError?.message || 'Unknown error',
          axios.isAxiosError(error) ? error.response?.status : undefined
        );
      }
    }

    throw new DUPRAPIError(lastError?.message || 'Max retries exceeded');
  }

  /**
   * Search for players by name
   * @param query Player name to search for
   * @param locationText Optional location text (e.g., "Alberta, Canada")
   * @param lat Optional latitude for location filtering
   * @param lng Optional longitude for location filtering
   * @returns Array of matching players
   */
  async searchPlayers(
    query: string,
    locationText?: string,
    lat?: number,
    lng?: number
  ): Promise<DUPRPlayer[]> {
    const response = await this.makeRequest({
      query,
      locationText,
      lat,
      lng,
      limit: 20,
      offset: 0,
    });

    if (response.status !== 'SUCCESS' || !response.result) {
      return [];
    }

    return response.result.hits.map(apiHitToPlayer);
  }

  /**
   * Update the authentication token
   */
  setToken(token: string): void {
    this.token = token;
    this.axiosInstance.defaults.headers['Authorization'] = `Bearer ${token}`;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse rating value from API response (can be number, string, or 'NR')
 */
function parseRating(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === 'NR') {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Convert API hit to DUPRPlayer with computed bestRating
 */
export function apiHitToPlayer(hit: DUPRAPIHit): DUPRPlayer {
  const singlesRating = parseRating(hit.ratings.singles);
  const doublesRating = parseRating(hit.ratings.doubles);

  // Prefer doubles rating, fall back to singles
  const bestRating = doublesRating ?? singlesRating;

  return {
    id: hit.id,
    fullName: hit.fullName,
    firstName: hit.firstName ?? '',
    lastName: hit.lastName ?? '',
    shortAddress: hit.shortAddress,
    duprId: hit.duprId,
    profileUrl: `https://dashboard.dupr.com/dashboard/player/${hit.id}`,
    ratings: {
      singles: singlesRating,
      doubles: doublesRating,
      singlesVerified: hit.ratings.singlesVerified === true,
      doublesVerified: hit.ratings.doublesVerified === true,
    },
    bestRating,
  };
}
