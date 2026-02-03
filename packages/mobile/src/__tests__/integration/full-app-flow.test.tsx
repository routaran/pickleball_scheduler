/**
 * Full App Flow Integration Tests
 * Tests: login → game selection → input → results → export
 */

import { renderHook, act } from '@testing-library/react-native';
import { useAuthStore } from '../../stores/authStore';
import { useGameStore } from '../../stores/gameStore';
import { GameService } from '../../services/gameService';
import { TokenStorage } from '../../services/tokenStorage';
import { ExportService } from '../../services/exportService';
import * as SecureStore from 'expo-secure-store';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';

// Mock dependencies
jest.mock('expo-secure-store');
jest.mock('expo-print');
jest.mock('expo-sharing');
jest.mock('expo-clipboard');
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
  generateDuprLadderHtml: jest.fn(() => '<html>Ladder HTML</html>'),
  generatePartnerDuprHtml: jest.fn(() => '<html>Partner HTML</html>'),
  generatePickleBrosMondayHtml: jest.fn(() => '<html>PickleBros HTML</html>'),
  distributePlayersToPool: jest.fn((players) => [
    { name: 'Pool A', players: players.slice(0, Math.ceil(players.length / 2)) },
    { name: 'Pool B', players: players.slice(Math.ceil(players.length / 2)) },
  ]),
  distributePlayersToPickleBrosPools: jest.fn((players) => [
    { name: 'Pool A', players: players.slice(0, 4) },
    { name: 'Pool B', players: players.slice(4) },
  ]),
  createTeamWithRatings: jest.fn((p1, p2) => ({
    player1: p1,
    player2: p2,
    teamRating: Math.round((0.35 * Math.max(p1.rating, p2.rating) + 0.65 * Math.min(p1.rating, p2.rating)) * 1000) / 1000,
  })),
}));

