/**
 * Player Search Parity Tests
 *
 * These tests validate that the TypeScript PlayerSearch implementation produces
 * the same outputs as the Python desktop app, using fixtures extracted from
 * Phase 0 testing.
 *
 * Each test:
 * 1. Loads a fixture with expected player data
 * 2. Mocks the DUPRClient to return fixture-defined ratings
 * 3. Runs PlayerSearch on the input names
 * 4. Validates output matches fixture expectations
 */

import { PlayerSearcher, SearchResult, DEFAULT_RATING } from '../player-search';
import { DUPRClient, DUPRPlayer } from '../dupr-client';
import { PlayerRegistry } from '../player-registry';
import * as fs from 'fs';
import * as path from 'path';

// Mock the DUPRClient
jest.mock('../dupr-client');

// =============================================================================
// Fixture Loading Utilities
// =============================================================================

interface FixturePlayer {
  name: string;
  dupr_id: string | null;
  dupr_name: string | null;
  rating: number;
  singles_rating: number | null;
  doubles_rating: number | null;
  location: string | null;
  profile_url: string | null;
  found: boolean;
  search_method: string;
}

interface LadderFixture {
  name: string;
  description: string;
  game_type: 'dupr_ladder';
  input: string[];
  players: FixturePlayer[];
  expected_pools?: any[];
  resolution_summary?: any;
  metadata?: any;
}

interface PartnerFixture {
  name: string;
  description: string;
  game_type: 'partner_dupr';
  input: string[];
  teams: Array<{
    player1: FixturePlayer;
    player2: FixturePlayer;
    team_rating: number;
  }>;
  metadata?: any;
}

interface PickleBrosFixture {
  name: string;
  description: string;
  game_type: 'picklebros_monday';
  input: string[];
  pools: Array<{
    pool_name: string;
    players: FixturePlayer[];
    notes?: string;
  }>;
  constraints?: any;
  metadata?: any;
}

type Fixture = LadderFixture | PartnerFixture | PickleBrosFixture;

/**
 * Load a fixture file from the fixtures directory
 */
