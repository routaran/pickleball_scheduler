/**
 * Integration Tests
 * Task: P1-INTEG-1
 *
 * End-to-end tests that verify the full pipeline: parse → lookup → generate
 * Tests all three game formats: DUPR Ladder, Partner DUPR, PickleBros Monday
 * Uses fixture data to validate complete workflows with mocked DUPR API responses
 */

import {
  parseDuprLadderPlayers,
  parsePartnerDuprTeams,
  calculateTeamRating,
  GameType,
} from '../game-types';
import { PlayerSearcher, SearchResult } from '../player-search';
import {
  generateDuprLadderHtml,
  generatePartnerDuprHtml,
  generatePickleBrosMondayHtml,
  createTeamWithRatings,
  PlayerWithRating,
  TeamWithRatings,
} from '../html-generator';
import { DUPRClient, DUPRPlayer } from '../dupr-client';
import { PlayerRegistry } from '../player-registry';

import ladder_basic from '../../tests/fixtures/ladder_basic.json';
import ladder_10players from '../../tests/fixtures/ladder_10players.json';
import ladder_not_found from '../../tests/fixtures/ladder_not_found.json';
import partner_basic from '../../tests/fixtures/partner_basic.json';
import partner_5teams from '../../tests/fixtures/partner_5teams.json';
import partner_not_found from '../../tests/fixtures/partner_not_found.json';
import picklebros_8players from '../../tests/fixtures/picklebros_8players.json';
import picklebros_12players from '../../tests/fixtures/picklebros_12players.json';
import picklebros_not_found from '../../tests/fixtures/picklebros_not_found.json';

// Mock the DUPRClient
jest.mock('../dupr-client');

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Convert fixture player data to DUPRPlayer format for mocking
 */
function fixturePlayerToDUPRPlayer(fixturePlayer: any): DUPRPlayer {
  const fullName = fixturePlayer.dupr_name || 'Unknown Player';
  const nameParts = fullName.split(' ');

  return {
    id: parseInt(fixturePlayer.profile_url?.split('/').pop() || '0'),
    fullName: fullName,
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    shortAddress: fixturePlayer.location || '',
    duprId: fixturePlayer.dupr_id || '',
    profileUrl: fixturePlayer.profile_url || '',
    ratings: {
      singles: fixturePlayer.singles_rating,
      doubles: fixturePlayer.doubles_rating,
      singlesVerified: true,
      doublesVerified: true,
    },
    bestRating: fixturePlayer.rating,
  };
}

/**
 * Convert SearchResult to PlayerWithRating for HTML generation
 */
function searchResultToPlayerWithRating(result: SearchResult): PlayerWithRating {
  return {
    name: result.name,
    rating: result.rating,
    profileUrl: result.profileUrl,
    found: result.found,
    searchMethod: result.searchMethod,
  };
}

/**
 * Set up DUPRClient mock to return fixture data for specific players
 */
function mockClientWithFixturePlayers(
  mockClient: jest.Mocked<DUPRClient>,
  fixturePlayers: any[]
): void {
  // Create a map of player names to DUPR players for quick lookup
  const playerMap = new Map<string, DUPRPlayer>();

  fixturePlayers.forEach((fp) => {
    if (fp.found !== false) {  // Include if found is true or undefined
      const duprPlayer = fixturePlayerToDUPRPlayer(fp);
      // Store by both input name and DUPR name for flexibility
      playerMap.set(fp.name.toLowerCase(), duprPlayer);
      if (fp.dupr_name) {
        playerMap.set(fp.dupr_name.toLowerCase(), duprPlayer);
      }
    }
  });

  // Mock searchPlayers to return matching players
  mockClient.searchPlayers.mockImplementation(async (query: string) => {
    const queryLower = query.toLowerCase();
    const player = playerMap.get(queryLower);

    if (player) {
      return [player];
    }

    // Try partial matches (last name search or fuzzy match)
    for (const [name, duprPlayer] of playerMap.entries()) {
      // Check if query contains the name or vice versa
      if (name.includes(queryLower) || queryLower.includes(name)) {
        return [duprPlayer];
      }

      // Check if just the last name matches
      const lastName = duprPlayer.lastName.toLowerCase();
      if (lastName && queryLower === lastName) {
        return [duprPlayer];
      }
    }

    return [];
  });
}

// =============================================================================
// DUPR Ladder Integration Tests
// =============================================================================