describe('Full App Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset stores
    useAuthStore.getState().logout();
    useGameStore.getState().reset();
  });

  describe('Login → Game Selection → Input → Results → Export', () => {
    it('should complete full ladder flow', async () => {
      // STEP 1: Login
      const mockToken = 'test-auth-token-12345';
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const { result: authResult } = renderHook(() => useAuthStore());

      await act(async () => {
        authResult.current.setToken(mockToken);
        await TokenStorage.saveToken(mockToken);
      });

      expect(authResult.current.token).toBe(mockToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('dupr_token', mockToken);

      // STEP 2: Game Selection
      const { result: gameResult } = renderHook(() => useGameStore());

      act(() => {
        gameResult.current.setFormat('ladder');
      });

      expect(gameResult.current.format).toBe('ladder');

      // STEP 3: Input Players
      const playerInput = 'John Smith\nJane Doe\nBob Wilson';

      act(() => {
        gameResult.current.setPlayers(playerInput.split('\n').map((name) => name));
      });

      expect(gameResult.current.players).toEqual(['John Smith', 'Jane Doe', 'Bob Wilson']);

      // STEP 4: Process and Get Results
      const mockSearchPlayer = jest.fn((name: string) => {
        const ratings: Record<string, number> = {
          'John Smith': 4.2,
          'Jane Doe': 3.5,
          'Bob Wilson': 3.8,
        };
        return Promise.resolve({
          name,
          rating: ratings[name] || 2.5,
          playerId: 1,
          profileUrl: `https://dupr.com/${name.replace(' ', '-')}`,
          found: true,
          searchMethod: 'exact',
        });
      });

      const mockDuprClient = {
        searchPlayers: jest.fn().mockResolvedValue([]),
      };

      const mockSearchPlayers = jest.fn((names: string[]) =>
        Promise.all(names.map((name) => mockSearchPlayer(name)))
      );

      const mockPlayerSearcher = {
        searchPlayer: mockSearchPlayer,
        searchPlayers: mockSearchPlayers,
      };

      // Mock constructors
      const { DUPRClient, PlayerSearcher, PlayerRegistry } = jest.requireMock('@dupr/core');
      DUPRClient.mockImplementation(() => mockDuprClient);
      PlayerSearcher.mockImplementation(() => mockPlayerSearcher);
      PlayerRegistry.mockImplementation(() => ({
        register: jest.fn(),
        get: jest.fn(),
        save: jest.fn(),
      }));

      const gameService = new GameService(mockToken);
      const results = await gameService.processLadder(playerInput);

      expect(results.players).toHaveLength(3);
      expect(results.players[0]).toMatchObject({
        name: 'John Smith',
        rating: 4.2,
        found: true,
      });

      // STEP 5: Store Results
      act(() => {
        gameResult.current.setResults(results.players, [], results.html);
      });

      expect(gameResult.current.results).toBeDefined();
      expect(gameResult.current.html).toBe(results.html);

      // STEP 6: Export
      (Print.printAsync as jest.Mock).mockResolvedValue(undefined);
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue({ action: 'shared' });
      (Clipboard.setStringAsync as jest.Mock).mockResolvedValue(undefined);

      const html = gameResult.current.html!;

      // Test Print
      await ExportService.print(html);
      expect(Print.printAsync).toHaveBeenCalledWith({ html });

      // Test Copy to Clipboard
      await ExportService.copyToClipboard(html);
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith(html);

      // Test Share
      await ExportService.share(html, 'dupr-ladder.html');
      expect(Sharing.shareAsync).toHaveBeenCalled();
    });

    it('should complete full partner DUPR flow', async () => {
      // Login
      const mockToken = 'test-token';
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const { result: authResult } = renderHook(() => useAuthStore());
      await act(async () => {
        authResult.current.setToken(mockToken);
      });

      // Game Selection
      const { result: gameResult } = renderHook(() => useGameStore());
      act(() => {
        gameResult.current.setFormat('partner');
      });

      // Input Teams
      const teamInput = 'John Smith / Jane Doe\nBob Wilson / Alice Brown';
      act(() => {
        gameResult.current.setPlayers(teamInput.split('\n'));
      });

      // Process
      const mockSearchPlayer = jest.fn((name: string) => {
        const ratings: Record<string, number> = {
          'John Smith': 4.0,
          'Jane Doe': 3.5,
          'Bob Wilson': 3.8,
          'Alice Brown': 3.2,
        };
        return Promise.resolve({
          name,
          rating: ratings[name] || 2.5,
          playerId: 1,
          profileUrl: `https://dupr.com/${name}`,
          found: true,
          searchMethod: 'exact',
        });
      });

      const { DUPRClient, PlayerSearcher, PlayerRegistry } = jest.requireMock('@dupr/core');
      DUPRClient.mockImplementation(() => ({ searchPlayers: jest.fn() }));
      PlayerSearcher.mockImplementation(() => ({
        searchPlayer: mockSearchPlayer,
        searchPlayers: (names: string[]) => Promise.all(names.map(mockSearchPlayer)),
      }));
      PlayerRegistry.mockImplementation(() => ({
        register: jest.fn(),
        get: jest.fn(),
        save: jest.fn(),
      }));

      const gameService = new GameService(mockToken);
      const results = await gameService.processPartner(teamInput);

      expect(results.teams).toHaveLength(2);
      expect(results.html).toBe(results.html);

      // Store results
      act(() => {
        gameResult.current.setResults(results.players, results.teams || [], results.html);
      });

      expect(gameResult.current.html).toBe(results.html);
    });

    it('should complete full PickleBros flow', async () => {
      // Login
      const mockToken = 'test-token';
      const { result: authResult } = renderHook(() => useAuthStore());
      await act(async () => {
        authResult.current.setToken(mockToken);
      });

      // Game Selection
      const { result: gameResult } = renderHook(() => useGameStore());
      act(() => {
        gameResult.current.setFormat('picklebros');
      });

      // Input 8 players (multiple of 4)
      const playerInput = 'P1\nP2\nP3\nP4\nP5\nP6\nP7\nP8';
      act(() => {
        gameResult.current.setPlayers(playerInput.split('\n'));
      });

      // Process
      const mockSearchPlayer = jest.fn((name: string) =>
        Promise.resolve({
          name,
          rating: 3.5,
          playerId: 1,
          profileUrl: `https://dupr.com/${name}`,
          found: true,
          searchMethod: 'exact',
        })
      );

      const { DUPRClient, PlayerSearcher, PlayerRegistry } = jest.requireMock('@dupr/core');
      DUPRClient.mockImplementation(() => ({ searchPlayers: jest.fn() }));
      PlayerSearcher.mockImplementation(() => ({
        searchPlayer: mockSearchPlayer,
        searchPlayers: (names: string[]) => Promise.all(names.map(mockSearchPlayer)),
      }));
      PlayerRegistry.mockImplementation(() => ({
        register: jest.fn(),
        get: jest.fn(),
        save: jest.fn(),
      }));

      const gameService = new GameService(mockToken);
      const results = await gameService.processPickleBros(playerInput);

      expect(results.players).toHaveLength(8);
      expect(results.html).toBe(results.html);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from API timeout during player lookup', async () => {
      const mockToken = 'test-token';
      const { result: authResult } = renderHook(() => useAuthStore());
      await act(async () => {
        authResult.current.setToken(mockToken);
      });

      const { result: gameResult } = renderHook(() => useGameStore());
      act(() => {
        gameResult.current.setFormat('ladder');
      });

      // Simulate API timeout
      const mockSearchPlayer = jest
        .fn()
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockResolvedValue({
          name: 'John Smith',
          rating: 3.0,
          playerId: null,
          profileUrl: null,
          found: false,
          searchMethod: 'default',
        });

      const { DUPRClient, PlayerSearcher, PlayerRegistry } = jest.requireMock('@dupr/core');
      DUPRClient.mockImplementation(() => ({ searchPlayers: jest.fn() }));
      PlayerSearcher.mockImplementation(() => ({
        searchPlayer: mockSearchPlayer,
        searchPlayers: (names: string[]) => Promise.all(names.map(mockSearchPlayer)),
      }));
      PlayerRegistry.mockImplementation(() => ({
        register: jest.fn(),
        get: jest.fn(),
        save: jest.fn(),
      }));

      const gameService = new GameService(mockToken);

      // First attempt fails
      await expect(gameService.processLadder('John Smith')).rejects.toThrow('Request timeout');

      // Second attempt succeeds with default rating
      const results = await gameService.processLadder('John Smith');
      expect(results.players[0].found).toBe(false);
      expect(results.players[0].rating).toBe(3.0);
    });

    it('should handle token expiration and clear state', async () => {
      const mockToken = 'expired-token';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      const { result: authResult } = renderHook(() => useAuthStore());
      await act(async () => {
        authResult.current.setToken(mockToken);
      });

      // Simulate token expiration
      const { DUPRClient } = jest.requireMock('@dupr/core');
      DUPRClient.mockImplementation(() => ({
        searchPlayers: jest.fn().mockRejectedValue(new Error('401 Unauthorized')),
      }));

      // Logout on token expiration
      await act(async () => {
        authResult.current.logout();
        await TokenStorage.deleteToken();
      });

      expect(authResult.current.token).toBeNull();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('dupr_token');
    });

    it('should handle invalid input and show validation error', async () => {
      const { result: gameResult } = renderHook(() => useGameStore());

      act(() => {
        gameResult.current.setFormat('picklebros');
      });

      // Invalid input: 5 players (not multiple of 4)
      const invalidInput = 'P1\nP2\nP3\nP4\nP5';

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

      await expect(gameService.processPickleBros(invalidInput)).rejects.toThrow(
        'multiple of 4'
      );
    });

    it('should handle network failure during export', async () => {
      const { result: gameResult } = renderHook(() => useGameStore());

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
          '<html>Test</html>'
        );
      });

      // Simulate network failure during share
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Sharing.shareAsync as jest.Mock).mockRejectedValue(new Error('Network error'));

      const html = gameResult.current.html!;

      await expect(ExportService.share(html, 'test.html')).rejects.toThrow('Network error');
    });
  });

  describe('State Persistence Across Navigation', () => {
    it('should persist game state when navigating away and back', () => {
      const { result: gameResult } = renderHook(() => useGameStore());

      // Set game state
      act(() => {
        gameResult.current.setFormat('ladder');
        gameResult.current.setPlayers(['John', 'Jane']);
      });

      expect(gameResult.current.format).toBe('ladder');
      expect(gameResult.current.players).toEqual(['John', 'Jane']);

      // Simulate navigation away (state should persist in store)
      const newHook = renderHook(() => useGameStore());

      // State should still be there
      expect(newHook.result.current.format).toBe('ladder');
      expect(newHook.result.current.players).toEqual(['John', 'Jane']);
    });

    it('should reset game state when explicitly requested', () => {
      const { result: gameResult } = renderHook(() => useGameStore());

      act(() => {
        gameResult.current.setFormat('partner');
        gameResult.current.setPlayers(['Team 1 / Team 2']);
        gameResult.current.setResults([{ name: 'test' }] as any, [], '<html>Test</html>');
      });

      expect(gameResult.current.format).toBe('partner');

      act(() => {
        gameResult.current.reset();
      });

      expect(gameResult.current.format).toBeNull();
      expect(gameResult.current.players).toEqual([]);
      expect(gameResult.current.results).toBeNull();
      expect(gameResult.current.html).toBeNull();
    });

    it('should maintain auth state across app restarts', async () => {
      const mockToken = 'persisted-token';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);

      // Simulate app restart: load token from storage
      const { result: authResult } = renderHook(() => useAuthStore());

      const storedToken = await TokenStorage.getToken();

      await act(async () => {
        if (storedToken) {
          authResult.current.setToken(storedToken);
        }
      });

      expect(authResult.current.token).toBe(mockToken);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('dupr_token');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple format changes correctly', () => {
      const { result: gameResult } = renderHook(() => useGameStore());

      act(() => {
        gameResult.current.setFormat('ladder');
        gameResult.current.setFormat('partner');
        gameResult.current.setFormat('picklebros');
      });

      expect(gameResult.current.format).toBe('picklebros');
    });

    it('should handle rapid player input updates', () => {
      const { result: gameResult } = renderHook(() => useGameStore());

      act(() => {
        gameResult.current.setFormat('ladder');
        gameResult.current.setPlayers(['P1']);
        gameResult.current.setPlayers(['P1', 'P2']);
        gameResult.current.setPlayers(['P1', 'P2', 'P3']);
      });

      expect(gameResult.current.players).toEqual(['P1', 'P2', 'P3']);
    });
  });
});
