/**
 * GameService Integration Tests
 * Tests game processing with real @dupr/core modules (but mocked DUPRClient)
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

// Only mock the DUPRClient, not the entire module
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

describe('GameService Integration Tests', () => {
  let gameService: GameService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearcher.searchPlayers.mockResolvedValue([]);
    gameService = new GameService('test-token');
  });

  describe('Full Flow - DUPR Ladder', () => {
    it('should process realistic ladder input with multiple players', async () => {
      // Mock search results for multiple players
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
          rating: 4.2,
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
          rating: 3.8,
          playerId: 3,
          duprId: 'dupr-3',
          duprName: 'Bob Wilson',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-3',
          found: true,
          searchMethod: 'lastname_alberta',
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
          searchMethod: 'exact_canada',
          location: 'Canada',
        },
        {
          name: 'Charlie Brown',
          rating: 3.2,
          playerId: 5,
          duprId: 'dupr-5',
          duprName: 'Charlie Brown',
          profileUrl: 'https://dashboard.dupr.com/dashboard/player/dupr-5',
          found: true,
          searchMethod: 'exact_alberta',
          location: 'Alberta, Canada',
        },
      ];

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      const input = `John Smith
Jane Doe
Bob Wilson
Alice Johnson
Charlie Brown`;

      const result = await gameService.processLadder(input);

      // Verify players
      expect(result.players).toHaveLength(5);
      expect(result.players[0].name).toBe('John Smith');
      expect(result.players[4].name).toBe('Charlie Brown');

      // Verify HTML output
      expect(result.html).toContain('DUPR Ladder');
      expect(result.html).toContain('John Smith');
      expect(result.html).toContain('4.5');
      expect(result.html).toContain('Charlie Brown');
      expect(result.html).toContain('3.2');

      // Verify no teams for ladder format
      expect(result.teams).toBeUndefined();
    });
  });

  describe('Full Flow - Partner DUPR', () => {
    it('should process realistic partner input with team calculations', async () => {
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
          searchMethod: 'lastname_alberta',
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
          searchMethod: 'exact_canada',
          location: 'Canada',
        },
      ];

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      const input = `John Smith / Jane Doe
Bob Wilson / Alice Johnson`;

      const result = await gameService.processPartner(input);

      // Verify teams
      expect(result.teams).toHaveLength(2);
      expect(result.teams![0].player1.name).toBe('John Smith');
      expect(result.teams![0].player2.name).toBe('Jane Doe');
      expect(result.teams![0].teamRating).toBe(4.045); // 0.35 * 4.5 + 0.65 * 3.8

      expect(result.teams![1].player1.name).toBe('Bob Wilson');
      expect(result.teams![1].player2.name).toBe('Alice Johnson');
      expect(result.teams![1].teamRating).toBe(3.745); // 0.35 * 4.2 + 0.65 * 3.5

      // Verify HTML output
      expect(result.html).toContain('Partner DUPR');
      expect(result.html).toContain('John Smith');
      expect(result.html).toContain('Jane Doe');
      expect(result.html).toContain('4.04'); // Formatted to 2 decimal places in HTML
    });
  });

  describe('Full Flow - PickleBros', () => {
    it('should process realistic picklebros input with 8 players', async () => {
      const mockResults = Array.from({ length: 8 }, (_, i) => ({
        name: `Player ${i + 1}`,
        rating: 4.5 - i * 0.2,
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

      // Verify players
      expect(result.players).toHaveLength(8);
      expect(result.players[0].name).toBe('Player 1');
      expect(result.players[7].name).toBe('Player 8');

      // Verify HTML output
      expect(result.html).toContain('PickleBros');
      expect(result.html).toContain('Player 1');
      expect(result.html).toContain('4.5');

      // Verify no teams for picklebros format
      expect(result.teams).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockSearcher.searchPlayers.mockRejectedValue(new Error('Network error'));

      const input = 'John Smith';

      await expect(gameService.processLadder(input)).rejects.toThrow('Network error');
    });

    it('should handle mixed found/not-found players', async () => {
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

      const input = 'John Smith\nUnknown Player';
      const result = await gameService.processLadder(input);

      expect(result.players).toHaveLength(2);
      expect(result.players[0].found).toBe(true);
      expect(result.players[0].rating).toBe(4.5);
      expect(result.players[1].found).toBe(false);
      expect(result.players[1].rating).toBe(3.0);

      // HTML should still generate
      expect(result.html).toContain('John Smith');
      expect(result.html).toContain('Unknown Player');
    });
  });
});
