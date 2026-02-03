/**
 * PickleBros Monday Parity Tests
 * Tests GameService.processPickleBros against Phase 0 fixtures
 * Verifies fixed 4-player pools and player count validation
 */

import { GameService } from '../services/gameService';
import { isValidPickleBrosCount, distributePlayersToPool } from '@dupr/core';

// Load fixtures
import picklebros8Players from '../../../core/tests/fixtures/picklebros_8players.json';
import picklebros12Players from '../../../core/tests/fixtures/picklebros_12players.json';
import picklebrosNotFound from '../../../core/tests/fixtures/picklebros_not_found.json';
import picklebrosEdgeCases from '../../../core/tests/fixtures/picklebros_edge_cases.json';

// Mock overrideStorage
jest.mock('../services/overrideStorage', () => ({
  getOverrides: jest.fn().mockResolvedValue([]),
  saveOverride: jest.fn(),
  deleteOverride: jest.fn(),
  clearOverrides: jest.fn(),
}));

// Create a mock searcher instance
const mockSearcher = {
  searchPlayers: jest.fn().mockResolvedValue([]),
  searchPlayer: jest.fn(),
};

// Mock the DUPRClient
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

describe('PickleBros Monday Parity Tests', () => {
  describe('picklebros_8players.json - 2-pool fixture', () => {
    it('should distribute 8 players into 2 pools of 4', async () => {
      const service = new GameService('mock-token');
      const fixture = picklebros8Players as any;

      // Mock the searcher to return fixture data
      const mockResults = [];
      for (const pool of fixture.pools) {
        for (const player of pool.players) {
          mockResults.push({
            name: player.name,
            rating: player.rating,
            playerId: null,
            duprId: player.dupr_id,
            duprName: player.dupr_name,
            profileUrl: player.profile_url,
            found: player.found,
            searchMethod: player.search_method,
            location: player.location,
          });
        }
      }

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      // Process input
      const input = fixture.input.join('\n');
      const result = await service.processPickleBros(input);

      // Verify player count
      expect(result.players).toHaveLength(8);

      // Verify all players are sorted by rating descending
      const sortedPlayers = [...result.players].sort((a, b) => b.rating - a.rating);
      for (let i = 0; i < result.players.length; i++) {
        expect(result.players[i].rating).toBe(sortedPlayers[i].rating);
      }

      // Verify pools
      const pools = distributePlayersToPool(result.players, 4, 4);
      expect(pools).toHaveLength(2);

      // Pool A should have top 4 players
      expect(pools[0].name).toBe('A');
      expect(pools[0].players).toHaveLength(4);
      expect(pools[0].players[0].name).toBe('Marcus Chen');
      expect(pools[0].players[0].rating).toBe(4.52);

      // Pool B should have bottom 4 players
      expect(pools[1].name).toBe('B');
      expect(pools[1].players).toHaveLength(4);
      expect(pools[1].players[0].name).toBe('Michael Brown');
      expect(pools[1].players[0].rating).toBe(3.75);

      // Verify HTML generation
      expect(result.html).toBeTruthy();
      expect(result.html).toContain('PickleBros');
    });

    it('should validate player count is multiple of 4', () => {
      expect(isValidPickleBrosCount(4)).toBe(true);
      expect(isValidPickleBrosCount(8)).toBe(true);
      expect(isValidPickleBrosCount(12)).toBe(true);
      expect(isValidPickleBrosCount(16)).toBe(true);

      expect(isValidPickleBrosCount(0)).toBe(false);
      expect(isValidPickleBrosCount(1)).toBe(false);
      expect(isValidPickleBrosCount(3)).toBe(false);
      expect(isValidPickleBrosCount(5)).toBe(false);
      expect(isValidPickleBrosCount(7)).toBe(false);
      expect(isValidPickleBrosCount(9)).toBe(false);
    });
  });

  describe('picklebros_12players.json - 3-pool fixture', () => {
    it('should distribute 12 players into 3 pools of 4', async () => {
      const service = new GameService('mock-token');
      const fixture = picklebros12Players as any;

      // Mock the searcher to return fixture data
      const mockResults = [];
      for (const pool of fixture.pools) {
        for (const player of pool.players) {
          mockResults.push({
            name: player.name,
            rating: player.rating,
            playerId: null,
            duprId: player.dupr_id,
            duprName: player.dupr_name,
            profileUrl: player.profile_url,
            found: player.found,
            searchMethod: player.search_method,
            location: player.location,
          });
        }
      }

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      // Process input
      const input = fixture.input.join('\n');
      const result = await service.processPickleBros(input);

      // Verify player count
      expect(result.players).toHaveLength(12);

      // Verify pools
      const pools = distributePlayersToPool(result.players, 4, 4);
      expect(pools).toHaveLength(3);

      // Pool A: top 4
      expect(pools[0].name).toBe('A');
      expect(pools[0].players).toHaveLength(4);
      expect(pools[0].players[0].rating).toBe(4.85); // Alex Thompson

      // Pool B: middle 4
      expect(pools[1].name).toBe('B');
      expect(pools[1].players).toHaveLength(4);
      expect(pools[1].players[0].rating).toBe(4.05); // Jason Lee

      // Pool C: bottom 4
      expect(pools[2].name).toBe('C');
      expect(pools[2].players).toHaveLength(4);
      expect(pools[2].players[0].rating).toBe(3.42); // Kevin Wright
    });

    it('should verify pool naming (A, B, C)', () => {
      const mockPlayers = Array.from({ length: 12 }, (_, i) => ({
        name: `Player ${i + 1}`,
        rating: 4.0 - i * 0.1,
        profileUrl: null,
        found: true,
        searchMethod: 'mock',
      }));

      const pools = distributePlayersToPool(mockPlayers, 4, 4);
      expect(pools).toHaveLength(3);
      expect(pools[0].name).toBe('A');
      expect(pools[1].name).toBe('B');
      expect(pools[2].name).toBe('C');
    });
  });

  describe('picklebros_not_found.json - Players not found fixture', () => {
    it('should handle players not found with default rating 3.0', async () => {
      const service = new GameService('mock-token');
      const fixture = picklebrosNotFound as any;

      // Mock the searcher to return fixture data
      const mockResults = [];
      for (const pool of fixture.pools) {
        for (const player of pool.players) {
          mockResults.push({
            name: player.name,
            rating: player.rating,
            playerId: null,
            duprId: player.dupr_id,
            duprName: player.dupr_name,
            profileUrl: player.profile_url,
            found: player.found,
            searchMethod: player.search_method,
            location: player.location,
          });
        }
      }

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      // Process input
      const input = fixture.input.join('\n');
      const result = await service.processPickleBros(input);

      // Verify player count
      expect(result.players).toHaveLength(8);

      // Count found vs not found
      const foundPlayers = result.players.filter((p) => p.found);
      const notFoundPlayers = result.players.filter((p) => !p.found);

      expect(foundPlayers).toHaveLength(4);
      expect(notFoundPlayers).toHaveLength(4);

      // All not found players should have default rating 3.0
      for (const player of notFoundPlayers) {
        expect(player.rating).toBe(3.0);
        expect(player.profileUrl).toBeNull();
      }

      // Verify pools
      const pools = distributePlayersToPool(result.players, 4, 4);
      expect(pools).toHaveLength(2);

      // Pool A should have all found players (higher ratings)
      expect(pools[0].players.every((p) => p.found)).toBe(true);

      // Pool B should have all not found players (default 3.0 rating)
      expect(pools[1].players.every((p) => !p.found)).toBe(true);
    });
  });

  describe('picklebros_edge_cases.json - Edge cases fixtures', () => {
    it('should handle minimum 4 players (single pool)', async () => {
      const service = new GameService('mock-token');
      const fixture = picklebrosEdgeCases as any;
      const scenario = fixture.test_scenarios.find((s: any) => s.scenario_name === 'minimum_4_players');

      // Mock the searcher to return fixture data
      const mockResults = scenario.pools[0].players.map((player: any) => ({
        name: player.name,
        rating: player.rating,
        playerId: null,
        duprId: player.dupr_id,
        duprName: player.name,
        profileUrl: `https://dupr.com/player/${player.dupr_id}`,
        found: player.found,
        searchMethod: player.search_method,
        location: 'Mock Location',
      }));

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      // Process input
      const input = scenario.input.join('\n');
      const result = await service.processPickleBros(input);

      // Verify player count
      expect(result.players).toHaveLength(4);

      // Verify single pool
      const pools = distributePlayersToPool(result.players, 4, 4);
      expect(pools).toHaveLength(1);
      expect(pools[0].name).toBe('A');
      expect(pools[0].players).toHaveLength(4);
    });

    it('should handle tied ratings with stable sort', async () => {
      const service = new GameService('mock-token');
      const fixture = picklebrosEdgeCases as any;
      const scenario = fixture.test_scenarios.find((s: any) => s.scenario_name === 'tied_ratings');

      // Mock the searcher to return fixture data
      const mockResults = scenario.pools[0].players.map((player: any) => ({
        name: player.name,
        rating: player.rating,
        playerId: null,
        duprId: player.dupr_id,
        duprName: player.name,
        profileUrl: `https://dupr.com/player/${player.dupr_id}`,
        found: player.found,
        searchMethod: player.search_method,
        location: 'Mock Location',
      }));

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      // Process input
      const input = scenario.input.join('\n');
      const result = await service.processPickleBros(input);

      // All players should have same rating
      expect(result.players.every((p) => p.rating === 3.5)).toBe(true);

      // Verify single pool
      const pools = distributePlayersToPool(result.players, 4, 4);
      expect(pools).toHaveLength(1);
    });

    it('should handle whitespace in player names', async () => {
      const service = new GameService('mock-token');
      const fixture = picklebrosEdgeCases as any;
      const scenario = fixture.test_scenarios.find((s: any) => s.scenario_name === 'whitespace_handling');

      // Mock the searcher to return fixture data
      const mockResults = scenario.pools[0].players.map((player: any) => ({
        name: player.name,
        rating: player.rating,
        playerId: null,
        duprId: player.dupr_id,
        duprName: player.name,
        profileUrl: `https://dupr.com/player/${player.dupr_id}`,
        found: player.found,
        searchMethod: player.search_method,
        location: 'Mock Location',
      }));

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      // Process input with whitespace
      const input = scenario.input.join('\n');
      const result = await service.processPickleBros(input);

      // Verify names are trimmed
      expect(result.players[0].name).toBe('Padded Name Front');
      expect(result.players[1].name).toBe('Normal Name');
      expect(result.players[2].name).toBe('Leading Only');
      expect(result.players[3].name).toBe('Trailing Only');
    });

    it('should handle special characters in names', async () => {
      const service = new GameService('mock-token');
      const fixture = picklebrosEdgeCases as any;
      const scenario = fixture.test_scenarios.find(
        (s: any) => s.scenario_name === 'special_characters_in_names'
      );

      // Mock the searcher to return fixture data
      const mockResults = scenario.pools[0].players.map((player: any) => ({
        name: player.name,
        rating: player.rating,
        playerId: null,
        duprId: player.dupr_id,
        duprName: player.dupr_name,
        profileUrl: `https://dupr.com/player/${player.dupr_id}`,
        found: player.found,
        searchMethod: player.search_method,
        location: player.location,
      }));

      mockSearcher.searchPlayers.mockResolvedValue(mockResults);

      // Process input
      const input = scenario.input.join('\n');
      const result = await service.processPickleBros(input);

      // Verify special characters preserved
      expect(result.players.some((p) => p.name === 'Mary-Jane Watson')).toBe(true);
      expect(result.players.some((p) => p.name === "O'Brien Patrick")).toBe(true);
      expect(result.players.some((p) => p.name === 'Jean-Pierre Dupont')).toBe(true);
    });
  });

  describe('Player Count Validation', () => {
    it('should reject player count not multiple of 4', async () => {
      const service = new GameService('mock-token');

      // Test with 5 players (not multiple of 4)
      const input = 'Player 1\nPlayer 2\nPlayer 3\nPlayer 4\nPlayer 5';

      await expect(service.processPickleBros(input)).rejects.toThrow(
        /multiple of 4/i
      );
    });

    it('should reject empty input', async () => {
      const service = new GameService('mock-token');

      await expect(service.processPickleBros('')).rejects.toThrow();
    });

    it('should reject fewer than 4 players', async () => {
      const service = new GameService('mock-token');

      // Test with 3 players
      const input = 'Player 1\nPlayer 2\nPlayer 3';

      await expect(service.processPickleBros(input)).rejects.toThrow(
        /multiple of 4/i
      );
    });

    it('should accept valid multiples of 4', async () => {
      const service = new GameService('mock-token');

      // Mock searcher for valid inputs
      mockSearcher.searchPlayers.mockResolvedValue([
        { name: 'P1', rating: 4.0, playerId: null, duprId: 'P1', duprName: 'P1', profileUrl: null, found: true, searchMethod: 'mock', location: null },
        { name: 'P2', rating: 3.9, playerId: null, duprId: 'P2', duprName: 'P2', profileUrl: null, found: true, searchMethod: 'mock', location: null },
        { name: 'P3', rating: 3.8, playerId: null, duprId: 'P3', duprName: 'P3', profileUrl: null, found: true, searchMethod: 'mock', location: null },
        { name: 'P4', rating: 3.7, playerId: null, duprId: 'P4', duprName: 'P4', profileUrl: null, found: true, searchMethod: 'mock', location: null },
      ]);

      // Should not throw
      const result = await service.processPickleBros('P1\nP2\nP3\nP4');
      expect(result.players).toHaveLength(4);
    });
  });

  describe('Fixed 4-Player Pools', () => {
    it('should always create pools of exactly 4 players', () => {
      // Test with 8 players
      const players8 = Array.from({ length: 8 }, (_, i) => ({
        name: `Player ${i + 1}`,
        rating: 4.0 - i * 0.1,
        profileUrl: null,
        found: true,
        searchMethod: 'mock',
      }));

      const pools8 = distributePlayersToPool(players8, 4, 4);
      expect(pools8).toHaveLength(2);
      pools8.forEach((pool) => {
        expect(pool.players).toHaveLength(4);
      });

      // Test with 12 players
      const players12 = Array.from({ length: 12 }, (_, i) => ({
        name: `Player ${i + 1}`,
        rating: 4.0 - i * 0.1,
        profileUrl: null,
        found: true,
        searchMethod: 'mock',
      }));

      const pools12 = distributePlayersToPool(players12, 4, 4);
      expect(pools12).toHaveLength(3);
      pools12.forEach((pool) => {
        expect(pool.players).toHaveLength(4);
      });

      // Test with 16 players
      const players16 = Array.from({ length: 16 }, (_, i) => ({
        name: `Player ${i + 1}`,
        rating: 4.0 - i * 0.1,
        profileUrl: null,
        found: true,
        searchMethod: 'mock',
      }));

      const pools16 = distributePlayersToPool(players16, 4, 4);
      expect(pools16).toHaveLength(4);
      pools16.forEach((pool) => {
        expect(pool.players).toHaveLength(4);
      });
    });

    it('should distribute players evenly by rating descending', () => {
      const players = [
        { name: 'P1', rating: 5.0, profileUrl: null, found: true, searchMethod: 'mock' },
        { name: 'P2', rating: 4.8, profileUrl: null, found: true, searchMethod: 'mock' },
        { name: 'P3', rating: 4.6, profileUrl: null, found: true, searchMethod: 'mock' },
        { name: 'P4', rating: 4.4, profileUrl: null, found: true, searchMethod: 'mock' },
        { name: 'P5', rating: 4.2, profileUrl: null, found: true, searchMethod: 'mock' },
        { name: 'P6', rating: 4.0, profileUrl: null, found: true, searchMethod: 'mock' },
        { name: 'P7', rating: 3.8, profileUrl: null, found: true, searchMethod: 'mock' },
        { name: 'P8', rating: 3.6, profileUrl: null, found: true, searchMethod: 'mock' },
      ];

      const pools = distributePlayersToPool(players, 4, 4);

      // Pool A: top 4 (5.0, 4.8, 4.6, 4.4)
      expect(pools[0].players[0].rating).toBe(5.0);
      expect(pools[0].players[1].rating).toBe(4.8);
      expect(pools[0].players[2].rating).toBe(4.6);
      expect(pools[0].players[3].rating).toBe(4.4);

      // Pool B: bottom 4 (4.2, 4.0, 3.8, 3.6)
      expect(pools[1].players[0].rating).toBe(4.2);
      expect(pools[1].players[1].rating).toBe(4.0);
      expect(pools[1].players[2].rating).toBe(3.8);
      expect(pools[1].players[3].rating).toBe(3.6);
    });
  });
});
