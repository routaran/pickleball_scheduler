/**
 * Player Search Module
 * Implements 8-tier cascade search for finding DUPR players
 */

import { DUPRClient, DUPRPlayer, TokenExpiredError } from './dupr-client';
import { PlayerRegistry } from './player-registry';
import { NicknameResolver, nicknameResolver } from './nickname-resolver';

// =============================================================================
// Constants
// =============================================================================

export const ALBERTA_LAT = 53.9332706;
export const ALBERTA_LNG = -116.5765035;
export const CANADA_LAT = 56.130366;
export const CANADA_LNG = -106.346771;
export const DEFAULT_RATING = 3.0;
export const FUZZY_THRESHOLD = 0.85;

// Common short last names that need special handling (full name search preferred)
const SHORT_COMMON_LASTNAMES = new Set([
  'ng', 'hu', 'wu', 'li', 'le', 'lu', 'ma', 'xu', 'yu', 'ye', 'he', 'ho',
  'wong', 'chen', 'wang', 'zhang', 'liu', 'yang', 'huang', 'zhao', 'zhou', 'sun',
  'smith', 'lee', 'kim'
]);

// =============================================================================
// Types
// =============================================================================

export interface SearchResult {
  /** Original search name */
  name: string;
  /** Player's rating (DEFAULT_RATING if not found) */
  rating: number;
  /** DUPR player ID if found */
  playerId: number | null;
  /** DUPR ID string if found */
  duprId: string | null;
  /** Full name from DUPR if found */
  duprName: string | null;
  /** Profile URL if found */
  profileUrl: string | null;
  /** Whether player was found in DUPR */
  found: boolean;
  /** How the player was found (registry, override, exact_match, fuzzy_match, default) */
  searchMethod: string;
  /** Location from DUPR if found */
  location: string | null;
}

export interface PlayerOverride {
  duprId: string;
  duprName: string;
  rating: number;
}

export interface SearchConfig {
  /** Player overrides by lowercase name */
  overrides?: Map<string, PlayerOverride>;
  /** Location text for search (e.g., "Alberta, Canada") */
  defaultLocationText?: string;
}

/** Progress callback for batch search operations */
export interface SearchProgressCallback {
  /** Called when starting to search for a player */
  onStart?: (index: number, total: number, name: string) => void;
  /** Called when a player search completes */
  onComplete?: (index: number, total: number, result: SearchResult) => void;
}

// =============================================================================
// PlayerSearcher Class
// =============================================================================

export class PlayerSearcher {
  private client: DUPRClient;
  private registry: PlayerRegistry;
  private nicknameResolver: NicknameResolver;
  private overrides: Map<string, PlayerOverride>;
  private defaultLocationText: string;
  private debug: boolean;

