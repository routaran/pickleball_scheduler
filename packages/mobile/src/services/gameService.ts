/**
 * Game Service
 * Orchestrates game processing for all three formats:
 * - DUPR Ladder
 * - Partner DUPR
 * - PickleBros Monday
 */

import {
  parseDuprLadderPlayers,
  parsePartnerDuprTeams,
  GameType,
  calculateTeamRating,
  DUPRClient,
  PlayerSearcher,
  generateDuprLadderHtml,
  generatePartnerDuprHtml,
  generatePickleBrosMondayHtml,
  PlayerWithRating,
  TeamWithRatings,
  isValidPickleBrosCount,
  SearchResult,
  PlayerOverride as CorePlayerOverride,
} from '@dupr/core';
import { getOverrides } from './overrideStorage';
import type { PlayerOverride } from './overrideStorage';
import { RegistryService } from './registryService';
import { useAuthStore } from '../stores/authStore';

// =============================================================================
// Types
// =============================================================================

export interface ProcessResult {
  players: PlayerWithRating[];
  teams?: TeamWithRatings[];
  html: string;
}

// =============================================================================
// GameService Class
// =============================================================================

export class GameService {
  private client: DUPRClient;
  private token: string;

  constructor(token: string) {
    this.token = token;
    this.client = new DUPRClient(token);
  }

  /**
   * Create a PlayerSearcher with current overrides from storage
   */
  private async createSearcher(): Promise<PlayerSearcher> {
    // Load overrides from storage
    const storedOverrides = await getOverrides();
    console.log('[GameService] Loaded overrides:', JSON.stringify(storedOverrides));

    // Convert to Map<string, CorePlayerOverride> format expected by PlayerSearcher
    const overridesMap = new Map<string, CorePlayerOverride>();
    for (const override of storedOverrides) {
      // Validate rating before adding
      const rating = typeof override.rating === 'number' ? override.rating : 3.0;
      if (typeof override.rating !== 'number') {
        console.warn(`[GameService] Invalid rating for override ${override.searchName}:`, override.rating, '- using default 3.0');
      }
      overridesMap.set(override.searchName.toLowerCase(), {
        duprId: override.duprId,
        duprName: override.displayName,
        rating: rating,
      });
    }

    // Create searcher with overrides
    const registry = RegistryService.getRegistry();
    console.log(`[GameService] Using shared registry with ${registry.size} cached players`);
    return new PlayerSearcher(this.client, registry, {
      defaultLocationText: 'Alberta, Canada',
      overrides: overridesMap,
    });
  }

  /**
   * Process DUPR Ladder format
   * 1. Create searcher with overrides
   * 2. Parse player names
   * 3. Look up each player
   * 4. Generate HTML
   */
  async processLadder(inputText: string): Promise<ProcessResult> {
    // 1. Create searcher with overrides
    const searcher = await this.createSearcher();

    // 2. Parse player names
    const playerNames = parseDuprLadderPlayers(inputText);

    if (playerNames.length === 0) {
      throw new Error('No players found in input');
    }

    // 3. Look up each player
    const searchResults = await searcher.searchPlayers(playerNames);

    // Convert SearchResult to PlayerWithRating
    const players = this.convertSearchResultsToPlayers(searchResults);

    // 4. Generate HTML
    console.log('[GameService] processLadder - About to generate HTML for players:',
      players.map(p => ({ name: p.name, rating: p.rating, ratingType: typeof p.rating })));

    try {
      const html = generateDuprLadderHtml(players);
      console.log('[GameService] processLadder - HTML generated successfully');
      return { players, html };
    } catch (err) {
      console.error('[GameService] processLadder - HTML generation failed:', err);
      throw err;
    }
  }

  /**
   * Process Partner DUPR format
   * 1. Create searcher with overrides
   * 2. Parse team pairs
   * 3. Look up all players
   * 4. Calculate team ratings
   * 5. Generate HTML
   */
  async processPartner(inputText: string): Promise<ProcessResult> {
    // 1. Create searcher with overrides
    const searcher = await this.createSearcher();

    // 2. Parse team pairs
    const teamPairs = parsePartnerDuprTeams(inputText);

    if (teamPairs.length === 0) {
      throw new Error('No teams found in input');
    }

    // 3. Look up all players
    const allPlayerNames: string[] = [];
    for (const team of teamPairs) {
      allPlayerNames.push(team.player1, team.player2);
    }

    const searchResults = await searcher.searchPlayers(allPlayerNames);

    // Convert to map for easy lookup
    const playerMap = new Map<string, PlayerWithRating>();
    for (const result of searchResults) {
      const player = this.convertSearchResultToPlayer(result);
      playerMap.set(result.name.toLowerCase(), player);
    }

    // 4. Calculate team ratings
    const teams: TeamWithRatings[] = [];
    const allPlayers: PlayerWithRating[] = [];

    for (const teamPair of teamPairs) {
      const player1 = playerMap.get(teamPair.player1.toLowerCase());
      const player2 = playerMap.get(teamPair.player2.toLowerCase());

      if (!player1 || !player2) {
        throw new Error(
          `Missing player data for team: ${teamPair.player1} / ${teamPair.player2}`
        );
      }

      const teamRating = calculateTeamRating(player1.rating, player2.rating);

      teams.push({
        player1,
        player2,
        teamRating,
      });

      // Add unique players to allPlayers
      if (!allPlayers.some((p) => p.name === player1.name)) {
        allPlayers.push(player1);
      }
      if (!allPlayers.some((p) => p.name === player2.name)) {
        allPlayers.push(player2);
      }
    }

    // 5. Generate HTML
    console.log('[GameService] processPartner - About to generate HTML for teams:',
      teams.map(t => ({
        p1: t.player1.name, p1Rating: t.player1.rating, p1RatingType: typeof t.player1.rating,
        p2: t.player2.name, p2Rating: t.player2.rating, p2RatingType: typeof t.player2.rating,
        teamRating: t.teamRating, teamRatingType: typeof t.teamRating
      })));

    try {
      const html = generatePartnerDuprHtml(teams);
      console.log('[GameService] processPartner - HTML generated successfully');
      return { players: allPlayers, teams, html };
    } catch (err) {
      console.error('[GameService] processPartner - HTML generation failed:', err);
      throw err;
    }
  }