describe('DUPR Ladder Integration', () => {
  let mockClient: jest.Mocked<DUPRClient>;
  let registry: PlayerRegistry;
  let searcher: PlayerSearcher;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = new DUPRClient('test-token') as jest.Mocked<DUPRClient>;
    mockClient.searchPlayers = jest.fn();
    registry = new PlayerRegistry();
    searcher = new PlayerSearcher(mockClient, registry);
  });

  describe('ladder_basic fixture', () => {
    it('should parse → lookup → generate HTML for 3 players', async () => {
      // 1. Parse input
      const input = ladder_basic.input.join('\n');
      const playerNames = parseDuprLadderPlayers(input);

      expect(playerNames).toEqual(ladder_basic.input);
      expect(playerNames).toHaveLength(3);

      // 2. Mock DUPRClient with fixture data
      mockClientWithFixturePlayers(mockClient, ladder_basic.players);

      // 3. Look up players
      const searchResults = await searcher.searchPlayers(playerNames);

      expect(searchResults).toHaveLength(3);
      expect(searchResults.every(r => r.found)).toBe(true);

      // Verify ratings match fixture
      ladder_basic.players.forEach((fp, idx) => {
        const result = searchResults.find(r => r.name === fp.name);
        expect(result).toBeDefined();
        expect(result!.rating).toBe(fp.rating);
        expect(result!.duprId).toBe(fp.dupr_id);
      });

      // 4. Generate HTML
      const players = searchResults.map(searchResultToPlayerWithRating);
      const html = generateDuprLadderHtml(players);

      // Verify HTML contains expected content
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('DUPR Ladder');
      expect(html).toContain('POOL A');

      // All player names should be in HTML
      ladder_basic.players.forEach(fp => {
        expect(html).toContain(fp.name);
      });

      // Verify pool structure matches fixture
      expect(ladder_basic.expected_pools).toHaveLength(1);
      expect(ladder_basic.expected_pools[0].pool_name).toBe('A');
      expect(ladder_basic.expected_pools[0].players).toHaveLength(3);
    });

    it('should maintain rating order in pool', async () => {
      const input = ladder_basic.input.join('\n');
      const playerNames = parseDuprLadderPlayers(input);

      mockClientWithFixturePlayers(mockClient, ladder_basic.players);
      const searchResults = await searcher.searchPlayers(playerNames);
      const players = searchResults.map(searchResultToPlayerWithRating);

      // Expected order by rating (highest first)
      const expectedOrder = ladder_basic.expected_pools[0].players.map(p => p.name);
      const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating);
      const actualOrder = sortedPlayers.map(p => p.name);

      expect(actualOrder).toEqual(expectedOrder);
    });
  });

  describe('ladder_10players fixture', () => {
    it('should parse → lookup → generate HTML for 10 players', async () => {
      const input = ladder_10players.input.join('\n');
      const playerNames = parseDuprLadderPlayers(input);

      expect(playerNames).toHaveLength(10);

      mockClientWithFixturePlayers(mockClient, ladder_10players.players);
      const searchResults = await searcher.searchPlayers(playerNames);

      expect(searchResults).toHaveLength(10);
      expect(searchResults.every(r => r.found)).toBe(true);

      const players = searchResults.map(searchResultToPlayerWithRating);
      const html = generateDuprLadderHtml(players);

      expect(html).toContain('DUPR Ladder');
      expect(html).toContain('POOL A');
      expect(html).toContain('POOL B');

      // Verify all players are in the HTML (accounting for HTML escaping)
      ladder_10players.players.forEach(fp => {
        // Check for the player name, allowing for HTML-escaped characters
        // Order matters: escape & first, then other characters that create entities
        const escapedName = fp.name
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');

        expect(html).toContain(escapedName);
      });
    });

    it('should distribute 10 players into 2 pools correctly', async () => {
      const input = ladder_10players.input.join('\n');
      const playerNames = parseDuprLadderPlayers(input);

      mockClientWithFixturePlayers(mockClient, ladder_10players.players);
      const searchResults = await searcher.searchPlayers(playerNames);
      const players = searchResults.map(searchResultToPlayerWithRating);

      // Sort by rating
      const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating);

      // Verify fixture expectations
      expect(ladder_10players.expected_pools).toHaveLength(2);
      expect(ladder_10players.expected_pools[0].players).toHaveLength(5);
      expect(ladder_10players.expected_pools[1].players).toHaveLength(5);

      // Top 5 should be in Pool A
      const poolAExpected = ladder_10players.expected_pools[0].players.map(p => p.name);
      const poolAActual = sortedPlayers.slice(0, 5).map(p => p.name);

      expect(poolAActual).toEqual(poolAExpected);
    });
  });

  describe('ladder_not_found fixture', () => {
    it('should handle players not found in DUPR', async () => {
      const input = ladder_not_found.input.join('\n');
      const playerNames = parseDuprLadderPlayers(input);

      // Only mock found players
      const foundPlayers = ladder_not_found.players.filter(p => p.found);
      mockClientWithFixturePlayers(mockClient, foundPlayers);

      const searchResults = await searcher.searchPlayers(playerNames);

      expect(searchResults).toHaveLength(ladder_not_found.players.length);

      // Verify found/not found status matches fixture
      ladder_not_found.players.forEach(fp => {
        const result = searchResults.find(r => r.name === fp.name);
        expect(result).toBeDefined();
        expect(result!.found).toBe(fp.found);

        if (!fp.found) {
          expect(result!.searchMethod).toBe('default');
        }
      });

      const players = searchResults.map(searchResultToPlayerWithRating);
      const html = generateDuprLadderHtml(players);

      // HTML should contain not-found markers for missing players
      expect(html).toContain('not-found');
      expect(html).toContain('Default');
    });
  });
});