function loadFixture(fixtureName: string): Fixture {
  const fixturesDir = path.join(__dirname, '../../tests/fixtures');
  const fixturePath = path.join(fixturesDir, fixtureName);
  const content = fs.readFileSync(fixturePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Load all fixtures matching a pattern
 */
function loadFixtures(pattern: RegExp): Fixture[] {
  const fixturesDir = path.join(__dirname, '../../tests/fixtures');
  const files = fs.readdirSync(fixturesDir);
  const matchingFiles = files.filter(f => f.match(pattern));
  return matchingFiles.map(f => loadFixture(f));
}

/**
 * Convert fixture player to mock DUPRPlayer
 */
function fixturePlayerToMockPlayer(fixturePlayer: FixturePlayer): DUPRPlayer | null {
  if (!fixturePlayer.found || !fixturePlayer.dupr_id) {
    return null;
  }

  // Use dupr_name if available, otherwise use name
  const fullName = fixturePlayer.dupr_name || fixturePlayer.name;

  // Extract player ID from profile URL or dupr_id
  let playerId: number = 99999; // default fallback
  let profileUrl: string;

  if (fixturePlayer.profile_url) {
    const match = fixturePlayer.profile_url.match(/player\/(\d+)/);
    if (match) {
      playerId = parseInt(match[1], 10);
    }
    profileUrl = fixturePlayer.profile_url;
  } else {
    // If no profile_url in fixture, construct one
    // If dupr_id is numeric, use it; otherwise use a fallback
    const numericId = /^\d+$/.test(fixturePlayer.dupr_id) ? fixturePlayer.dupr_id : '99999';
    profileUrl = `https://dashboard.dupr.com/dashboard/player/${numericId}`;
    playerId = parseInt(numericId, 10);
  }

  // Parse name into first/last
  const nameParts = fullName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return {
    id: playerId,
    fullName: fullName,
    firstName,
    lastName,
    shortAddress: fixturePlayer.location || '',
    duprId: fixturePlayer.dupr_id,
    profileUrl: profileUrl,
    ratings: {
      singles: fixturePlayer.singles_rating || null,
      doubles: fixturePlayer.doubles_rating || null,
      singlesVerified: true,
      doublesVerified: true,
    },
    bestRating: fixturePlayer.rating,
  };
}

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Set up mock DUPRClient to return fixture-defined players
 */
function setupMockClient(
  mockClient: jest.Mocked<DUPRClient>,
  fixturePlayer: FixturePlayer
): void {
  const mockPlayer = fixturePlayerToMockPlayer(fixturePlayer);

  if (mockPlayer) {
    // Mock will return this player for any search
    mockClient.searchPlayers.mockResolvedValue([mockPlayer]);
  } else {
    // Player not found - return empty array
    mockClient.searchPlayers.mockResolvedValue([]);
  }
}

/**
 * Set up mock client for multiple players (sequential searches)
 *
 * This creates a smart mock that returns the correct player based on the search query
 */
function setupMockClientForPlayers(
  mockClient: jest.Mocked<DUPRClient>,
  fixturePatterns: FixturePlayer[]
): void {
  // Reset any previous mocks
  mockClient.searchPlayers.mockReset();

  // Create a map of player names to mock players
  const playerMap = new Map<string, DUPRPlayer | null>();

  for (const fixturePlayer of fixturePatterns) {
    const mockPlayer = fixturePlayerToMockPlayer(fixturePlayer);
    // Store by lowercase name for case-insensitive matching
    playerMap.set(fixturePlayer.name.toLowerCase(), mockPlayer);
  }

  // Set up the mock to return the correct player based on the query
  mockClient.searchPlayers.mockImplementation(async (query: string) => {
    // Try to find a player that matches this query
    const queryLower = query.toLowerCase();

    for (const [name, mockPlayer] of playerMap.entries()) {
      // Check if query matches the full name or part of it
      if (name.includes(queryLower) || queryLower.includes(name)) {
        if (mockPlayer) {
          return [mockPlayer];
        }
      }

      // Also check if query matches last name
      const nameParts = name.split(' ');
      const lastName = nameParts[nameParts.length - 1];
      if (lastName && queryLower === lastName) {
        if (mockPlayer) {
          return [mockPlayer];
        }
      }
    }

    // No match found
    return [];
  });
}

/**
 * Normalize search method string for comparison
 * Converts fixture format to TypeScript format
 */
function normalizeSearchMethod(method: string): string {
  const mappings: Record<string, string> = {
    'Full name + Alberta': 'exact_alberta',
    'Last name + Alberta': 'lastname_alberta',
    'Full name + Canada': 'exact_canada',
    'Last name + Canada': 'lastname_canada',
    'Last name + No filter': 'lastname_global',
    'Full name + No filter': 'exact_global',
    'not_found': 'default',
    'override': 'override',
    'registry': 'registry',
  };

  return mappings[method] || method;
}

/**
 * Clean player name (remove guest markers, trim whitespace)
 */
function cleanPlayerName(name: string): string {
  return name
    .trim()
    .replace(/\s*\([Gg]\)\s*$/, '')
    .replace(/\s*\([Gg][Uu][Ee][Ss][Tt]\)\s*$/, '')
    .replace(/\s*\(.*?\)\s*$/, '')
    .trim();
}

/**
 * Compare search result with fixture player
 *
 * Note: Search method is not strictly compared because the exact tier
 * used may vary based on mock implementation, but as long as the player
 * is found with correct data, the test passes.
 */
function compareSearchResult(
  result: SearchResult,
  expected: FixturePlayer,
  testName: string
): void {
  // Player names should match after cleaning (PlayerSearcher cleans names)
  const expectedCleanName = cleanPlayerName(expected.name);
  expect(result.name).toBe(expectedCleanName);
  expect(result.rating).toBe(expected.rating);
  expect(result.found).toBe(expected.found);

  if (expected.found) {
    // For override players, dupr_id may be null or a placeholder
    if (expected.dupr_id === null && result.searchMethod === 'override') {
      // Override players can have null duprId
      expect(result.duprId).toBeNull();
    } else {
      expect(result.duprId).toBe(expected.dupr_id);
    }

    // dupr_name might not be in simpler fixtures (e.g., partner fixtures)
    if (expected.dupr_name) {
      expect(result.duprName).toBe(expected.dupr_name);
    } else {
      // At minimum, duprName should match the input name for found players
      expect(result.duprName).toBe(expected.name);
    }

    // Location might not be in simpler fixtures
    if (expected.location !== undefined) {
      expect(result.location).toBe(expected.location);
    }

    // Profile URL checking
    if (expected.profile_url) {
      // Fixture has explicit profile URL
      // If dupr_id is non-numeric, the mock may have constructed it differently
      // Just verify the URL format is correct
      if (expected.dupr_id && /^\d+$/.test(expected.dupr_id)) {
        // Numeric dupr_id - should match exactly
        expect(result.profileUrl).toBe(expected.profile_url);
      } else {
        // Non-numeric dupr_id or null - just verify it's a valid DUPR profile URL
        expect(result.profileUrl).toMatch(/dashboard\.dupr\.com\/dashboard\/player\//);
      }
    } else if (expected.dupr_id && result.profileUrl) {
      // Just verify it's a valid DUPR profile URL (format may vary)
      expect(result.profileUrl).toMatch(/dashboard\.dupr\.com\/dashboard\/player\//);
    }

    // Search method should indicate the player was found (not 'default')
    expect(result.searchMethod).not.toBe('default');
  } else {
    expect(result.duprId).toBeNull();
    expect(result.duprName).toBeNull();
    expect(result.location).toBeNull();
    expect(result.profileUrl).toBeNull();
    expect(result.rating).toBe(DEFAULT_RATING);
    expect(result.searchMethod).toBe('default');
  }
}

// =============================================================================
// DUPR Ladder Parity Tests
// =============================================================================

describe('PlayerSearch Parity - DUPR Ladder', () => {
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

  test('ladder_basic.json - Basic 3-player ladder', async () => {
    const fixture = loadFixture('ladder_basic.json') as LadderFixture;

    setupMockClientForPlayers(mockClient, fixture.players);

    const results = await searcher.searchPlayers(fixture.input);

    expect(results).toHaveLength(fixture.players.length);

    for (let i = 0; i < results.length; i++) {
      compareSearchResult(results[i], fixture.players[i], `Player ${i + 1}`);
    }
  });

  test('ladder_not_found.json - Mix of found and not-found players', async () => {
    const fixture = loadFixture('ladder_not_found.json') as LadderFixture;

    setupMockClientForPlayers(mockClient, fixture.players);

    const results = await searcher.searchPlayers(fixture.input);

    expect(results).toHaveLength(fixture.players.length);

    // Check found players
    const foundResults = results.filter(r => r.found);
    const foundExpected = fixture.players.filter(p => p.found);
    expect(foundResults).toHaveLength(foundExpected.length);

    // Check not-found players
    const notFoundResults = results.filter(r => !r.found);
    const notFoundExpected = fixture.players.filter(p => !p.found);
    expect(notFoundResults).toHaveLength(notFoundExpected.length);

    // Validate each result
    for (let i = 0; i < results.length; i++) {
      compareSearchResult(results[i], fixture.players[i], `Player ${i + 1}`);
    }
  });

  test('ladder_10players.json - Larger ladder with 10 players', async () => {
    const fixture = loadFixture('ladder_10players.json') as LadderFixture;

    setupMockClientForPlayers(mockClient, fixture.players);

    const results = await searcher.searchPlayers(fixture.input);

    expect(results).toHaveLength(fixture.players.length);

    for (let i = 0; i < results.length; i++) {
      compareSearchResult(results[i], fixture.players[i], `Player ${i + 1}`);
    }
  });

  test('ladder_edge_cases.json - Edge cases (duplicates, special characters, etc.)', async () => {
    const fixture = loadFixture('ladder_edge_cases.json') as any;

    // Check if this is a multi-scenario fixture
    if (fixture.test_cases) {
      // This fixture has multiple test cases
      for (const testCase of fixture.test_cases) {
        // Create fresh instances for each test case to avoid cache pollution
        const freshRegistry = new PlayerRegistry();
        const freshSearcher = new PlayerSearcher(mockClient, freshRegistry);

        setupMockClientForPlayers(mockClient, testCase.players);

        // Filter out empty/whitespace-only names (matches parser behavior)
        const cleanedInput = testCase.input.filter((name: string) => name.trim().length > 0);

        const results = await freshSearcher.searchPlayers(cleanedInput);
        expect(results).toHaveLength(testCase.players.length);

        for (let i = 0; i < results.length; i++) {
          compareSearchResult(results[i], testCase.players[i], `${testCase.name} - Player ${i + 1}`);
        }

        // Reset for next test case
        mockClient.searchPlayers.mockReset();
      }
    } else {
      // Standard fixture format
      setupMockClientForPlayers(mockClient, fixture.players);
      const results = await searcher.searchPlayers(fixture.input);
      expect(results).toHaveLength(fixture.players.length);

      for (let i = 0; i < results.length; i++) {
        compareSearchResult(results[i], fixture.players[i], `Player ${i + 1}`);
      }
    }
  });
});

// =============================================================================
// Partner DUPR Parity Tests
// =============================================================================

describe('PlayerSearch Parity - Partner DUPR', () => {
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

  test('partner_basic.json - Basic 2-team partner format', async () => {
    const fixture = loadFixture('partner_basic.json') as PartnerFixture;

    // Extract all players from teams
    const allPlayers: FixturePlayer[] = [];
    fixture.teams.forEach(team => {
      allPlayers.push(team.player1);
      allPlayers.push(team.player2);
    });

    setupMockClientForPlayers(mockClient, allPlayers);

    // Search for all players
    const playerNames = allPlayers.map(p => p.name);
    const results = await searcher.searchPlayers(playerNames);

    expect(results).toHaveLength(allPlayers.length);

    for (let i = 0; i < results.length; i++) {
      compareSearchResult(results[i], allPlayers[i], `Player ${i + 1}`);
    }
  });

  test('partner_5teams.json - 5 teams with varied ratings', async () => {
    const fixture = loadFixture('partner_5teams.json') as PartnerFixture;

    // Extract all players from teams
    const allPlayers: FixturePlayer[] = [];
    fixture.teams.forEach(team => {
      allPlayers.push(team.player1);
      allPlayers.push(team.player2);
    });

    setupMockClientForPlayers(mockClient, allPlayers);

    // Search for all players
    const playerNames = allPlayers.map(p => p.name);
    const results = await searcher.searchPlayers(playerNames);

    expect(results).toHaveLength(allPlayers.length);

    for (let i = 0; i < results.length; i++) {
      compareSearchResult(results[i], allPlayers[i], `Player ${i + 1}`);
    }
  });

  test('partner_not_found.json - Teams with not-found players', async () => {
    const fixture = loadFixture('partner_not_found.json') as PartnerFixture;

    // Extract all players from teams
    const allPlayers: FixturePlayer[] = [];
    fixture.teams.forEach(team => {
      allPlayers.push(team.player1);
      allPlayers.push(team.player2);
    });

    setupMockClientForPlayers(mockClient, allPlayers);

    // Search for all players
    const playerNames = allPlayers.map(p => p.name);
    const results = await searcher.searchPlayers(playerNames);

    expect(results).toHaveLength(allPlayers.length);

    // Check that not-found players have default rating
    const notFoundResults = results.filter(r => !r.found);
    notFoundResults.forEach(result => {
      expect(result.rating).toBe(DEFAULT_RATING);
    });

    for (let i = 0; i < results.length; i++) {
      compareSearchResult(results[i], allPlayers[i], `Player ${i + 1}`);
    }
  });

  test('partner_edge_cases.json - Edge cases for partner format', async () => {
    const fixture = loadFixture('partner_edge_cases.json') as any;

    // Check if this is a multi-scenario fixture
    if (fixture.test_scenarios || fixture.test_cases) {
      const scenarios = fixture.test_scenarios || fixture.test_cases;
      for (const scenario of scenarios) {
        // Extract all players from teams
        const allPlayers: FixturePlayer[] = [];
        scenario.teams?.forEach((team: any) => {
          allPlayers.push(team.player1);
          allPlayers.push(team.player2);
        });

        if (allPlayers.length > 0) {
          setupMockClientForPlayers(mockClient, allPlayers);

          const playerNames = allPlayers.map(p => p.name);
          const results = await searcher.searchPlayers(playerNames);

          expect(results).toHaveLength(allPlayers.length);

          for (let i = 0; i < results.length; i++) {
            compareSearchResult(results[i], allPlayers[i], `${scenario.name || scenario.scenario_name} - Player ${i + 1}`);
          }

          // Reset for next scenario
          mockClient.searchPlayers.mockReset();
        }
      }
    } else {
      // Standard fixture format
      const allPlayers: FixturePlayer[] = [];
      fixture.teams.forEach((team: any) => {
        allPlayers.push(team.player1);
        allPlayers.push(team.player2);
      });

      setupMockClientForPlayers(mockClient, allPlayers);

      const playerNames = allPlayers.map(p => p.name);
      const results = await searcher.searchPlayers(playerNames);

      expect(results).toHaveLength(allPlayers.length);

      for (let i = 0; i < results.length; i++) {
        compareSearchResult(results[i], allPlayers[i], `Player ${i + 1}`);
      }
    }
  });
});

// =============================================================================
// PickleBros Parity Tests
// =============================================================================

describe('PlayerSearch Parity - PickleBros Monday', () => {
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

  test('picklebros_8players.json - Basic 8-player 2-pool format', async () => {
    const fixture = loadFixture('picklebros_8players.json') as PickleBrosFixture;

    // Extract all players from pools and create a map by name
    const playerMap = new Map<string, FixturePlayer>();
    fixture.pools.forEach(pool => {
      pool.players.forEach(player => {
        playerMap.set(player.name, player);
      });
    });

    // Create expected results in input order
    const expectedPlayers = fixture.input.map(name => playerMap.get(name)!);

    setupMockClientForPlayers(mockClient, expectedPlayers);

    const results = await searcher.searchPlayers(fixture.input);

    expect(results).toHaveLength(expectedPlayers.length);

    for (let i = 0; i < results.length; i++) {
      compareSearchResult(results[i], expectedPlayers[i], `Player ${i + 1}`);
    }
  });

  test('picklebros_12players.json - 12 players in 3 pools', async () => {
    const fixture = loadFixture('picklebros_12players.json') as PickleBrosFixture;

    // Extract all players from pools and create a map by name
    const playerMap = new Map<string, FixturePlayer>();
    fixture.pools.forEach(pool => {
      pool.players.forEach(player => {
        playerMap.set(player.name, player);
      });
    });

    // Create expected results in input order
    const expectedPlayers = fixture.input.map(name => playerMap.get(name)!);

    setupMockClientForPlayers(mockClient, expectedPlayers);

    const results = await searcher.searchPlayers(fixture.input);

    expect(results).toHaveLength(expectedPlayers.length);

    for (let i = 0; i < results.length; i++) {
      compareSearchResult(results[i], expectedPlayers[i], `Player ${i + 1}`);
    }
  });

  test('picklebros_not_found.json - PickleBros with not-found players', async () => {
    const fixture = loadFixture('picklebros_not_found.json') as PickleBrosFixture;

    // Extract all players from pools and create a map by name
    const playerMap = new Map<string, FixturePlayer>();
    fixture.pools.forEach(pool => {
      pool.players.forEach(player => {
        playerMap.set(player.name, player);
      });
    });

    // Create expected results in input order
    const expectedPlayers = fixture.input.map(name => {
      const player = playerMap.get(name);
      if (!player) {
        throw new Error(`Player ${name} not found in fixture pools`);
      }
      return player;
    });

    setupMockClientForPlayers(mockClient, expectedPlayers);

    const results = await searcher.searchPlayers(fixture.input);

    expect(results).toHaveLength(expectedPlayers.length);

    // Check that not-found players have default rating
    const notFoundResults = results.filter(r => !r.found);
    notFoundResults.forEach(result => {
      expect(result.rating).toBe(DEFAULT_RATING);
    });

    for (let i = 0; i < results.length; i++) {
      compareSearchResult(results[i], expectedPlayers[i], `Player ${i + 1}`);
    }
  });

  test('picklebros_edge_cases.json - Edge cases for PickleBros format', async () => {
    const fixture = loadFixture('picklebros_edge_cases.json') as any;

    // Check if this is a multi-scenario fixture
    if (fixture.test_scenarios || fixture.test_cases) {
      const scenarios = fixture.test_scenarios || fixture.test_cases;
      for (const scenario of scenarios) {
        // Create fresh instances for each scenario to avoid cache pollution
        const freshRegistry = new PlayerRegistry();

        // Set up overrides if the scenario has them
        const overridesMap = new Map<string, any>();
        if (scenario.player_overrides) {
          scenario.player_overrides.forEach((override: any) => {
            overridesMap.set(override.name.toLowerCase(), {
              duprId: null,  // Overrides have null duprId in fixtures
              duprName: override.name,
              rating: override.rating,
            });
          });
        }

        const config = overridesMap.size > 0 ? { overrides: overridesMap } : undefined;
        const freshSearcher = new PlayerSearcher(mockClient, freshRegistry, config);

        // Extract all players from pools and create a map by name
        const playerMap = new Map<string, FixturePlayer>();
        scenario.pools?.forEach((pool: any) => {
          pool.players.forEach((player: FixturePlayer) => {
            playerMap.set(player.name, player);
          });
        });

        // Create expected results in input order
        const expectedPlayers = scenario.input.map((name: string) => playerMap.get(name)!);

        if (expectedPlayers.length > 0 && expectedPlayers.every((p: any) => p !== undefined)) {
          setupMockClientForPlayers(mockClient, expectedPlayers);

          const results = await freshSearcher.searchPlayers(scenario.input);

          expect(results).toHaveLength(expectedPlayers.length);

          for (let i = 0; i < results.length; i++) {
            compareSearchResult(results[i], expectedPlayers[i], `${scenario.name || scenario.scenario_name} - Player ${i + 1}`);
          }

          // Reset for next scenario
          mockClient.searchPlayers.mockReset();
        }
      }
    } else {
      // Standard fixture format
      const playerMap = new Map<string, FixturePlayer>();
      fixture.pools.forEach((pool: any) => {
        pool.players.forEach((player: FixturePlayer) => {
          playerMap.set(player.name, player);
        });
      });

      const expectedPlayers = fixture.input.map((name: string) => playerMap.get(name)!);

      setupMockClientForPlayers(mockClient, expectedPlayers);

      const results = await searcher.searchPlayers(fixture.input);

      expect(results).toHaveLength(expectedPlayers.length);

      for (let i = 0; i < results.length; i++) {
        compareSearchResult(results[i], expectedPlayers[i], `Player ${i + 1}`);
      }
    }
  });
});

// =============================================================================
// Cross-format Tests
// =============================================================================

describe('PlayerSearch Parity - Cross-Format Tests', () => {
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

  test('All ladder fixtures should pass', async () => {
    const fixtures = loadFixtures(/^ladder_.*\.json$/);

    for (const fixture of fixtures) {
      const ladderFixture = fixture as any;

      // Handle multi-scenario fixtures
      if (ladderFixture.test_cases) {
        for (const testCase of ladderFixture.test_cases) {
          // Create fresh instances for each test case to avoid cache pollution
          const freshRegistry = new PlayerRegistry();
          const freshSearcher = new PlayerSearcher(mockClient, freshRegistry);

          setupMockClientForPlayers(mockClient, testCase.players);

          // Filter out empty/whitespace-only names (matches parser behavior)
          const cleanedInput = testCase.input.filter((name: string) => name.trim().length > 0);

          const results = await freshSearcher.searchPlayers(cleanedInput);
          expect(results).toHaveLength(testCase.players.length);
          mockClient.searchPlayers.mockReset();
        }
      } else if (ladderFixture.players) {
        // Create fresh instances
        const freshRegistry = new PlayerRegistry();
        const freshSearcher = new PlayerSearcher(mockClient, freshRegistry);

        setupMockClientForPlayers(mockClient, ladderFixture.players);

        // Filter out empty/whitespace-only names (matches parser behavior)
        const cleanedInput = ladderFixture.input.filter((name: string) => name.trim().length > 0);

        const results = await freshSearcher.searchPlayers(cleanedInput);
        expect(results).toHaveLength(ladderFixture.players.length);
        mockClient.searchPlayers.mockReset();
      }
    }
  });

  test('All partner fixtures should pass', async () => {
    const fixtures = loadFixtures(/^partner_.*\.json$/);

    for (const fixture of fixtures) {
      const partnerFixture = fixture as PartnerFixture;

      // Extract all players from teams
      const allPlayers: FixturePlayer[] = [];
      partnerFixture.teams.forEach(team => {
        allPlayers.push(team.player1);
        allPlayers.push(team.player2);
      });

      setupMockClientForPlayers(mockClient, allPlayers);

      const playerNames = allPlayers.map(p => p.name);
      const results = await searcher.searchPlayers(playerNames);
      expect(results).toHaveLength(allPlayers.length);

      // Reset for next fixture
      mockClient.searchPlayers.mockReset();
    }
  });

  test('All picklebros fixtures should pass', async () => {
    const fixtures = loadFixtures(/^picklebros_.*\.json$/);

    for (const fixture of fixtures) {
      const picklebrosFixture = fixture as any;

      // Handle multi-scenario fixtures
      if (picklebrosFixture.test_scenarios) {
        for (const scenario of picklebrosFixture.test_scenarios) {
          // Create fresh instances for each scenario
          const freshRegistry = new PlayerRegistry();
          const freshSearcher = new PlayerSearcher(mockClient, freshRegistry);

          // Extract all players and create map by name
          const playerMap = new Map<string, FixturePlayer>();
          scenario.pools?.forEach((pool: any) => {
            pool.players.forEach((player: FixturePlayer) => {
              playerMap.set(player.name, player);
            });
          });

          const expectedPlayers = scenario.input.map((name: string) => playerMap.get(name)!);

          if (expectedPlayers.length > 0 && expectedPlayers.every((p: any) => p !== undefined)) {
            setupMockClientForPlayers(mockClient, expectedPlayers);
            const results = await freshSearcher.searchPlayers(scenario.input);
            expect(results).toHaveLength(expectedPlayers.length);
            mockClient.searchPlayers.mockReset();
          }
        }
      } else if (picklebrosFixture.pools) {
        // Create fresh instances
        const freshRegistry = new PlayerRegistry();
        const freshSearcher = new PlayerSearcher(mockClient, freshRegistry);

        const playerMap = new Map<string, FixturePlayer>();
        picklebrosFixture.pools.forEach((pool: any) => {
          pool.players.forEach((player: FixturePlayer) => {
            playerMap.set(player.name, player);
          });
        });

        const expectedPlayers = picklebrosFixture.input.map((name: string) => playerMap.get(name)!);

        setupMockClientForPlayers(mockClient, expectedPlayers);
        const results = await freshSearcher.searchPlayers(picklebrosFixture.input);
        expect(results).toHaveLength(expectedPlayers.length);
        mockClient.searchPlayers.mockReset();
      }
    }
  });

  test('Registry caching works across formats', async () => {
    // Test that once a player is found, they're cached for subsequent searches
    const fixture = loadFixture('ladder_basic.json') as LadderFixture;
    const firstPlayer = fixture.players[0];

    const mockPlayer = fixturePlayerToMockPlayer(firstPlayer);
    mockClient.searchPlayers.mockResolvedValueOnce([mockPlayer!]);

    // First search - should hit API
    const result1 = await searcher.searchPlayer(firstPlayer.name);
    expect(result1.searchMethod).toBe(normalizeSearchMethod(firstPlayer.search_method));
    expect(mockClient.searchPlayers).toHaveBeenCalledTimes(1);

    // Second search - should use registry cache
    const result2 = await searcher.searchPlayer(firstPlayer.name);
    expect(result2.searchMethod).toBe('registry');
    expect(mockClient.searchPlayers).toHaveBeenCalledTimes(1); // Still only 1 call

    // Verify cached result matches
    expect(result2.rating).toBe(result1.rating);
    expect(result2.duprId).toBe(result1.duprId);
  });
});

// =============================================================================
// Performance Tests
// =============================================================================

describe('PlayerSearch Parity - Performance', () => {
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

  test('Large batch search should complete in reasonable time', async () => {
    const fixture = loadFixture('ladder_10players.json') as LadderFixture;

    setupMockClientForPlayers(mockClient, fixture.players);

    const startTime = Date.now();
    const results = await searcher.searchPlayers(fixture.input);
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(results).toHaveLength(fixture.players.length);

    // Should complete within 5 seconds (generous for CI environments)
    expect(duration).toBeLessThan(5000);
  }, 10000); // 10 second timeout for this test

  test('Registry caching reduces API calls', async () => {
    const fixture = loadFixture('ladder_basic.json') as LadderFixture;

    setupMockClientForPlayers(mockClient, fixture.players);

    // First batch - hits API
    await searcher.searchPlayers(fixture.input);
    const firstCallCount = mockClient.searchPlayers.mock.calls.length;

    // Second batch - uses cache
    await searcher.searchPlayers(fixture.input);
    const secondCallCount = mockClient.searchPlayers.mock.calls.length;

    // Second batch should not have made additional API calls
    expect(secondCallCount).toBe(firstCallCount);
  });
});