  constructor(
    client: DUPRClient,
    registry?: PlayerRegistry,
    config?: SearchConfig
  ) {
    this.client = client;
    this.registry = registry ?? new PlayerRegistry();
    this.nicknameResolver = nicknameResolver;
    this.overrides = config?.overrides ?? new Map();
    this.defaultLocationText = config?.defaultLocationText ?? 'Alberta, Canada';
    this.debug = true;
  }

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[PlayerSearcher]', ...args);
    }
  }

  /**
   * Search for a player using 8-tier cascade
   *
   * Cascade order:
   * 1. Registry (cached matches)
   * 2. Overrides
   * 3. Full Name + Alberta location
   * 4. Last Name + Alberta location
   * 5. Full Name + Canada location
   * 6. Last Name + Canada location
   * 7. Last Name + No filter
   * 8. Full Name + No filter
   * 9. Default rating fallback
   */
  async searchPlayer(fullName: string): Promise<SearchResult> {
    const cleanName = this.cleanName(fullName);
    const nameLower = cleanName.toLowerCase();

    this.log(`Searching for player: "${cleanName}"`);

    // Tier 1: Check registry cache
    const cached = this.registry.get(nameLower);
    if (cached) {
      this.log(`  Found in registry cache: ${cached.duprName} (${cached.rating})`);
      return this.makeResult(cleanName, cached.rating ?? DEFAULT_RATING, {
        playerId: parseInt(cached.duprId) || null,
        duprId: cached.duprId,
        duprName: cached.duprName,
        profileUrl: `https://dashboard.dupr.com/dashboard/player/${cached.duprId}`,
        found: true,
        searchMethod: 'registry',
        location: cached.location,
      });
    }

    // Tier 2: Check overrides
    const override = this.overrides.get(nameLower);
    if (override) {
      this.log(`  Found in overrides: ${override.duprName} (${override.rating})`);
      return this.makeResult(cleanName, override.rating, {
        playerId: null,
        duprId: override.duprId,
        duprName: override.duprName,
        profileUrl: null,
        found: true,
        searchMethod: 'override',
        location: null,
      });
    }

    // Extract name parts
    const parts = cleanName.split(/\s+/);
    const lastName = parts[parts.length - 1];
    const isShortCommonLastName = this.isShortCommonName(lastName);

    // Tier 3: Full Name + Alberta
    this.log(`  Tier 3: Searching "${cleanName}" in Alberta...`);
    let result = await this.searchWithLocation(cleanName, 'Alberta, Canada', ALBERTA_LAT, ALBERTA_LNG);
    if (result) {
      this.log(`  Found via exact_alberta: ${result.fullName} (${result.bestRating})`);
      this.cacheResult(cleanName, result);
      return this.makeFoundResult(cleanName, result, 'exact_alberta');
    }

    // Tier 4: Last Name + Alberta (skip for short common names)
    if (!isShortCommonLastName && lastName !== cleanName) {
      this.log(`  Tier 4: Searching last name "${lastName}" in Alberta...`);
      result = await this.searchWithLocation(lastName, 'Alberta, Canada', ALBERTA_LAT, ALBERTA_LNG, cleanName);
      if (result) {
        this.log(`  Found via lastname_alberta: ${result.fullName} (${result.bestRating})`);
        this.cacheResult(cleanName, result);
        return this.makeFoundResult(cleanName, result, 'lastname_alberta');
      }
    }

    // Tier 5: Full Name + Canada
    this.log(`  Tier 5: Searching "${cleanName}" in Canada...`);
    result = await this.searchWithLocation(cleanName, 'Canada', CANADA_LAT, CANADA_LNG);
    if (result) {
      this.log(`  Found via exact_canada: ${result.fullName} (${result.bestRating})`);
      this.cacheResult(cleanName, result);
      return this.makeFoundResult(cleanName, result, 'exact_canada');
    }

    // Tier 6: Last Name + Canada
    if (!isShortCommonLastName && lastName !== cleanName) {
      this.log(`  Tier 6: Searching last name "${lastName}" in Canada...`);
      result = await this.searchWithLocation(lastName, 'Canada', CANADA_LAT, CANADA_LNG, cleanName);
      if (result) {
        this.log(`  Found via lastname_canada: ${result.fullName} (${result.bestRating})`);
        this.cacheResult(cleanName, result);
        return this.makeFoundResult(cleanName, result, 'lastname_canada');
      }
    }

    // Tier 7: Last Name + No filter
    if (!isShortCommonLastName && lastName !== cleanName) {
      this.log(`  Tier 7: Searching last name "${lastName}" globally...`);
      result = await this.searchNoFilter(lastName, cleanName);
      if (result) {
        this.log(`  Found via lastname_global: ${result.fullName} (${result.bestRating})`);
        this.cacheResult(cleanName, result);
        return this.makeFoundResult(cleanName, result, 'lastname_global');
      }
    }

    // Tier 8: Full Name + No filter
    this.log(`  Tier 8: Searching "${cleanName}" globally...`);
    result = await this.searchNoFilter(cleanName);
    if (result) {
      this.log(`  Found via exact_global: ${result.fullName} (${result.bestRating})`);
      this.cacheResult(cleanName, result);
      return this.makeFoundResult(cleanName, result, 'exact_global');
    }

    // Tier 9: Default rating fallback
    this.log(`  NOT FOUND - using default rating ${DEFAULT_RATING}`);
    return this.makeResult(cleanName, DEFAULT_RATING, {
      playerId: null,
      duprId: null,
      duprName: null,
      profileUrl: null,
      found: false,
      searchMethod: 'default',
      location: null,
    });
  }

  /**
   * Search with location filter and find best match
   */
  private async searchWithLocation(
    query: string,
    locationText: string,
    lat: number,
    lng: number,
    fullName?: string
  ): Promise<DUPRPlayer | null> {
    try {
      const players = await this.client.searchPlayers(query, locationText, lat, lng);
      this.log(`    API returned ${players.length} results for "${query}" in ${locationText}`);
      return this.findBestMatch(players, fullName ?? query);
    } catch (error) {
      // Re-throw auth errors so UI can handle them
      if (error instanceof TokenExpiredError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.log(`    ERROR searching "${query}" in ${locationText}: ${message}`);
      return null;
    }
  }

  /**
   * Search without location filter
   */
  private async searchNoFilter(query: string, fullName?: string): Promise<DUPRPlayer | null> {
    try {
      const players = await this.client.searchPlayers(query);
      this.log(`    API returned ${players.length} results for "${query}" (no location)`);
      return this.findBestMatch(players, fullName ?? query);
    } catch (error) {
      // Re-throw auth errors so UI can handle them
      if (error instanceof TokenExpiredError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.log(`    ERROR searching "${query}" globally: ${message}`);
      return null;
    }
  }

  /**
   * Find the best matching player from search results
   * Uses exact matching, then nickname matching, then fuzzy matching
   */
  private findBestMatch(players: DUPRPlayer[], searchName: string): DUPRPlayer | null {
    if (players.length === 0) return null;

    const searchLower = searchName.toLowerCase();
    const searchParts = searchLower.split(/\s+/);

    // Try exact match first
    for (const player of players) {
      if (player.fullName.toLowerCase() === searchLower) {
        return player;
      }
    }

    // Try nickname matching
    for (const player of players) {
      const playerParts = player.fullName.toLowerCase().split(/\s+/);
      if (this.namesMatchWithNicknames(searchParts, playerParts)) {
        return player;
      }
    }

    // Try fuzzy matching
    for (const player of players) {
      if (this.nicknameResolver.fuzzyMatch(searchName, player.fullName, FUZZY_THRESHOLD)) {
        return player;
      }
    }

    // Return first result if any exist (best API match)
    return players[0];
  }

  /**
   * Check if names match considering nicknames
   */
  private namesMatchWithNicknames(searchParts: string[], playerParts: string[]): boolean {
    if (searchParts.length !== playerParts.length) return false;

    for (let i = 0; i < searchParts.length; i++) {
      const search = searchParts[i];
      const player = playerParts[i];

      if (search === player) continue;
      if (this.nicknameResolver.areNamesEquivalent(search, player)) continue;
      return false;
    }

    return true;
  }

  /**
   * Clean player name (remove guest markers, trim whitespace)
   */
  private cleanName(name: string): string {
    return name
      .replace(/\s*\(G\)\s*/gi, '')
      .replace(/\s*\(Guest\)\s*/gi, '')
      .replace(/\s*\([^)]*\)\s*$/, '')
      .trim();
  }

  /**
   * Check if a name is short and common (skip last-name-only searches)
   */
  private isShortCommonName(name: string): boolean {
    return name.length <= 3 || SHORT_COMMON_LASTNAMES.has(name.toLowerCase());
  }

  /**
   * Cache a successful search result
   */
  private cacheResult(searchName: string, player: DUPRPlayer): void {
    this.registry.register(
      searchName,
      player.duprId,
      player.fullName,
      player.bestRating,
      player.shortAddress
    );
  }

  /**
   * Create a search result from a found player
   */
  private makeFoundResult(name: string, player: DUPRPlayer, method: string): SearchResult {
    return this.makeResult(name, player.bestRating ?? DEFAULT_RATING, {
      playerId: player.id,
      duprId: player.duprId,
      duprName: player.fullName,
      profileUrl: player.profileUrl,
      found: true,
      searchMethod: method,
      location: player.shortAddress,
    });
  }

  /**
   * Create a search result
   */
  private makeResult(
    name: string,
    rating: number,
    data: Omit<SearchResult, 'name' | 'rating'>
  ): SearchResult {
    return { name, rating, ...data };
  }

  /**
   * Add or update an override
   */
  setOverride(name: string, override: PlayerOverride): void {
    this.overrides.set(name.toLowerCase(), override);
  }

  /**
   * Remove an override
   */
  removeOverride(name: string): boolean {
    return this.overrides.delete(name.toLowerCase());
  }

  /**
   * Get the registry (for persistence)
   */
  getRegistry(): PlayerRegistry {
    return this.registry;
  }

  /**
   * Get the DUPR client (for testing/access)
   */
  getClient(): DUPRClient {
    return this.client;
  }

  /**
   * Search for multiple players
   * @param names Array of player names to search
   * @param progress Optional callback for progress updates
   * @returns Array of search results in same order as input
   */
  async searchPlayers(names: string[], progress?: SearchProgressCallback): Promise<SearchResult[]> {
    this.log(`Starting search for ${names.length} players`);
    const results: SearchResult[] = [];
    let foundCount = 0;
    let notFoundCount = 0;

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      this.log(`[${i + 1}/${names.length}] Processing: "${name}"`);

      // Notify progress callback that we're starting this player
      progress?.onStart?.(i, names.length, name);

      const result = await this.searchPlayer(name);
      results.push(result);

      if (result.found) {
        foundCount++;
      } else {
        notFoundCount++;
      }

      // Notify progress callback that this player is complete
      progress?.onComplete?.(i, names.length, result);
    }

    this.log(`Search complete: ${foundCount} found, ${notFoundCount} not found (using default ${DEFAULT_RATING})`);
    return results;
  }
}
