/**
 * GameService Unit Tests
 * Tests game processing with mocked DUPRClient
 */

import { GameService } from '../gameService';
import { GameType } from '@dupr/core';

// Mock overrideStorage
jest.mock('../overrideStorage', () => ({
  getOverrides: jest.fn().mockResolvedValue([]),
  saveOverride: jest.fn(),
  deleteOverride: jest.fn(),
  clearOverrides: jest.fn(),
}));

// Create a mock searcher instance that will be reused
const mockSearcher = {
  searchPlayers: jest.fn().mockResolvedValue([]),
  searchPlayer: jest.fn(),
};

// Mock the entire @dupr/core module
jest.mock('@dupr/core', () => {
  const actual = jest.requireActual('@dupr/core');
  return {
    ...actual,
    DUPRClient: jest.fn().mockImplementation(() => ({
      searchPlayers: jest.fn().mockResolvedValue([]),
    })),
    PlayerSearcher: jest.fn().mockImplementation(() => mockSearcher),
  };
});

describe('GameService', () => {
  let gameService: GameService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockSearcher.searchPlayers.mockResolvedValue([]);

    // Create service
    gameService = new GameService('test-token');
  });

  describe('constructor', () => {
    it('should initialize with token', async () => {
      expect(gameService).toBeDefined();
      expect(gameService.getClient()).toBeDefined();
      const searcher = await gameService.getSearcher();
      expect(searcher).toBeDefined();
    });
  });

  describe('processLadder', () => {
    it('should process ladder format successfully', async () => {
      // Mock player search results
      const mockResults = [
        {
          name: 'John Smith',
          rating: 4.5,
          playerId: 1,
          duprId: 'dupr-1',
          duprName: 'John Smith',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-1',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
        {
          name: 'Jane Doe',
          rating: 3.8,
          playerId: 2,
          duprId: 'dupr-2',
          duprName: 'Jane Doe',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-2',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
      ];

      // Mock searcher.searchPlayers to return mock results
      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      const input = 'John Smith\nJane Doe';
      const result = await gameService.processLadder(input);

      expect(result.players).toHaveLength(2);
      expect(result.players[0].name).toBe('John Smith');
      expect(result.players[0].rating).toBe(4.5);
      expect(result.players[1].name).toBe('Jane Doe');
      expect(result.html).toContain('DUPR Ladder');
    });

    it('should throw error if no players found', async () => {
      const input = '';
      await expect(gameService.processLadder(input)).rejects.toThrow(
        'No players found in input'
      );
    });

    it('should handle whitespace and empty lines', async () => {
      const mockResults = [
        {
          name: 'John Smith',
          rating: 4.0,
          playerId: 1,
          duprId: 'dupr-1',
          duprName: 'John Smith',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-1',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
      ];

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      const input = '\n  John Smith  \n\n';
      const result = await gameService.processLadder(input);

      expect(result.players).toHaveLength(1);
      expect(result.players[0].name).toBe('John Smith');
    });
  });

  describe('processPartner', () => {
    it('should process partner format successfully', async () => {
      const mockResults = [
        {
          name: 'John Smith',
          rating: 4.5,
          playerId: 1,
          duprId: 'dupr-1',
          duprName: 'John Smith',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-1',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
        {
          name: 'Jane Doe',
          rating: 3.8,
          playerId: 2,
          duprId: 'dupr-2',
          duprName: 'Jane Doe',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-2',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
        {
          name: 'Bob Wilson',
          rating: 4.2,
          playerId: 3,
          duprId: 'dupr-3',
          duprName: 'Bob Wilson',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-3',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
        {
          name: 'Alice Johnson',
          rating: 3.5,
          playerId: 4,
          duprId: 'dupr-4',
          duprName: 'Alice Johnson',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-4',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
      ];

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      const input = 'John Smith / Jane Doe\nBob Wilson / Alice Johnson';
      const result = await gameService.processPartner(input);

      expect(result.players).toHaveLength(4);
      expect(result.teams).toHaveLength(2);
      expect(result.teams![0].player1.name).toBe('John Smith');
      expect(result.teams![0].player2.name).toBe('Jane Doe');
      expect(result.teams![0].teamRating).toBe(4.045); // 0.35 * 4.5 + 0.65 * 3.8 = 1.575 + 2.47 = 4.045
      expect(result.html).toContain('Partner DUPR');
    });

    it('should throw error if no teams found', async () => {
      const input = '';
      await expect(gameService.processPartner(input)).rejects.toThrow(
        'No teams found in input'
      );
    });

    it('should handle team rating calculation', async () => {
      const mockResults = [
        {
          name: 'Player A',
          rating: 5.0,
          playerId: 1,
          duprId: 'dupr-1',
          duprName: 'Player A',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-1',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
        {
          name: 'Player B',
          rating: 3.0,
          playerId: 2,
          duprId: 'dupr-2',
          duprName: 'Player B',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-2',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
      ];

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      const input = 'Player A / Player B';
      const result = await gameService.processPartner(input);

      // Team rating = 0.35 * 5.0 + 0.65 * 3.0 = 1.75 + 1.95 = 3.7
      expect(result.teams![0].teamRating).toBe(3.7);
    });
  });

  describe('processPickleBros', () => {
    it('should process picklebros format successfully', async () => {
      const mockResults = [
        {
          name: 'Player 1',
          rating: 4.5,
          playerId: 1,
          duprId: 'dupr-1',
          duprName: 'Player 1',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-1',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
        {
          name: 'Player 2',
          rating: 4.0,
          playerId: 2,
          duprId: 'dupr-2',
          duprName: 'Player 2',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-2',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
        {
          name: 'Player 3',
          rating: 3.5,
          playerId: 3,
          duprId: 'dupr-3',
          duprName: 'Player 3',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-3',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
        {
          name: 'Player 4',
          rating: 3.0,
          playerId: 4,
          duprId: 'dupr-4',
          duprName: 'Player 4',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-4',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
      ];

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      const input = 'Player 1\nPlayer 2\nPlayer 3\nPlayer 4';
      const result = await gameService.processPickleBros(input);

      expect(result.players).toHaveLength(4);
      expect(result.html).toContain('PickleBros');
    });

    it('should throw error if not multiple of 4', async () => {
      const mockResults = [
        {
          name: 'Player 1',
          rating: 4.0,
          playerId: 1,
          duprId: 'dupr-1',
          duprName: 'Player 1',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-1',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
        {
          name: 'Player 2',
          rating: 3.5,
          playerId: 2,
          duprId: 'dupr-2',
          duprName: 'Player 2',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-2',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
        {
          name: 'Player 3',
          rating: 3.0,
          playerId: 3,
          duprId: 'dupr-3',
          duprName: 'Player 3',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-3',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
      ];

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      const input = 'Player 1\nPlayer 2\nPlayer 3';
      await expect(gameService.processPickleBros(input)).rejects.toThrow(
        'PickleBros requires a multiple of 4 players'
      );
    });

    it('should accept 8 players', async () => {
      const mockResults = Array.from({ length: 8 }, (_, i) => ({
        name: `Player ${i + 1}`,
        rating: 4.0 - i * 0.1,
        playerId: i + 1,
        duprId: `dupr-${i + 1}`,
        duprName: `Player ${i + 1}`,
        profileUrl: `https://dashboard.dupr.com/dashboard/player/dupr-${i + 1}`,
        found: true,
        searchMethod: 'exact_alberta',
        location: 'Alberta, Canada',
      }));

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      const input = Array.from({ length: 8 }, (_, i) => `Player ${i + 1}`).join('\n');
      const result = await gameService.processPickleBros(input);

      expect(result.players).toHaveLength(8);
    });
  });

  describe('process (generic)', () => {
    it('should route to processLadder for DUPR_LADDER', async () => {
      const mockResults = [
        {
          name: 'John Smith',
          rating: 4.0,
          playerId: 1,
          duprId: 'dupr-1',
          duprName: 'John Smith',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-1',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
      ];

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      const input = 'John Smith';
      const result = await gameService.process(GameType.DUPR_LADDER, input);

      expect(result.players).toHaveLength(1);
      expect(result.html).toContain('DUPR Ladder');
    });

    it('should route to processPartner for PARTNER_DUPR', async () => {
      const mockResults = [
        {
          name: 'Player A',
          rating: 4.0,
          playerId: 1,
          duprId: 'dupr-1',
          duprName: 'Player A',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-1',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
        {
          name: 'Player B',
          rating: 3.5,
          playerId: 2,
          duprId: 'dupr-2',
          duprName: 'Player B',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-2',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
      ];

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      const input = 'Player A / Player B';
      const result = await gameService.process(GameType.PARTNER_DUPR, input);

      expect(result.teams).toHaveLength(1);
      expect(result.html).toContain('Partner DUPR');
    });

    it('should route to processPickleBros for PICKLEBROS_MONDAY', async () => {
      const mockResults = Array.from({ length: 4 }, (_, i) => ({
        name: `Player ${i + 1}`,
        rating: 4.0,
        playerId: i + 1,
        duprId: `dupr-${i + 1}`,
        duprName: `Player ${i + 1}`,
        profileUrl: `https://dashboard.dupr.com/dashboard/player/dupr-${i + 1}`,
        found: true,
        searchMethod: 'exact_alberta',
        location: 'Alberta, Canada',
      }));

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      const input = 'Player 1\nPlayer 2\nPlayer 3\nPlayer 4';
      const result = await gameService.process(GameType.PICKLEBROS_MONDAY, input);

      expect(result.players).toHaveLength(4);
      expect(result.html).toContain('PickleBros');
    });

    it('should throw error for unknown game type', async () => {
      const input = 'Player 1';
      await expect(
        gameService.process('unknown_type' as GameType, input)
      ).rejects.toThrow('Unknown game type');
    });
  });

  describe('conversion methods', () => {
    it('should convert SearchResult to PlayerWithRating', async () => {
      const mockResults = [
        {
          name: 'Test Player',
          rating: 4.2,
          playerId: 1,
          duprId: 'dupr-1',
          duprName: 'Test Player',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-1',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
      ];

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      const input = 'Test Player';
      const result = await gameService.processLadder(input);

      const player = result.players[0];
      expect(player.name).toBe('Test Player');
      expect(player.rating).toBe(4.2);
      expect(player.profileUrl).toBe('https://dashboard.dupr.com/dashboard/player/dupr-1');
      expect(player.found).toBe(true);
      expect(player.searchMethod).toBe('exact_alberta');
    });

    it('should handle players not found (default rating)', async () => {
      const mockResults = [
        {
          name: 'Unknown Player',
          rating: 3.0, // DEFAULT_RATING
          playerId: null,
          duprId: null,
          duprName: null,
          profileUrl: null,
          found: false,
          searchMethod: 'default',
          location: null,
        },
      ];

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      const input = 'Unknown Player';
      const result = await gameService.processLadder(input);

      const player = result.players[0];
      expect(player.found).toBe(false);
      expect(player.rating).toBe(3.0);
      expect(player.searchMethod).toBe('default');
    });
  });
});