  /**
   * Process PickleBros Monday format
   * 1. Create searcher with overrides
   * 2. Parse player names
   * 3. Validate multiple of 4
   * 4. Look up players
   * 5. Generate HTML with fixed pools
   */
  async processPickleBros(inputText: string): Promise<ProcessResult> {
    // 1. Create searcher with overrides
    const searcher = await this.createSearcher();

    // 2. Parse player names
    const playerNames = parseDuprLadderPlayers(inputText);

    if (playerNames.length === 0) {
      throw new Error('No players found in input');
    }

    // 3. Validate multiple of 4
    if (!isValidPickleBrosCount(playerNames.length)) {
      throw new Error(
        `PickleBros requires a multiple of 4 players. You provided ${playerNames.length} players.`
      );
    }

    // 4. Look up players
    const searchResults = await searcher.searchPlayers(playerNames);

    // Convert SearchResult to PlayerWithRating
    const players = this.convertSearchResultsToPlayers(searchResults);

    // 5. Generate HTML with fixed pools
    console.log('[GameService] processPickleBros - About to generate HTML for players:',
      players.map(p => ({ name: p.name, rating: p.rating, ratingType: typeof p.rating })));

    try {
      const html = generatePickleBrosMondayHtml(players);
      console.log('[GameService] processPickleBros - HTML generated successfully');
      return { players, html };
    } catch (err) {
      console.error('[GameService] processPickleBros - HTML generation failed:', err);
      throw err;
    }
  }

  /**
   * Process any format based on GameType
   */
  async process(format: GameType, inputText: string): Promise<ProcessResult> {
    switch (format) {
      case GameType.DUPR_LADDER:
        return this.processLadder(inputText);
      case GameType.PARTNER_DUPR:
        return this.processPartner(inputText);
      case GameType.PICKLEBROS_MONDAY:
        return this.processPickleBros(inputText);
      default:
        throw new Error(`Unknown game type: ${format}`);
    }
  }

  /**
   * Convert SearchResult to PlayerWithRating
   * If DUPR search failed, check if the player is the logged-in user
   */
  private convertSearchResultToPlayer(result: SearchResult): PlayerWithRating {
    // Parse rating - handle both number and string types
    let rating: number;
    let searchMethod = result.searchMethod;

    if (typeof result.rating === 'number') {
      rating = result.rating;
    } else if (typeof result.rating === 'string') {
      rating = parseFloat(result.rating);
      if (isNaN(rating)) {
        console.warn(`[GameService] Could not parse rating for player ${result.name}:`, result.rating, '- using default 3.0');
        rating = 3.0;
      } else {
        console.log(`[GameService] Parsed string rating for player ${result.name}: "${result.rating}" -> ${rating}`);
      }
    } else {
      console.warn(`[GameService] Invalid rating type for player ${result.name}:`, result.rating, typeof result.rating, '- using default 3.0');
      rating = 3.0;
    }

    // If search failed (using default rating), check if this is the logged-in user
    if (!result.found || rating === 3.0) {
      const authUser = useAuthStore.getState().user;
      if (authUser && authUser.name && authUser.rating) {
        // Compare names case-insensitively
        const searchNameLower = result.name.toLowerCase().trim();
        const authNameLower = authUser.name.toLowerCase().trim();

        if (searchNameLower === authNameLower) {
          console.log(`[GameService] Player "${result.name}" matches logged-in user, using auth rating: ${authUser.rating}`);
          rating = authUser.rating;
          searchMethod = 'auth_user';
        }
      }
    }

    return {
      name: result.name,
      rating: rating,
      profileUrl: result.profileUrl,
      found: result.found,
      searchMethod: searchMethod,
    };
  }

  /**
   * Convert array of SearchResults to PlayerWithRating array
   */
  private convertSearchResultsToPlayers(
    results: SearchResult[]
  ): PlayerWithRating[] {
    return results.map((result) => this.convertSearchResultToPlayer(result));
  }

  /**
   * Get the underlying DUPRClient (for advanced use cases)
   */
  getClient(): DUPRClient {
    return this.client;
  }

  /**
   * Create a PlayerSearcher (for testing purposes)
   * This creates a new searcher instance with current overrides
   */
  async getSearcher(): Promise<PlayerSearcher> {
    return this.createSearcher();
  }
}