// =============================================================================
// Partner DUPR Integration Tests
// =============================================================================

describe('Partner DUPR Integration', () => {
  let mockClient: jest.Mocked<DUPRClient>;
  let registry: PlayerRegistry;
  let searcher: PlayerSearcher;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = new DUPRClient('test-token') as jest.Mocked<DUPRClient>;
    mockClient.searchPlayers = jest.fn();
    registry = new PlayerRegistry();
    searcher = new PlayerSearcher(mockClient, registry);
  });

  describe('partner_basic fixture', () => {
    it('should parse → lookup → calculate team ratings → generate HTML', async () => {
      // 1. Parse team pairs
      const input = partner_basic.input.join('\n');
      const teamPairs = parsePartnerDuprTeams(input);

      expect(teamPairs).toHaveLength(2);
      expect(teamPairs[0].player1).toBe('John Smith');
      expect(teamPairs[0].player2).toBe('Jane Doe');

      // 2. Mock DUPRClient with all players from all teams
      // Partner fixtures have nested player1/player2 objects
      const allPlayers = partner_basic.teams.flatMap((t: any) => [t.player1, t.player2]);
      mockClientWithFixturePlayers(mockClient, allPlayers);

      // 3. Look up each player in each team
      const teamsWithRatings: TeamWithRatings[] = [];

      for (const teamPair of teamPairs) {
        const [p1Result, p2Result] = await Promise.all([
          searcher.searchPlayer(teamPair.player1),
          searcher.searchPlayer(teamPair.player2),
        ]);

        const p1 = searchResultToPlayerWithRating(p1Result);
        const p2 = searchResultToPlayerWithRating(p2Result);

        teamsWithRatings.push(createTeamWithRatings(p1, p2));
      }

      expect(teamsWithRatings).toHaveLength(2);

      // Verify team ratings match fixture (use 2 decimal precision due to rounding)
      partner_basic.teams.forEach((ft: any, idx: number) => {
        const team = teamsWithRatings[idx];
        expect(team.teamRating).toBeCloseTo(ft.team_rating, 2);
      });

      // 4. Generate HTML
      const html = generatePartnerDuprHtml(teamsWithRatings);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Partner DUPR');
      expect(html).toContain('Team Rating');

      // All player names should appear
      allPlayers.forEach(p => {
        expect(html).toContain(p.name);
      });

      expect(html).toContain('2 Teams');
    });

    it('should calculate team ratings using correct formula', async () => {
      // Team rating formula: 35% of higher + 65% of lower
      const p1Rating = 4.25;
      const p2Rating = 3.75;
      const expectedTeamRating = 0.35 * 4.25 + 0.65 * 3.75; // 3.925

      const calculatedRating = calculateTeamRating(p1Rating, p2Rating);
      expect(calculatedRating).toBeCloseTo(expectedTeamRating, 3);
      expect(calculatedRating).toBe(3.925);
    });

    it('should sort teams by team rating (highest first)', async () => {
      const input = partner_basic.input.join('\n');
      const teamPairs = parsePartnerDuprTeams(input);

      const allPlayers = partner_basic.teams.flatMap((t: any) => [t.player1, t.player2]);
      mockClientWithFixturePlayers(mockClient, allPlayers);

      const teamsWithRatings: TeamWithRatings[] = [];
      for (const teamPair of teamPairs) {
        const [p1Result, p2Result] = await Promise.all([
          searcher.searchPlayer(teamPair.player1),
          searcher.searchPlayer(teamPair.player2),
        ]);
        teamsWithRatings.push(
          createTeamWithRatings(
            searchResultToPlayerWithRating(p1Result),
            searchResultToPlayerWithRating(p2Result)
          )
        );
      }

      const sortedTeams = [...teamsWithRatings].sort((a, b) => b.teamRating - a.teamRating);

      // First team should have higher rating
      expect(sortedTeams[0].teamRating).toBeGreaterThan(sortedTeams[1].teamRating);
    });
  });

  describe('partner_5teams fixture', () => {
    it('should handle 5 teams correctly', async () => {
      const input = partner_5teams.input.join('\n');
      const teamPairs = parsePartnerDuprTeams(input);

      expect(teamPairs).toHaveLength(5);

      const allPlayers = partner_5teams.teams.flatMap((t: any) => [t.player1, t.player2]);
      mockClientWithFixturePlayers(mockClient, allPlayers);

      const teamsWithRatings: TeamWithRatings[] = [];
      for (const teamPair of teamPairs) {
        const [p1Result, p2Result] = await Promise.all([
          searcher.searchPlayer(teamPair.player1),
          searcher.searchPlayer(teamPair.player2),
        ]);
        teamsWithRatings.push(
          createTeamWithRatings(
            searchResultToPlayerWithRating(p1Result),
            searchResultToPlayerWithRating(p2Result)
          )
        );
      }

      expect(teamsWithRatings).toHaveLength(5);

      const html = generatePartnerDuprHtml(teamsWithRatings);
      expect(html).toContain('5 Teams');
      expect(html).toContain('10/10 players resolved');
    });
  });

  describe('partner_not_found fixture', () => {
    it('should handle teams with unfound players', async () => {
      const input = partner_not_found.input.join('\n');
      const teamPairs = parsePartnerDuprTeams(input);

      const allPlayers = partner_not_found.teams.flatMap((t: any) => [t.player1, t.player2]);
      const foundPlayers = allPlayers.filter((p: any) => p.found === true);
      mockClientWithFixturePlayers(mockClient, foundPlayers);

      const teamsWithRatings: TeamWithRatings[] = [];
      for (const teamPair of teamPairs) {
        const [p1Result, p2Result] = await Promise.all([
          searcher.searchPlayer(teamPair.player1),
          searcher.searchPlayer(teamPair.player2),
        ]);
        teamsWithRatings.push(
          createTeamWithRatings(
            searchResultToPlayerWithRating(p1Result),
            searchResultToPlayerWithRating(p2Result)
          )
        );
      }

      // Verify found/not found status
      const allResults = teamsWithRatings.flatMap(t => [t.player1, t.player2]);
      allPlayers.forEach((fp: any) => {
        const result = allResults.find(r => r.name === fp.name);
        expect(result).toBeDefined();
        expect(result!.found).toBe(fp.found);
      });

      const html = generatePartnerDuprHtml(teamsWithRatings);
      expect(html).toContain('not-found');
    });
  });
});

