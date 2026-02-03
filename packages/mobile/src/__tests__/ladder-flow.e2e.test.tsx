import { GameService } from '../services/gameService';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';
import { GameType } from '@dupr/core';

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

describe('Ladder Flow E2E', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useAuthStore.getState().setToken('mock-token');
  });

  it('should process ladder input and return results', async () => {
    const service = new GameService('mock-token');

    // Mock PlayerSearcher.searchPlayers to return mock data
    const mockResults = [
      {
        name: 'John Smith',
        rating: 4.2,
        playerId: 1,
        duprId: '12345',
        duprName: 'John Smith',
        profileUrl: 'https://dupr.com/player/12345',
        found: true,
        searchMethod: 'exact_alberta',
        location: 'Calgary, AB',
      },
      {
        name: 'Jane Doe',
        rating: 3.5,
        playerId: 2,
        duprId: '67890',
        duprName: 'Jane Doe',
        profileUrl: 'https://dupr.com/player/67890',
        found: true,
        searchMethod: 'exact_alberta',
        location: 'Edmonton, AB',
      },
    ];

    mockSearcher.searchPlayers.mockResolvedValue(mockResults);

    const input = 'John Smith\nJane Doe';
    const result = await service.processLadder(input);

    expect(result.players).toHaveLength(2);
    expect(result.players[0].name).toBe('John Smith');
    expect(result.html).toContain('John Smith');
  });

  it('should handle players not found', async () => {
    const service = new GameService('mock-token');

    // Mock PlayerSearcher.searchPlayers to return not found result
    const mockResults = [
      {
        name: 'Unknown Player',
        rating: 3.0, // DEFAULT_RATING
        playerId: null,
        duprId: null,
        duprName: null,
        profileUrl: null,
        found: false,
        searchMethod: 'not_found',
        location: null,
      },
    ];

    mockSearcher.searchPlayers.mockResolvedValue(mockResults);

    const input = 'Unknown Player';
    const result = await service.processLadder(input);

    expect(result.players).toHaveLength(1);
    expect(result.players[0].found).toBe(false);
    expect(result.players[0].rating).toBe(3.0); // DEFAULT_RATING
  });

  it('should handle empty input', async () => {
    const service = new GameService('mock-token');

    await expect(service.processLadder('')).rejects.toThrow();
  });

  it('should update gameStore correctly', async () => {
    useGameStore.getState().setFormat(GameType.DUPR_LADDER);
    useGameStore.getState().setInputText('John Smith\nJane Doe');

    const service = new GameService('mock-token');

    // Mock PlayerSearcher.searchPlayers to return mock data
    const mockResults = [
      {
        name: 'John Smith',
        rating: 4.2,
        playerId: 1,
        duprId: '12345',
        duprName: 'John Smith',
        profileUrl: 'https://dupr.com/player/12345',
        found: true,
        searchMethod: 'exact_alberta',
        location: 'Calgary, AB',
      },
      {
        name: 'Jane Doe',
        rating: 3.5,
        playerId: 2,
        duprId: '67890',
        duprName: 'Jane Doe',
        profileUrl: 'https://dupr.com/player/67890',
        found: true,
        searchMethod: 'exact_alberta',
        location: 'Edmonton, AB',
      },
    ];

    mockSearcher.searchPlayers.mockResolvedValue(mockResults);

    const inputText = useGameStore.getState().inputText;
    const result = await service.processLadder(inputText);

    useGameStore.getState().setResults({
      players: result.players,
    });
    useGameStore.getState().setHtml(result.html);

    expect(useGameStore.getState().results?.players).toHaveLength(2);
    expect(useGameStore.getState().html).toBeTruthy();
  });
});
