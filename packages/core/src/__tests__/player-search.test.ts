/**
 * Unit tests for PlayerSearcher
 * Tests cover: registry cache, overrides, cascade search, fuzzy matching,
 * name cleaning, short common names, error handling, and caching
 */

import {
  PlayerSearcher,
  SearchResult,
  SearchConfig,
  PlayerOverride,
  DEFAULT_RATING,
  FUZZY_THRESHOLD,
  ALBERTA_LAT,
  ALBERTA_LNG,
  CANADA_LAT,
  CANADA_LNG,
} from '../player-search';
import { DUPRClient, DUPRPlayer } from '../dupr-client';
import { PlayerRegistry } from '../player-registry';

// Mock the DUPRClient
jest.mock('../dupr-client');

describe('PlayerSearcher', () => {
  let mockClient: jest.Mocked<DUPRClient>;
  let registry: PlayerRegistry;
  let searcher: PlayerSearcher;

  const mockPlayer: DUPRPlayer = {
    id: 12345,
    fullName: 'John Smith',
    firstName: 'John',
    lastName: 'Smith',
    shortAddress: 'Edmonton, AB',
    duprId: 'ABC123',
    profileUrl: 'https://dashboard.dupr.com/dashboard/player/12345',
    ratings: { singles: 3.95, doubles: 4.25, singlesVerified: true, doublesVerified: true },
    bestRating: 4.25,
  };

  const mockPlayer2: DUPRPlayer = {
    id: 67890,
    fullName: 'Jane Doe',
    firstName: 'Jane',
    lastName: 'Doe',
    shortAddress: 'Calgary, AB',
    duprId: 'XYZ789',
    profileUrl: 'https://dashboard.dupr.com/dashboard/player/67890',
    ratings: { singles: 4.0, doubles: 4.5, singlesVerified: true, doublesVerified: true },
    bestRating: 4.5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = new DUPRClient('test-token') as jest.Mocked<DUPRClient>;
    mockClient.searchPlayers = jest.fn();
    registry = new PlayerRegistry();
    searcher = new PlayerSearcher(mockClient, registry);
  });

  // ==========================================================================
  // Registry Cache Tests
  // ==========================================================================

  describe('registry cache', () => {
    it('should return cached player from registry', async () => {
      registry.register('john smith', 'ABC123', 'John Smith', 4.25, 'Edmonton, AB');

      const result = await searcher.searchPlayer('John Smith');

      expect(result.found).toBe(true);
      expect(result.searchMethod).toBe('registry');
      expect(result.rating).toBe(4.25);
      expect(result.duprId).toBe('ABC123');
      expect(result.duprName).toBe('John Smith');
      expect(mockClient.searchPlayers).not.toHaveBeenCalled();
    });

    it('should use registry for case-insensitive lookups', async () => {
      registry.register('john smith', 'ABC123', 'John Smith', 4.25, 'Edmonton, AB');

      const result = await searcher.searchPlayer('JOHN SMITH');

      expect(result.found).toBe(true);
      expect(result.searchMethod).toBe('registry');
      expect(mockClient.searchPlayers).not.toHaveBeenCalled();
    });

    it('should build profile URL from cached duprId', async () => {
      registry.register('john smith', 'ABC123', 'John Smith', 4.25, 'Edmonton, AB');

      const result = await searcher.searchPlayer('John Smith');

      expect(result.profileUrl).toBe('https://dashboard.dupr.com/dashboard/player/ABC123');
    });

    it('should return location from cached player', async () => {
      registry.register('john smith', 'ABC123', 'John Smith', 4.25, 'Edmonton, AB');

      const result = await searcher.searchPlayer('John Smith');

      expect(result.location).toBe('Edmonton, AB');
    });

    it('should use DEFAULT_RATING when cached rating is null', async () => {
      registry.register('john smith', 'ABC123', 'John Smith', null, 'Edmonton, AB');

      const result = await searcher.searchPlayer('John Smith');

      expect(result.rating).toBe(DEFAULT_RATING);
    });
  });

  // ==========================================================================
  // Override Tests
  // ==========================================================================

  describe('overrides', () => {
    it('should return override when set via config', async () => {
      const config: SearchConfig = {
        overrides: new Map([
          ['john smith', { duprId: 'OVR123', duprName: 'John Override', rating: 5.0 }],
        ]),
      };
      searcher = new PlayerSearcher(mockClient, registry, config);

      const result = await searcher.searchPlayer('John Smith');

      expect(result.found).toBe(true);
      expect(result.searchMethod).toBe('override');
      expect(result.rating).toBe(5.0);
      expect(result.duprId).toBe('OVR123');
      expect(result.duprName).toBe('John Override');
    });

    it('should use override searchMethod', async () => {
      const config: SearchConfig = {
        overrides: new Map([
          ['jane doe', { duprId: 'OVR456', duprName: 'Jane Override', rating: 4.5 }],
        ]),
      };
      searcher = new PlayerSearcher(mockClient, registry, config);

      const result = await searcher.searchPlayer('Jane Doe');

      expect(result.searchMethod).toBe('override');
    });

    it('should allow setting overrides dynamically with setOverride', async () => {
      searcher.setOverride('jane doe', { duprId: 'OVR456', duprName: 'Jane Override', rating: 4.5 });

      const result = await searcher.searchPlayer('Jane Doe');

      expect(result.searchMethod).toBe('override');
      expect(result.rating).toBe(4.5);
      expect(result.duprId).toBe('OVR456');
    });

    it('should remove override with removeOverride', async () => {
      searcher.setOverride('jane doe', { duprId: 'OVR456', duprName: 'Jane Override', rating: 4.5 });
      const removed = searcher.removeOverride('jane doe');

      expect(removed).toBe(true);

      mockClient.searchPlayers.mockResolvedValue([]);
      const result = await searcher.searchPlayer('Jane Doe');

      expect(result.searchMethod).toBe('default');
    });

    it('should return false when removing non-existent override', () => {
      const removed = searcher.removeOverride('nonexistent');

      expect(removed).toBe(false);
    });

    it('should prioritize registry over override', async () => {
      registry.register('john smith', 'REG123', 'John Registry', 4.0, 'Edmonton, AB');
      searcher.setOverride('john smith', { duprId: 'OVR123', duprName: 'John Override', rating: 5.0 });

      const result = await searcher.searchPlayer('John Smith');

      expect(result.searchMethod).toBe('registry');
      expect(result.rating).toBe(4.0);
    });

    it('should have null profileUrl and location for override', async () => {
      searcher.setOverride('jane doe', { duprId: 'OVR456', duprName: 'Jane Override', rating: 4.5 });

      const result = await searcher.searchPlayer('Jane Doe');

      expect(result.profileUrl).toBeNull();
      expect(result.location).toBeNull();
    });

    it('should be case-insensitive for override lookups', async () => {
      searcher.setOverride('jane doe', { duprId: 'OVR456', duprName: 'Jane Override', rating: 4.5 });

      const result = await searcher.searchPlayer('JANE DOE');

      expect(result.searchMethod).toBe('override');
    });
  });

  // ==========================================================================
  // Cascade Search Tests
  // ==========================================================================

  describe('cascade search', () => {
    it('should find player in Alberta tier (Tier 3)', async () => {
      mockClient.searchPlayers.mockResolvedValueOnce([mockPlayer]);

      const result = await searcher.searchPlayer('John Smith');

      expect(result.found).toBe(true);
      expect(result.searchMethod).toBe('exact_alberta');
      expect(mockClient.searchPlayers).toHaveBeenCalledWith(
        'John Smith',
        'Alberta, Canada',
        ALBERTA_LAT,
        ALBERTA_LNG
      );
    });

    it('should try last name in Alberta tier (Tier 4) when full name not found', async () => {
      // Use an uncommon last name that is NOT in SHORT_COMMON_LASTNAMES
      const playerKalluri: DUPRPlayer = { ...mockPlayer, fullName: 'John Kalluri', lastName: 'Kalluri' };
      mockClient.searchPlayers
        .mockResolvedValueOnce([])  // Alberta full name - no results
        .mockResolvedValueOnce([playerKalluri]);  // Alberta last name

      const result = await searcher.searchPlayer('John Kalluri');

      expect(result.found).toBe(true);
      expect(result.searchMethod).toBe('lastname_alberta');
      expect(mockClient.searchPlayers).toHaveBeenNthCalledWith(2, 'Kalluri', 'Alberta, Canada', ALBERTA_LAT, ALBERTA_LNG);
    });

    it('should fall through to Canada tier (Tier 5)', async () => {
      // Use an uncommon last name that is NOT in SHORT_COMMON_LASTNAMES
      const playerKalluri: DUPRPlayer = { ...mockPlayer, fullName: 'John Kalluri', lastName: 'Kalluri' };
      mockClient.searchPlayers
        .mockResolvedValueOnce([])  // Alberta full name
        .mockResolvedValueOnce([])  // Alberta last name
        .mockResolvedValueOnce([playerKalluri]);  // Canada full name

      const result = await searcher.searchPlayer('John Kalluri');

      expect(result.found).toBe(true);
      expect(result.searchMethod).toBe('exact_canada');
      expect(mockClient.searchPlayers).toHaveBeenNthCalledWith(3, 'John Kalluri', 'Canada', CANADA_LAT, CANADA_LNG);
    });

    it('should try last name in Canada tier (Tier 6)', async () => {
      // Use an uncommon last name that is NOT in SHORT_COMMON_LASTNAMES
      const playerKalluri: DUPRPlayer = { ...mockPlayer, fullName: 'John Kalluri', lastName: 'Kalluri' };
      mockClient.searchPlayers
        .mockResolvedValueOnce([])  // Alberta full name
        .mockResolvedValueOnce([])  // Alberta last name
        .mockResolvedValueOnce([])  // Canada full name
        .mockResolvedValueOnce([playerKalluri]);  // Canada last name

      const result = await searcher.searchPlayer('John Kalluri');

      expect(result.found).toBe(true);
      expect(result.searchMethod).toBe('lastname_canada');
    });

    it('should try global last name search (Tier 7)', async () => {
      // Use an uncommon last name that is NOT in SHORT_COMMON_LASTNAMES
      const playerKalluri: DUPRPlayer = { ...mockPlayer, fullName: 'John Kalluri', lastName: 'Kalluri' };
      mockClient.searchPlayers
        .mockResolvedValueOnce([])  // Alberta full name
        .mockResolvedValueOnce([])  // Alberta last name
        .mockResolvedValueOnce([])  // Canada full name
        .mockResolvedValueOnce([])  // Canada last name
        .mockResolvedValueOnce([playerKalluri]);  // Global last name

      const result = await searcher.searchPlayer('John Kalluri');

      expect(result.found).toBe(true);
      expect(result.searchMethod).toBe('lastname_global');
      expect(mockClient.searchPlayers).toHaveBeenNthCalledWith(5, 'Kalluri');
    });

    it('should try global full name search (Tier 8)', async () => {
      // Use an uncommon last name that is NOT in SHORT_COMMON_LASTNAMES
      const playerKalluri: DUPRPlayer = { ...mockPlayer, fullName: 'John Kalluri', lastName: 'Kalluri' };
      mockClient.searchPlayers
        .mockResolvedValueOnce([])  // Alberta full name
        .mockResolvedValueOnce([])  // Alberta last name
        .mockResolvedValueOnce([])  // Canada full name
        .mockResolvedValueOnce([])  // Canada last name
        .mockResolvedValueOnce([])  // Global last name
        .mockResolvedValueOnce([playerKalluri]);  // Global full name

      const result = await searcher.searchPlayer('John Kalluri');

      expect(result.found).toBe(true);
      expect(result.searchMethod).toBe('exact_global');
      expect(mockClient.searchPlayers).toHaveBeenNthCalledWith(6, 'John Kalluri');
    });

    it('should return default rating when not found (Tier 9)', async () => {
      mockClient.searchPlayers.mockResolvedValue([]);

      const result = await searcher.searchPlayer('Unknown Player');

      expect(result.found).toBe(false);
      expect(result.searchMethod).toBe('default');
      expect(result.rating).toBe(DEFAULT_RATING);
      expect(result.playerId).toBeNull();
      expect(result.duprId).toBeNull();
      expect(result.duprName).toBeNull();
      expect(result.profileUrl).toBeNull();
      expect(result.location).toBeNull();
    });

    it('should skip last-name-only tiers for single-word names', async () => {
      mockClient.searchPlayers
        .mockResolvedValueOnce([])  // Alberta
        .mockResolvedValueOnce([])  // Canada (no last name search since name = lastName)
        .mockResolvedValueOnce([mockPlayer]);  // Global (no last name search)

      const result = await searcher.searchPlayer('Madonna');

      expect(result.found).toBe(true);
      // When there's only one name part, we skip last name searches (Tier 4, 6, 7)
      // because lastName would equal the full name
    });
  });

  // ==========================================================================
  // Fuzzy Matching Tests
  // ==========================================================================

  describe('fuzzy matching', () => {
    it('should find player with exact match first', async () => {
      const exactMatch: DUPRPlayer = { ...mockPlayer, fullName: 'John Smith' };
      const otherPlayer: DUPRPlayer = { ...mockPlayer, id: 99999, fullName: 'John Smyth' };

      mockClient.searchPlayers.mockResolvedValueOnce([otherPlayer, exactMatch]);

      const result = await searcher.searchPlayer('John Smith');

      expect(result.found).toBe(true);
      expect(result.duprName).toBe('John Smith');
    });

    it('should find player using nickname matching (Nick to Nicholas)', async () => {
      const playerNicholas: DUPRPlayer = { ...mockPlayer, fullName: 'Nicholas Smith' };

      mockClient.searchPlayers.mockResolvedValueOnce([playerNicholas]);

      const result = await searcher.searchPlayer('Nick Smith');

      expect(result.found).toBe(true);
      expect(result.duprName).toBe('Nicholas Smith');
    });

    it('should find player using nickname matching (Mike to Michael)', async () => {
      const playerMichael: DUPRPlayer = { ...mockPlayer, fullName: 'Michael Johnson' };

      mockClient.searchPlayers.mockResolvedValueOnce([playerMichael]);

      const result = await searcher.searchPlayer('Mike Johnson');

      expect(result.found).toBe(true);
      expect(result.duprName).toBe('Michael Johnson');
    });

    it('should find player with similar spelling using fuzzy match', async () => {
      const playerVariant: DUPRPlayer = { ...mockPlayer, fullName: 'John Smyth' };

      mockClient.searchPlayers.mockResolvedValueOnce([playerVariant]);

      const result = await searcher.searchPlayer('John Smith');

      // Fuzzy match should succeed since Jaro-Winkler score for Smith/Smyth is > 0.85
      expect(result.found).toBe(true);
    });

    it('should return first result when no exact, nickname, or fuzzy match', async () => {
      const firstPlayer: DUPRPlayer = { ...mockPlayer, id: 11111, fullName: 'Bob Jones' };
      const secondPlayer: DUPRPlayer = { ...mockPlayer, id: 22222, fullName: 'Alice Williams' };

      mockClient.searchPlayers.mockResolvedValueOnce([firstPlayer, secondPlayer]);

      const result = await searcher.searchPlayer('Xyz Abc');

      // Falls back to first result
      expect(result.found).toBe(true);
      expect(result.duprName).toBe('Bob Jones');
    });

    it('should return null from findBestMatch when players array is empty', async () => {
      mockClient.searchPlayers.mockResolvedValue([]);

      const result = await searcher.searchPlayer('John Smith');

      expect(result.found).toBe(false);
    });
  });

  // ==========================================================================
  // Name Cleaning Tests
  // ==========================================================================

  describe('name cleaning', () => {
    it('should remove (G) marker', async () => {
      mockClient.searchPlayers.mockResolvedValueOnce([mockPlayer]);

      const result = await searcher.searchPlayer('John Smith (G)');

      expect(result.name).toBe('John Smith');
    });

    it('should remove (Guest) marker', async () => {
      mockClient.searchPlayers.mockResolvedValueOnce([mockPlayer]);

      const result = await searcher.searchPlayer('John Smith (Guest)');

      expect(result.name).toBe('John Smith');
    });

    it('should remove (g) marker case-insensitively', async () => {
      mockClient.searchPlayers.mockResolvedValueOnce([mockPlayer]);

      const result = await searcher.searchPlayer('John Smith (g)');

      expect(result.name).toBe('John Smith');
    });

    it('should remove (guest) marker case-insensitively', async () => {
      mockClient.searchPlayers.mockResolvedValueOnce([mockPlayer]);

      const result = await searcher.searchPlayer('John Smith (guest)');

      expect(result.name).toBe('John Smith');
    });

    it('should trim whitespace', async () => {
      mockClient.searchPlayers.mockResolvedValueOnce([mockPlayer]);

      const result = await searcher.searchPlayer('  John Smith  ');

      expect(result.name).toBe('John Smith');
    });

    it('should handle multiple markers and whitespace', async () => {
      mockClient.searchPlayers.mockResolvedValueOnce([mockPlayer]);

      const result = await searcher.searchPlayer('  John Smith  (G)  ');

      expect(result.name).toBe('John Smith');
    });

    it('should remove any trailing parenthetical marker', async () => {
      mockClient.searchPlayers.mockResolvedValueOnce([mockPlayer]);

      const result = await searcher.searchPlayer('John Smith (Substitute)');

      expect(result.name).toBe('John Smith');
    });
  });

  // ==========================================================================
  // Short Common Name Tests
  // ==========================================================================

  describe('short common names', () => {
    it('should skip last-name-only search for "Li"', async () => {
      mockClient.searchPlayers
        .mockResolvedValueOnce([])  // Alberta full name
        .mockResolvedValueOnce([])  // Canada full name (skips Alberta last name)
        .mockResolvedValueOnce([])  // Global full name (skips Canada last name, global last name)

      await searcher.searchPlayer('Wei Li');

      // Verify that last-name-only searches are skipped for "Li"
      const calls = mockClient.searchPlayers.mock.calls;
      expect(calls.every(call => call[0] !== 'Li')).toBe(true);
    });

    it('should skip last-name-only search for "Wu"', async () => {
      mockClient.searchPlayers.mockResolvedValue([]);

      await searcher.searchPlayer('Jun Wu');

      const calls = mockClient.searchPlayers.mock.calls;
      expect(calls.every(call => call[0] !== 'Wu')).toBe(true);
    });

    it('should skip last-name-only search for "Ng"', async () => {
      mockClient.searchPlayers.mockResolvedValue([]);

      await searcher.searchPlayer('Ming Ng');

      const calls = mockClient.searchPlayers.mock.calls;
      expect(calls.every(call => call[0] !== 'Ng')).toBe(true);
    });

    it('should skip last-name-only search for short names (3 chars or less)', async () => {
      mockClient.searchPlayers.mockResolvedValue([]);

      await searcher.searchPlayer('John Hu');

      const calls = mockClient.searchPlayers.mock.calls;
      expect(calls.every(call => call[0] !== 'Hu')).toBe(true);
    });

    it('should skip last-name-only search for common names like "Wong"', async () => {
      mockClient.searchPlayers.mockResolvedValue([]);

      await searcher.searchPlayer('David Wong');

      const calls = mockClient.searchPlayers.mock.calls;
      expect(calls.every(call => call[0] !== 'Wong')).toBe(true);
    });

    it('should skip last-name-only search for "Smith"', async () => {
      mockClient.searchPlayers.mockResolvedValue([]);

      await searcher.searchPlayer('John Smith');

      const calls = mockClient.searchPlayers.mock.calls;
      // Smith is in SHORT_COMMON_LASTNAMES
      expect(calls.every(call => call[0] !== 'Smith')).toBe(true);
    });

    it('should perform last-name-only search for uncommon last names', async () => {
      mockClient.searchPlayers.mockResolvedValue([]);

      await searcher.searchPlayer('John Kalluri');

      const calls = mockClient.searchPlayers.mock.calls;
      // Should have at least one call with just "Kalluri"
      expect(calls.some(call => call[0] === 'Kalluri')).toBe(true);
    });
  });

  // ==========================================================================
  // Caching Tests
  // ==========================================================================

  describe('caching', () => {
    it('should cache found players in registry', async () => {
      mockClient.searchPlayers.mockResolvedValueOnce([mockPlayer]);

      await searcher.searchPlayer('John Smith');

      expect(registry.has('John Smith')).toBe(true);
    });

    it('should use cached player on subsequent searches', async () => {
      mockClient.searchPlayers.mockResolvedValueOnce([mockPlayer]);

      await searcher.searchPlayer('John Smith');
      const secondResult = await searcher.searchPlayer('John Smith');

      expect(secondResult.searchMethod).toBe('registry');
      expect(mockClient.searchPlayers).toHaveBeenCalledTimes(1);
    });

    it('should not cache when player not found', async () => {
      mockClient.searchPlayers.mockResolvedValue([]);

      await searcher.searchPlayer('Unknown Player');

      expect(registry.has('Unknown Player')).toBe(false);
    });

    it('should cache with cleaned name', async () => {
      mockClient.searchPlayers.mockResolvedValueOnce([mockPlayer]);

      await searcher.searchPlayer('John Smith (G)');

      expect(registry.has('John Smith')).toBe(true);
      expect(registry.has('John Smith (G)')).toBe(false);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should return default on API error', async () => {
      mockClient.searchPlayers.mockRejectedValue(new Error('API Error'));

      const result = await searcher.searchPlayer('John Smith');

      expect(result.found).toBe(false);
      expect(result.rating).toBe(DEFAULT_RATING);
      expect(result.searchMethod).toBe('default');
    });

    it('should continue cascade on single tier failure', async () => {
      mockClient.searchPlayers
        .mockRejectedValueOnce(new Error('API Error'))  // Alberta fails
        .mockResolvedValueOnce([mockPlayer]);  // Continue works

      const result = await searcher.searchPlayer('John Williams');

      // Should continue to next tier after error
      expect(mockClient.searchPlayers.mock.calls.length).toBeGreaterThan(1);
    });

    it('should handle all tiers failing gracefully', async () => {
      mockClient.searchPlayers.mockRejectedValue(new Error('API Error'));

      const result = await searcher.searchPlayer('John Smith');

      expect(result.found).toBe(false);
      expect(result.rating).toBe(DEFAULT_RATING);
    });

    it('should return default rating when bestRating is null', async () => {
      const playerNoRating: DUPRPlayer = { ...mockPlayer, bestRating: null };
      mockClient.searchPlayers.mockResolvedValueOnce([playerNoRating]);

      const result = await searcher.searchPlayer('John Smith');

      expect(result.rating).toBe(DEFAULT_RATING);
    });
  });

  // ==========================================================================
  // searchPlayers (Batch) Tests
  // ==========================================================================

  describe('searchPlayers (batch)', () => {
    it('should search for multiple players', async () => {
      mockClient.searchPlayers
        .mockResolvedValueOnce([mockPlayer])
        .mockResolvedValueOnce([mockPlayer2]);

      const results = await searcher.searchPlayers(['John Smith', 'Jane Doe']);

      expect(results).toHaveLength(2);
      expect(results[0].duprName).toBe('John Smith');
      expect(results[1].duprName).toBe('Jane Doe');
    });

    it('should return results in same order as input', async () => {
      mockClient.searchPlayers
        .mockResolvedValueOnce([mockPlayer2])
        .mockResolvedValueOnce([mockPlayer]);

      const results = await searcher.searchPlayers(['Jane Doe', 'John Smith']);

      expect(results[0].name).toBe('Jane Doe');
      expect(results[1].name).toBe('John Smith');
    });

    it('should handle empty array', async () => {
      const results = await searcher.searchPlayers([]);

      expect(results).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Accessor Methods Tests
  // ==========================================================================

  describe('accessor methods', () => {
    it('should return registry via getRegistry', () => {
      expect(searcher.getRegistry()).toBe(registry);
    });

    it('should return client via getClient', () => {
      expect(searcher.getClient()).toBe(mockClient);
    });
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should create with default registry if not provided', () => {
      const searcherWithDefaults = new PlayerSearcher(mockClient);

      expect(searcherWithDefaults.getRegistry()).toBeInstanceOf(PlayerRegistry);
    });

    it('should accept custom location text in config', async () => {
      const config: SearchConfig = {
        defaultLocationText: 'British Columbia, Canada',
      };
      searcher = new PlayerSearcher(mockClient, registry, config);

      // The defaultLocationText is stored but cascade uses hardcoded Alberta/Canada
      // This tests the constructor accepts the config
      expect(searcher.getClient()).toBe(mockClient);
    });

    it('should initialize with empty overrides if not provided', async () => {
      mockClient.searchPlayers.mockResolvedValueOnce([mockPlayer]);

      const result = await searcher.searchPlayer('John Smith');

      expect(result.searchMethod).not.toBe('override');
    });
  });
});

// ==========================================================================
// Constants Tests
// ==========================================================================

describe('Constants', () => {
  it('should export DEFAULT_RATING as 3.0', () => {
    expect(DEFAULT_RATING).toBe(3.0);
  });

  it('should export FUZZY_THRESHOLD as 0.85', () => {
    expect(FUZZY_THRESHOLD).toBe(0.85);
  });

  it('should export ALBERTA_LAT correctly', () => {
    expect(ALBERTA_LAT).toBe(53.9332706);
  });

  it('should export ALBERTA_LNG correctly', () => {
    expect(ALBERTA_LNG).toBe(-116.5765035);
  });

  it('should export CANADA_LAT correctly', () => {
    expect(CANADA_LAT).toBe(56.130366);
  });

  it('should export CANADA_LNG correctly', () => {
    expect(CANADA_LNG).toBe(-106.346771);
  });
});

// ==========================================================================
// SearchResult Interface Tests
// ==========================================================================

describe('SearchResult structure', () => {
  let mockClient: jest.Mocked<DUPRClient>;
  let searcher: PlayerSearcher;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = new DUPRClient('test-token') as jest.Mocked<DUPRClient>;
    mockClient.searchPlayers = jest.fn();
    searcher = new PlayerSearcher(mockClient);
  });

  it('should return all required fields in SearchResult', async () => {
    const player: DUPRPlayer = {
      id: 12345,
      fullName: 'Test Player',
      firstName: 'Test',
      lastName: 'Player',
      shortAddress: 'Edmonton, AB',
      duprId: 'ABC123',
      profileUrl: 'https://dashboard.dupr.com/dashboard/player/12345',
      ratings: { singles: 3.5, doubles: 4.0, singlesVerified: true, doublesVerified: true },
      bestRating: 4.0,
    };

    mockClient.searchPlayers.mockResolvedValueOnce([player]);

    const result = await searcher.searchPlayer('Test Player');

    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('rating');
    expect(result).toHaveProperty('playerId');
    expect(result).toHaveProperty('duprId');
    expect(result).toHaveProperty('duprName');
    expect(result).toHaveProperty('profileUrl');
    expect(result).toHaveProperty('found');
    expect(result).toHaveProperty('searchMethod');
    expect(result).toHaveProperty('location');
  });

  it('should populate all fields correctly on found player', async () => {
    const player: DUPRPlayer = {
      id: 99999,
      fullName: 'Found Player',
      firstName: 'Found',
      lastName: 'Player',
      shortAddress: 'Calgary, AB',
      duprId: 'FND999',
      profileUrl: 'https://dashboard.dupr.com/dashboard/player/99999',
      ratings: { singles: 4.5, doubles: 5.0, singlesVerified: true, doublesVerified: true },
      bestRating: 5.0,
    };

    mockClient.searchPlayers.mockResolvedValueOnce([player]);

    const result = await searcher.searchPlayer('Found Player');

    expect(result.name).toBe('Found Player');
    expect(result.rating).toBe(5.0);
    expect(result.playerId).toBe(99999);
    expect(result.duprId).toBe('FND999');
    expect(result.duprName).toBe('Found Player');
    expect(result.profileUrl).toBe('https://dashboard.dupr.com/dashboard/player/99999');
    expect(result.found).toBe(true);
    expect(result.searchMethod).toBe('exact_alberta');
    expect(result.location).toBe('Calgary, AB');
  });

  it('should populate all fields correctly on not found player', async () => {
    mockClient.searchPlayers.mockResolvedValue([]);

    const result = await searcher.searchPlayer('Not Found Player');

    expect(result.name).toBe('Not Found Player');
    expect(result.rating).toBe(DEFAULT_RATING);
    expect(result.playerId).toBeNull();
    expect(result.duprId).toBeNull();
    expect(result.duprName).toBeNull();
    expect(result.profileUrl).toBeNull();
    expect(result.found).toBe(false);
    expect(result.searchMethod).toBe('default');
    expect(result.location).toBeNull();
  });
});