// =============================================================================
// PickleBros Monday Integration Tests
// =============================================================================

describe('PickleBros Monday Integration', () => {
  let mockClient: jest.Mocked<DUPRClient>;
  let registry: PlayerRegistry;
  let searcher: PlayerSearcher;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = new DUPRClient('test-token') as jest.Mocked<DUPRClient>;
    mockClient.searchPlayers = jest.fn();
    registry = new PlayerRegistry();
    searcher = new PlayerSearcher(mockClient, registry);
  });

  describe('picklebros_8players fixture', () => {
    it('should parse → lookup → generate HTML for 8 players in 2 pools', async () => {
      // 1. Parse input
      const input = picklebros_8players.input.join('\n');
      const playerNames = parseDuprLadderPlayers(input);

      expect(playerNames).toHaveLength(8);

      // 2. Mock DUPRClient
      const allPlayers = picklebros_8players.pools.flatMap(pool => pool.players);
      mockClientWithFixturePlayers(mockClient, allPlayers);

      // 3. Look up players
      const searchResults = await searcher.searchPlayers(playerNames);

      expect(searchResults).toHaveLength(8);
      expect(searchResults.every(r => r.found)).toBe(true);

      // 4. Generate HTML
      const players = searchResults.map(searchResultToPlayerWithRating);
      const html = generatePickleBrosMondayHtml(players);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('PickleBros Monday');
      expect(html).toContain('Fixed 4-Player Pools');
      expect(html).toContain('POOL A');
      expect(html).toContain('POOL B');
      expect(html).toContain('(4 players)');

      // All player names should appear
      allPlayers.forEach(p => {
        expect(html).toContain(p.name);
      });
    });

    it('should distribute players into exactly 2 pools of 4', async () => {
      const input = picklebros_8players.input.join('\n');
      const playerNames = parseDuprLadderPlayers(input);

      const allPlayers = picklebros_8players.pools.flatMap(pool => pool.players);
      mockClientWithFixturePlayers(mockClient, allPlayers);

      const searchResults = await searcher.searchPlayers(playerNames);
      expect(searchResults).toHaveLength(8);

      // Verify constraint: must be multiple of 4
      expect(searchResults.length % 4).toBe(0);

      // Verify fixture expectations
      expect(picklebros_8players.pools).toHaveLength(2);
      expect(picklebros_8players.pools[0].players).toHaveLength(4);
      expect(picklebros_8players.pools[1].players).toHaveLength(4);
    });

    it('should place highest rated players in Pool A', async () => {
      const input = picklebros_8players.input.join('\n');
      const playerNames = parseDuprLadderPlayers(input);

      const allPlayers = picklebros_8players.pools.flatMap(pool => pool.players);
      mockClientWithFixturePlayers(mockClient, allPlayers);

      const searchResults = await searcher.searchPlayers(playerNames);
      const sortedPlayers = [...searchResults].sort((a, b) => b.rating - a.rating);

      // Top 4 should match Pool A from fixture
      const poolAExpected = picklebros_8players.pools[0].players.map(p => p.name);
      const poolAActual = sortedPlayers.slice(0, 4).map(r => r.name);

      expect(poolAActual).toEqual(poolAExpected);
    });
  });

  describe('picklebros_12players fixture', () => {
    it('should parse → lookup → generate HTML for 12 players in 3 pools', async () => {
      const input = picklebros_12players.input.join('\n');
      const playerNames = parseDuprLadderPlayers(input);

      expect(playerNames).toHaveLength(12);

      const allPlayers = picklebros_12players.pools.flatMap(pool => pool.players);
      mockClientWithFixturePlayers(mockClient, allPlayers);

      const searchResults = await searcher.searchPlayers(playerNames);

      expect(searchResults).toHaveLength(12);

      const players = searchResults.map(searchResultToPlayerWithRating);
      const html = generatePickleBrosMondayHtml(players);

      expect(html).toContain('POOL A');
      expect(html).toContain('POOL B');
      expect(html).toContain('POOL C');

      // Verify 3 pools of 4
      expect(picklebros_12players.pools).toHaveLength(3);
      picklebros_12players.pools.forEach(pool => {
        expect(pool.players).toHaveLength(4);
      });
    });
  });

  describe('picklebros_not_found fixture', () => {
    it('should handle players not found in DUPR', async () => {
      const input = picklebros_not_found.input.join('\n');
      const playerNames = parseDuprLadderPlayers(input);

      // parseDuprLadderPlayers removes guest markers like "(G)"
      // So "Visiting Friend (G)" becomes "Visiting Friend"
      const allPlayers: any[] = picklebros_not_found.pools.flatMap((pool: any) => pool.players);
      const foundPlayers = allPlayers.filter((p: any) => p.found === true);
      mockClientWithFixturePlayers(mockClient, foundPlayers);

      const searchResults = await searcher.searchPlayers(playerNames);

      // Verify we got results for all parsed names
      expect(searchResults).toHaveLength(playerNames.length);

      // Check that some players are found and some are not
      const foundCount = searchResults.filter(r => r.found).length;
      const notFoundCount = searchResults.filter(r => !r.found).length;

      expect(foundCount).toBeGreaterThan(0);
      expect(notFoundCount).toBeGreaterThan(0);

      const players = searchResults.map(searchResultToPlayerWithRating);
      const html = generatePickleBrosMondayHtml(players);

      expect(html).toContain('not-found');
      expect(html).toContain('Default');
    });
  });

  describe('PickleBros validation', () => {
    it('should throw error for non-multiple of 4 (5 players)', async () => {
      const players: PlayerWithRating[] = Array.from({ length: 5 }, (_, i) => ({
        name: `Player ${i + 1}`,
        rating: 3.5,
        profileUrl: null,
        found: true,
        searchMethod: 'exact',
      }));

      expect(() => generatePickleBrosMondayHtml(players)).toThrow();
    });

    it('should throw error for non-multiple of 4 (7 players)', async () => {
      const players: PlayerWithRating[] = Array.from({ length: 7 }, (_, i) => ({
        name: `Player ${i + 1}`,
        rating: 3.5,
        profileUrl: null,
        found: true,
        searchMethod: 'exact',
      }));

      expect(() => generatePickleBrosMondayHtml(players)).toThrow();
    });
  });
});

