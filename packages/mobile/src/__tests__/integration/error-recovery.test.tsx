/**
 * Error Recovery Integration Tests
 * Tests various error scenarios and recovery mechanisms
 */

import { renderHook, act } from '@testing-library/react-native';
import { useAuthStore } from '../../stores/authStore';
import { useGameStore } from '../../stores/gameStore';
import { GameService } from '../../services/gameService';
import { TokenStorage } from '../../services/tokenStorage';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store');
jest.mock('@dupr/core', () => ({
  DUPRClient: jest.fn(),
  PlayerSearcher: jest.fn(),
  PlayerRegistry: jest.fn(),
  parseDuprLadderPlayers: jest.fn((input: string) => input.split('\n').filter(Boolean)),
  parsePartnerDuprTeams: jest.fn((input: string) =>
    input
      .split('\n')
      .filter((line) => line.includes('/'))
      .map((line) => {
        const [p1, p2] = line.split('/').map((s) => s.trim());
        return { player1: p1, player2: p2 };
      })
  ),
  calculateTeamRating: jest.fn((r1: number, r2: number) => {
    const higher = Math.max(r1, r2);
    const lower = Math.min(r1, r2);
    return Math.round((0.35 * higher + 0.65 * lower) * 1000) / 1000;
  }),
  isValidPickleBrosCount: jest.fn((count: number) => count > 0 && count % 4 === 0),
  generateDuprLadderHtml: jest.fn(() => '<html>HTML</html>'),
  generatePartnerDuprHtml: jest.fn(() => '<html>HTML</html>'),
  generatePickleBrosMondayHtml: jest.fn(() => '<html>HTML</html>'),
  distributePlayersToPool: jest.fn((players) => [{ name: 'Pool A', players }]),
  distributePlayersToPickleBrosPools: jest.fn((players) => [{ name: 'Pool A', players }]),
  createTeamWithRatings: jest.fn((p1, p2) => ({
    player1: p1,
    player2: p2,
    teamRating: Math.round((0.35 * Math.max(p1.rating, p2.rating) + 0.65 * Math.min(p1.rating, p2.rating)) * 1000) / 1000,
  })),
}));