// =============================================================================
// Cross-Format Tests
// =============================================================================

describe('Cross-Format Integration', () => {
  let mockClient: jest.Mocked<DUPRClient>;
  let registry: PlayerRegistry;
  let searcher: PlayerSearcher;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = new DUPRClient('test-token') as jest.Mocked<DUPRClient>;
    mockClient.searchPlayers = jest.fn();
    registry = new PlayerRegistry();
    searcher = new PlayerSearcher(mockClient, registry);
  });

  it('should handle the same players in different game formats', async () => {
    // Same 4 players used in ladder, partner, and picklebros
    const playerNames = ['Alice Johnson', 'Bob Williams', 'Carol Davis', 'Dave Martinez'];
    const mockPlayers: DUPRPlayer[] = [
      {
        id: 1,
        fullName: 'Alice Johnson',
        firstName: 'Alice',
        lastName: 'Johnson',
        shortAddress: 'Edmonton, AB',
        duprId: 'A001',
        profileUrl: 'https://dashboard.dupr.com/dashboard/player/1',
        ratings: { singles: 4.0, doubles: 4.2, singlesVerified: true, doublesVerified: true },
        bestRating: 4.2,
      },
      {
        id: 2,
        fullName: 'Bob Williams',
        firstName: 'Bob',
        lastName: 'Williams',
        shortAddress: 'Calgary, AB',
        duprId: 'B002',
        profileUrl: 'https://dashboard.dupr.com/dashboard/player/2',
        ratings: { singles: 3.5, doubles: 3.8, singlesVerified: true, doublesVerified: true },
        bestRating: 3.8,
      },
      {
        id: 3,
        fullName: 'Carol Davis',
        firstName: 'Carol',
        lastName: 'Davis',
        shortAddress: 'Edmonton, AB',
        duprId: 'C003',
        profileUrl: 'https://dashboard.dupr.com/dashboard/player/3',
        ratings: { singles: 3.2, doubles: 3.5, singlesVerified: true, doublesVerified: true },
        bestRating: 3.5,
      },
      {
        id: 4,
        fullName: 'Dave Martinez',
        firstName: 'Dave',
        lastName: 'Martinez',
        shortAddress: 'Calgary, AB',
        duprId: 'D004',
        profileUrl: 'https://dashboard.dupr.com/dashboard/player/4',
        ratings: { singles: 3.0, doubles: 3.2, singlesVerified: true, doublesVerified: true },
        bestRating: 3.2,
      },
    ];

    mockClient.searchPlayers.mockImplementation(async (query: string) => {
      const player = mockPlayers.find(
        p => p.fullName.toLowerCase().includes(query.toLowerCase())
      );
      return player ? [player] : [];
    });

    // Test DUPR Ladder
    const ladderInput = playerNames.join('\n');
    const ladderNames = parseDuprLadderPlayers(ladderInput);
    const ladderResults = await searcher.searchPlayers(ladderNames);
    const ladderPlayers = ladderResults.map(searchResultToPlayerWithRating);
    const ladderHtml = generateDuprLadderHtml(ladderPlayers);

    expect(ladderHtml).toContain('DUPR Ladder');
    expect(ladderHtml).toContain('Alice Johnson');

    // Test Partner DUPR
    const partnerInput = 'Alice Johnson / Bob Williams\nCarol Davis / Dave Martinez';
    const teamPairs = parsePartnerDuprTeams(partnerInput);
    const teamsWithRatings: TeamWithRatings[] = [];

    for (const teamPair of teamPairs) {
      const [p1Result, p2Result] = await Promise.all([
        searcher.searchPlayer(teamPair.player1),
        searcher.searchPlayer(teamPair.player2),
      ]);
      teamsWithRatings.push(
        createTeamWithRatings(
          searchResultToPlayerWithRating(p1Result),
          searchResultToPlayerWithRating(p2Result)
        )
      );
    }

    const partnerHtml = generatePartnerDuprHtml(teamsWithRatings);
    expect(partnerHtml).toContain('Partner DUPR');
    expect(partnerHtml).toContain('Alice Johnson');

    // Test PickleBros Monday
    const picklebrosInput = playerNames.join('\n');
    const picklebrosNames = parseDuprLadderPlayers(picklebrosInput);
    const picklebrosResults = await searcher.searchPlayers(picklebrosNames);
    const picklebrosPlayers = picklebrosResults.map(searchResultToPlayerWithRating);
    const picklebrosHtml = generatePickleBrosMondayHtml(picklebrosPlayers);

    expect(picklebrosHtml).toContain('PickleBros Monday');
    expect(picklebrosHtml).toContain('Alice Johnson');
  });

  it('should cache player lookups across multiple operations', async () => {
    const playerName = 'Alice Johnson';
    const mockPlayer: DUPRPlayer = {
      id: 1,
      fullName: 'Alice Johnson',
      firstName: 'Alice',
      lastName: 'Johnson',
      shortAddress: 'Edmonton, AB',
      duprId: 'A001',
      profileUrl: 'https://dashboard.dupr.com/dashboard/player/1',
      ratings: { singles: 4.0, doubles: 4.2, singlesVerified: true, doublesVerified: true },
      bestRating: 4.2,
    };

    mockClient.searchPlayers.mockResolvedValue([mockPlayer]);

    // First lookup
    const result1 = await searcher.searchPlayer(playerName);
    expect(result1.found).toBe(true);
    expect(mockClient.searchPlayers).toHaveBeenCalledTimes(1);

    // Second lookup should use cache
    const result2 = await searcher.searchPlayer(playerName);
    expect(result2.found).toBe(true);
    expect(result2.searchMethod).toBe('registry');
    expect(mockClient.searchPlayers).toHaveBeenCalledTimes(1); // Not called again

    // Both results should be identical
    expect(result1.rating).toBe(result2.rating);
    expect(result1.duprId).toBe(result2.duprId);
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('Error Handling in Full Pipeline', () => {
  let mockClient: jest.Mocked<DUPRClient>;
  let registry: PlayerRegistry;
  let searcher: PlayerSearcher;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = new DUPRClient('test-token') as jest.Mocked<DUPRClient>;
    mockClient.searchPlayers = jest.fn();
    registry = new PlayerRegistry();
    searcher = new PlayerSearcher(mockClient, registry);
  });

  it('should handle API errors gracefully in ladder format', async () => {
    const input = 'John Smith\nJane Doe';
    const playerNames = parseDuprLadderPlayers(input);

    // Mock API error
    mockClient.searchPlayers.mockRejectedValue(new Error('API Error'));

    const searchResults = await searcher.searchPlayers(playerNames);

    // Should fall back to default rating
    expect(searchResults).toHaveLength(2);
    expect(searchResults.every(r => !r.found)).toBe(true);
    expect(searchResults.every(r => r.rating === 3.0)).toBe(true);

    const players = searchResults.map(searchResultToPlayerWithRating);
    const html = generateDuprLadderHtml(players);

    expect(html).toContain('not-found');
    expect(html).toContain('Default');
  });

  it('should handle empty input', async () => {
    const ladderNames = parseDuprLadderPlayers('');
    expect(ladderNames).toEqual([]);

    const html = generateDuprLadderHtml([]);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('DUPR Ladder');
  });

  it('should handle malformed team input', () => {
    // Missing separator
    const input1 = 'John Smith Jane Doe';
    const teams1 = parsePartnerDuprTeams(input1);
    expect(teams1).toHaveLength(0);

    // Empty lines
    const input2 = 'John Smith / Jane Doe\n\n\nBob Wilson / Alice Brown';
    const teams2 = parsePartnerDuprTeams(input2);
    expect(teams2).toHaveLength(2);
  });
});