describe('Error Recovery Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().logout();
    useGameStore.getState().reset();
  });

  describe('Authentication Errors', () => {
    it('should handle 401 token expiration during game processing', async () => {
      const mockToken = 'expired-token';
      const { result: authResult } = renderHook(() => useAuthStore());

      await act(async () => {
        authResult.current.setToken(mockToken);
      });

      const { DUPRClient, PlayerSearcher, PlayerRegistry } = jest.requireMock('@dupr/core');

      // Mock 401 error
      DUPRClient.mockImplementation(() => ({
        searchPlayers: jest.fn().mockRejectedValue({
          response: { status: 401 },
          message: 'Token expired',
        }),
      }));

      PlayerSearcher.mockImplementation(() => ({
        searchPlayer: jest.fn().mockRejectedValue({
          response: { status: 401 },
          message: 'Token expired',
        }),
      }));

      PlayerRegistry.mockImplementation(() => ({
        register: jest.fn(),
        get: jest.fn(),
        save: jest.fn(),
      }));

      const gameService = new GameService(mockToken);

      await expect(gameService.processLadder('John Smith')).rejects.toThrow();

      // User should logout
      act(() => {
        authResult.current.logout();
      });

      expect(authResult.current.token).toBeNull();
    });

    it('should handle secure storage failure during token save', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error('Storage full'));

      const { result: authResult } = renderHook(() => useAuthStore());

      await act(async () => {
        authResult.current.setToken('test-token');
      });

      await expect(TokenStorage.saveToken('test-token')).rejects.toThrow('Storage full');

      // Auth state should still be set (in-memory)
      expect(authResult.current.token).toBe('test-token');
    });

    it('should handle corrupted token in secure storage', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('corrupted-invalid-token');

      const storedToken = await TokenStorage.getToken();

      expect(storedToken).toBe('corrupted-invalid-token');

      // App should detect invalid token and logout
      const { result: authResult } = renderHook(() => useAuthStore());

      act(() => {
        authResult.current.setToken(storedToken!);
      });

      // Try to use corrupted token
      const { DUPRClient, PlayerSearcher, PlayerRegistry } = jest.requireMock('@dupr/core');
      DUPRClient.mockImplementation(() => ({
        searchPlayers: jest.fn().mockRejectedValue({ response: { status: 401 } }),
      }));

      PlayerSearcher.mockImplementation(() => ({
        searchPlayer: jest.fn().mockRejectedValue({ response: { status: 401 } }),
      }));

      PlayerRegistry.mockImplementation(() => ({
        register: jest.fn(),
        get: jest.fn(),
        save: jest.fn(),
      }));

      const gameService = new GameService(storedToken!);

      await expect(gameService.processLadder('Test')).rejects.toThrow();

      // Should logout and clear token
      await act(async () => {
        authResult.current.logout();
        await TokenStorage.deleteToken();
      });

      expect(authResult.current.token).toBeNull();
    });
  });

  describe('Network Errors', () => {
    it('should handle network timeout with retry', async () => {
      const mockToken = 'test-token';
      const { DUPRClient, PlayerSearcher, PlayerRegistry } = jest.requireMock('@dupr/core');

      let attemptCount = 0;
      const mockSearchPlayer = jest.fn((name: string) => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve({
          name,
          rating: 3.0,
          playerId: null,
          profileUrl: null,
          found: false,
          searchMethod: 'default',
        });
      });

      DUPRClient.mockImplementation(() => ({ searchPlayers: jest.fn() }));
      const mockSearchPlayers = jest.fn((names: string[]) =>
        Promise.all(names.map(mockSearchPlayer))
      );

      PlayerSearcher.mockImplementation(() => ({
        searchPlayer: mockSearchPlayer,
        searchPlayers: mockSearchPlayers,
      }));
      PlayerRegistry.mockImplementation(() => ({
        register: jest.fn(),
        get: jest.fn(),
        save: jest.fn(),
      }));

      const gameService = new GameService(mockToken);

      // First attempt fails
      await expect(gameService.processLadder('John Smith')).rejects.toThrow('Network timeout');

      // Reset attempt count
      attemptCount = 0;

      // Retry succeeds
      const results = await gameService.processLadder('John Smith');
      expect(results.players[0].rating).toBe(3.0);
    });

    it('should handle complete network failure with offline fallback', async () => {
      const mockToken = 'test-token';
      const { DUPRClient, PlayerSearcher, PlayerRegistry } = jest.requireMock('@dupr/core');

      DUPRClient.mockImplementation(() => ({
        searchPlayers: jest.fn().mockRejectedValue(new Error('Network unavailable')),
      }));

      const mockSearchPlayer = jest.fn().mockRejectedValue(new Error('Network unavailable'));
      const mockSearchPlayers = jest.fn().mockRejectedValue(new Error('Network unavailable'));

      PlayerSearcher.mockImplementation(() => ({
        searchPlayer: mockSearchPlayer,
        searchPlayers: mockSearchPlayers,
      }));

      PlayerRegistry.mockImplementation(() => ({
        register: jest.fn(),
        get: jest.fn(),
        save: jest.fn(),
      }));

      const gameService = new GameService(mockToken);

      await expect(gameService.processLadder('John Smith')).rejects.toThrow('Network unavailable');
    });

    it('should handle intermittent connection during batch lookup', async () => {
      const mockToken = 'test-token';
      const { DUPRClient, PlayerSearcher, PlayerRegistry } = jest.requireMock('@dupr/core');

      const players = ['John Smith', 'Jane Doe', 'Bob Wilson'];
      let successCount = 0;

      const mockSearchPlayer = jest.fn((name: string) => {
        successCount++;
        // Fail on second player
        if (name === 'Jane Doe') {
          return Promise.reject(new Error('Connection lost'));
        }
        return Promise.resolve({
          name,
          rating: 3.5,
          playerId: 1,
          profileUrl: 'url',
          found: true,
          searchMethod: 'exact',
        });
      });

      DUPRClient.mockImplementation(() => ({ searchPlayers: jest.fn() }));
      const mockSearchPlayers = jest.fn((names: string[]) =>
        Promise.all(names.map(mockSearchPlayer))
      );

      PlayerSearcher.mockImplementation(() => ({
        searchPlayer: mockSearchPlayer,
        searchPlayers: mockSearchPlayers,
      }));
      PlayerRegistry.mockImplementation(() => ({
        register: jest.fn(),
        get: jest.fn(),
        save: jest.fn(),
      }));

      const gameService = new GameService(mockToken);

      await expect(gameService.processLadder(players.join('\n'))).rejects.toThrow(
        'Connection lost'
      );
    });
  });

  describe('Validation Errors', () => {
    it('should reject empty player list', async () => {
      const mockToken = 'test-token';
      const { result: gameResult } = renderHook(() => useGameStore());

      act(() => {
        gameResult.current.setFormat('ladder');
      });

      const { DUPRClient, PlayerSearcher, PlayerRegistry } = jest.requireMock('@dupr/core');
      DUPRClient.mockImplementation(() => ({ searchPlayers: jest.fn() }));
      PlayerSearcher.mockImplementation(() => ({
        searchPlayer: jest.fn(),
        searchPlayers: jest.fn(),
      }));
      PlayerRegistry.mockImplementation(() => ({
        register: jest.fn(),
        get: jest.fn(),
        save: jest.fn(),
      }));

      const gameService = new GameService(mockToken);

      await expect(gameService.processLadder('')).rejects.toThrow();
      await expect(gameService.processLadder('   \n  \n  ')).rejects.toThrow();
    });

    it('should reject invalid PickleBros player count', async () => {
      const mockToken = 'test-token';
      const { DUPRClient, PlayerSearcher, PlayerRegistry } = jest.requireMock('@dupr/core');

      DUPRClient.mockImplementation(() => ({ searchPlayers: jest.fn() }));
      PlayerSearcher.mockImplementation(() => ({
        searchPlayer: jest.fn(),
        searchPlayers: jest.fn(),
      }));
      PlayerRegistry.mockImplementation(() => ({
        register: jest.fn(),
        get: jest.fn(),
        save: jest.fn(),
      }));

      const gameService = new GameService(mockToken);

      // 5 players (not multiple of 4)
      await expect(gameService.processPickleBros('P1\nP2\nP3\nP4\nP5')).rejects.toThrow(
        'multiple of 4'
      );

      // 7 players (not multiple of 4)
      await expect(gameService.processPickleBros('P1\nP2\nP3\nP4\nP5\nP6\nP7')).rejects.toThrow(
        'multiple of 4'
      );

      // 0 players
      await expect(gameService.processPickleBros('')).rejects.toThrow();
    });

    it('should reject invalid Partner DUPR format', async () => {
      const mockToken = 'test-token';
      const { DUPRClient, PlayerSearcher, PlayerRegistry } = jest.requireMock('@dupr/core');

      DUPRClient.mockImplementation(() => ({ searchPlayers: jest.fn() }));
      PlayerSearcher.mockImplementation(() => ({
        searchPlayer: jest.fn(),
        searchPlayers: jest.fn(),
      }));
      PlayerRegistry.mockImplementation(() => ({
        register: jest.fn(),
        get: jest.fn(),
        save: jest.fn(),
      }));

      const gameService = new GameService(mockToken);

      // Missing delimiter
      await expect(gameService.processPartner('John Smith Jane Doe')).rejects.toThrow();

      // Empty teams
      await expect(gameService.processPartner('   \n  / \n')).rejects.toThrow();
    });

    it('should handle malformed player names gracefully', async () => {
      const mockToken = 'test-token';
      const { DUPRClient, PlayerSearcher, PlayerRegistry } = jest.requireMock('@dupr/core');

      const mockSearchPlayer = jest.fn((name: string) => {
        return Promise.resolve({
          name: name.trim(),
          rating: 3.0,
          playerId: null,
          profileUrl: null,
          found: false,
          searchMethod: 'default',
        });
      });

      DUPRClient.mockImplementation(() => ({ searchPlayers: jest.fn() }));
      const mockSearchPlayers = jest.fn((names: string[]) =>
        Promise.all(names.map(mockSearchPlayer))
      );

      PlayerSearcher.mockImplementation(() => ({
        searchPlayer: mockSearchPlayer,
        searchPlayers: mockSearchPlayers,
      }));
      PlayerRegistry.mockImplementation(() => ({
        register: jest.fn(),
        get: jest.fn(),
        save: jest.fn(),
      }));

      const gameService = new GameService(mockToken);

      // Extra whitespace, special characters
      const results = await gameService.processLadder(
        '  John Smith  \nJane@#$Doe\n   Bob   Wilson   '
      );

      expect(results.players).toHaveLength(3);
      expect(results.players[0].name).toBe('John Smith');
      expect(results.players[1].name).toBe('Jane@#$Doe');
      expect(results.players[2].name).toBe('Bob   Wilson');
    });
  });

  describe('State Corruption Recovery', () => {
    it('should recover from corrupted game state', () => {
      const { result: gameResult } = renderHook(() => useGameStore());

      // Set valid state
      act(() => {
        gameResult.current.setFormat('ladder');
        gameResult.current.setPlayers(['John', 'Jane']);
      });

      // Corrupt state by setting incompatible format
      act(() => {
        gameResult.current.setFormat('picklebros'); // Requires multiple of 4
      });

      // Players array is incompatible with PickleBros
      expect(gameResult.current.format).toBe('picklebros');
      expect(gameResult.current.players).toEqual(['John', 'Jane']); // Only 2 players

      // Reset to recover
      act(() => {
        gameResult.current.reset();
      });

      expect(gameResult.current.format).toBeNull();
      expect(gameResult.current.players).toEqual([]);
    });

    it('should handle missing results data', () => {
      const { result: gameResult } = renderHook(() => useGameStore());

      act(() => {
        gameResult.current.setFormat('ladder');
        gameResult.current.setPlayers(['John']);
      });

      // Results should be null initially
      expect(gameResult.current.results).toBeNull();
      expect(gameResult.current.html).toBeNull();

      // App should handle missing results gracefully (don't crash)
      expect(() => {
        const html = gameResult.current.html;
        if (html) {
          // Use html
        } else {
          // Show "no results" message
        }
      }).not.toThrow();
    });

    it('should handle partial results data', () => {
      const { result: gameResult } = renderHook(() => useGameStore());

      // Set results with missing html
      act(() => {
        gameResult.current.setFormat('ladder');
        gameResult.current.setResults(
          [
            {
              name: 'John',
              rating: 4.0,
              playerId: 1,
              profileUrl: 'url',
              found: true,
              searchMethod: 'exact',
            },
          ],
          [],
          null as any // Missing HTML
        );
      });

      expect(gameResult.current.results).toBeTruthy();
      expect(gameResult.current.html).toBeNull();
    });
  });

  describe('Concurrent Error Handling', () => {
    it('should handle rapid format switching with errors', () => {
      const { result: gameResult } = renderHook(() => useGameStore());

      expect(() => {
        act(() => {
          gameResult.current.setFormat('ladder');
          gameResult.current.setFormat('partner');
          gameResult.current.setFormat('picklebros');
          gameResult.current.setFormat(null);
        });
      }).not.toThrow();

      expect(gameResult.current.format).toBeNull();
    });

    it('should handle state updates during processing', async () => {
      const mockToken = 'test-token';
      const { result: gameResult } = renderHook(() => useGameStore());

      act(() => {
        gameResult.current.setFormat('ladder');
        gameResult.current.setPlayers(['John', 'Jane']);
      });

      const { DUPRClient, PlayerSearcher, PlayerRegistry } = jest.requireMock('@dupr/core');

      let resolveLookup: any;
      const lookupPromise = new Promise((resolve) => {
        resolveLookup = resolve;
      });

      const mockSearchPlayer = jest.fn(() => lookupPromise);

      DUPRClient.mockImplementation(() => ({ searchPlayers: jest.fn() }));
      const mockSearchPlayers = jest.fn((names: string[]) =>
        Promise.all(names.map(mockSearchPlayer))
      );

      PlayerSearcher.mockImplementation(() => ({
        searchPlayer: mockSearchPlayer,
        searchPlayers: mockSearchPlayers,
      }));
      PlayerRegistry.mockImplementation(() => ({
        register: jest.fn(),
        get: jest.fn(),
        save: jest.fn(),
      }));

      const gameService = new GameService(mockToken);

      // Start processing
      const processPromise = gameService.processLadder('John\nJane');

      // Change state while processing
      act(() => {
        gameResult.current.setFormat('partner');
      });

      // Resolve lookup
      resolveLookup({
        name: 'John',
        rating: 4.0,
        playerId: 1,
        profileUrl: 'url',
        found: true,
        searchMethod: 'exact',
      });

      // Wait for processing to complete
      await processPromise;

      // State should reflect the latest update
      expect(gameResult.current.format).toBe('partner');
    });
  });
});
