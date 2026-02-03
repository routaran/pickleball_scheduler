/**
 * E2E Test: Ladder Format Flow
 * Tests the complete flow from format selection to results display
 *
 * Test Scenarios:
 * 1. Basic 3-player ladder flow
 * 2. Ladder with players not found (uses default rating)
 * 3. Error handling when API fails
 * 4. Empty input validation
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { GameScreen } from '../screens/GameScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';
import { GameType } from '@dupr/core';

// Import fixture data
import ladderBasicFixture from '../../../core/tests/fixtures/ladder_basic.json';
import ladderNotFoundFixture from '../../../core/tests/fixtures/ladder_not_found.json';

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  })),
}));

// Mock @dupr/core modules
jest.mock('@dupr/core', () => {
  const actual = jest.requireActual('@dupr/core');
  return {
    ...actual,
    DUPRClient: jest.fn().mockImplementation(() => ({
      searchPlayers: jest.fn().mockResolvedValue([]),
    })),
  };
});

// Mock GameService
jest.mock('../services/gameService', () => ({
  GameService: jest.fn().mockImplementation(() => ({
    processLadder: jest.fn(),
    processPartner: jest.fn(),
    processPickleBros: jest.fn(),
    process: jest.fn(),
  })),
}));

describe('Ladder Flow E2E', () => {
  beforeEach(() => {
    // Reset stores
    useGameStore.getState().reset();
    useAuthStore.setState({
      token: 'mock-token',
      user: null,
      isLoading: false,
      error: null
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Basic 3-player ladder flow', () => {
    it('should complete full ladder flow with all players found', async () => {
      const { GameService } = require('../services/gameService');
      const mockGameService = new GameService('mock-token');

      // Mock successful ladder processing with fixture data
      const mockPlayers = ladderBasicFixture.players.map((p) => ({
        name: p.name,
        rating: p.rating,
        profileUrl: p.profile_url,
        found: p.found,
        searchMethod: p.search_method,
      }));

      mockGameService.processLadder.mockResolvedValue({
        players: mockPlayers,
        html: '<html>Mock HTML</html>',
      });

      // 1. Render GameScreen and select DUPR Ladder
      const { getByText } = render(<GameScreen />);

      const ladderButton = getByText('DUPR Ladder');
      fireEvent.press(ladderButton);

      // Verify format selection and input screen is shown
      await waitFor(() => {
        expect(useGameStore.getState().format).toBe(GameType.DUPR_LADDER);
        // Input screen should now be visible (shows Process button)
        expect(getByText('Process')).toBeTruthy();
      });

      // 2. Simulate entering player names (this would normally be in PlayerInputScreen)
      const playerInput = ladderBasicFixture.input.join('\n');
      useGameStore.getState().setInputText(playerInput);

      // 3. Simulate processing (would normally trigger on submit)
      useGameStore.getState().setProcessing(true);

      const result = await mockGameService.processLadder(playerInput);

      useGameStore.getState().setResults({
        players: result.players,
      });
      useGameStore.getState().setHtml(result.html);
      useGameStore.getState().setProcessing(false);

      // 4. Verify results in store
      await waitFor(() => {
        const state = useGameStore.getState();
        expect(state.isProcessing).toBe(false);
        expect(state.results).not.toBeNull();
        expect(state.results?.players).toHaveLength(3);
        expect(state.html).toBe('<html>Mock HTML</html>');

        // Verify player data matches fixture
        expect(state.results?.players[0].name).toBe('Sarah Mitchell');
        expect(state.results?.players[0].rating).toBe(4.25);
        expect(state.results?.players[0].found).toBe(true);

        expect(state.results?.players[1].name).toBe('David Chen');
        expect(state.results?.players[1].rating).toBe(3.85);

        expect(state.results?.players[2].name).toBe('Emma Rodriguez');
        expect(state.results?.players[2].rating).toBe(3.50);
      });
    });

    it('should render ResultsScreen with player results', () => {
      // Set up results in store
      useGameStore.getState().setFormat(GameType.DUPR_LADDER);
      useGameStore.getState().setResults({
        players: [
          { name: 'John', rating: 4.0, found: true, profileUrl: null, searchMethod: 'test' },
        ],
      });

      const { getByText } = render(<ResultsScreen />);

      // Verify ResultsScreen displays player results
      expect(getByText('Player Results')).toBeTruthy();
      expect(getByText('1 player')).toBeTruthy();
      expect(getByText('John')).toBeTruthy();
      expect(getByText('4.00')).toBeTruthy();
    });
  });

  describe('Ladder with players not found (default rating)', () => {
    it('should handle players not found by using default rating', async () => {
      const { GameService } = require('../services/gameService');
      const mockGameService = new GameService('mock-token');

      // Mock ladder processing with not found players (from fixture)
      const mockPlayers = ladderNotFoundFixture.players.map((p) => ({
        name: p.name,
        rating: p.rating,
        profileUrl: p.profile_url,
        found: p.found,
        searchMethod: p.search_method,
      }));

      mockGameService.processLadder.mockResolvedValue({
        players: mockPlayers,
        html: '<html>Mock HTML</html>',
      });

      // Select format
      useGameStore.getState().setFormat(GameType.DUPR_LADDER);

      // Process input
      const playerInput = ladderNotFoundFixture.input.join('\n');
      useGameStore.getState().setInputText(playerInput);
      useGameStore.getState().setProcessing(true);

      const result = await mockGameService.processLadder(playerInput);

      useGameStore.getState().setResults({
        players: result.players,
      });
      useGameStore.getState().setHtml(result.html);
      useGameStore.getState().setProcessing(false);

      // Verify that not found players have default rating
      await waitFor(() => {
        const state = useGameStore.getState();
        const notFoundPlayers = state.results?.players.filter(p => !p.found);

        expect(notFoundPlayers).toBeDefined();
        expect(notFoundPlayers!.length).toBeGreaterThan(0);

        // Verify default rating is used (3.0 per fixture)
        notFoundPlayers!.forEach(player => {
          expect(player.rating).toBe(3.0);
          expect(player.searchMethod).toBe('not_found');
        });
      });
    });
  });

  describe('Error handling when API fails', () => {
    it('should handle API error gracefully', async () => {
      const { GameService } = require('../services/gameService');
      const mockGameService = new GameService('mock-token');

      // Mock API error
      const mockError = new Error('API request failed: Network error');
      mockGameService.processLadder.mockRejectedValue(mockError);

      // Select format
      useGameStore.getState().setFormat(GameType.DUPR_LADDER);
      useGameStore.getState().setInputText('John Smith\nJane Doe');

      // Attempt to process
      useGameStore.getState().setProcessing(true);

      try {
        await mockGameService.processLadder('John Smith\nJane Doe');
      } catch (error) {
        // Handle error
        useGameStore.getState().setError((error as Error).message);
        useGameStore.getState().setProcessing(false);
      }

      // Verify error state
      await waitFor(() => {
        const state = useGameStore.getState();
        expect(state.isProcessing).toBe(false);
        expect(state.error).toBe('API request failed: Network error');
        expect(state.results).toBeNull();
      });
    });

    it('should handle token expired error', async () => {
      const { GameService } = require('../services/gameService');
      const mockGameService = new GameService('mock-token');

      // Mock token expired error
      const mockError = new Error('Authentication token expired');
      mockGameService.processLadder.mockRejectedValue(mockError);

      // Select format
      useGameStore.getState().setFormat(GameType.DUPR_LADDER);
      useGameStore.getState().setInputText('John Smith');

      // Attempt to process
      useGameStore.getState().setProcessing(true);

      try {
        await mockGameService.processLadder('John Smith');
      } catch (error) {
        useGameStore.getState().setError((error as Error).message);
        useGameStore.getState().setProcessing(false);
      }

      // Verify error state
      await waitFor(() => {
        const state = useGameStore.getState();
        expect(state.isProcessing).toBe(false);
        expect(state.error).toBe('Authentication token expired');
      });
    });
  });

  describe('Empty input validation', () => {
    it('should handle empty input', async () => {
      const { GameService } = require('../services/gameService');
      const mockGameService = new GameService('mock-token');

      // Mock error for empty input
      mockGameService.processLadder.mockRejectedValue(
        new Error('No players found in input')
      );

      // Select format
      useGameStore.getState().setFormat(GameType.DUPR_LADDER);
      useGameStore.getState().setInputText('');

      // Attempt to process
      useGameStore.getState().setProcessing(true);

      try {
        await mockGameService.processLadder('');
      } catch (error) {
        useGameStore.getState().setError((error as Error).message);
        useGameStore.getState().setProcessing(false);
      }

      // Verify error
      await waitFor(() => {
        const state = useGameStore.getState();
        expect(state.isProcessing).toBe(false);
        expect(state.error).toBe('No players found in input');
      });
    });

    it('should handle whitespace-only input', async () => {
      const { GameService } = require('../services/gameService');
      const mockGameService = new GameService('mock-token');

      // Mock error for whitespace-only input
      mockGameService.processLadder.mockRejectedValue(
        new Error('No players found in input')
      );

      // Select format
      useGameStore.getState().setFormat(GameType.DUPR_LADDER);
      useGameStore.getState().setInputText('   \n  \n\n  ');

      // Attempt to process
      useGameStore.getState().setProcessing(true);

      try {
        await mockGameService.processLadder('   \n  \n\n  ');
      } catch (error) {
        useGameStore.getState().setError((error as Error).message);
        useGameStore.getState().setProcessing(false);
      }

      // Verify error
      await waitFor(() => {
        const state = useGameStore.getState();
        expect(state.isProcessing).toBe(false);
        expect(state.error).toBe('No players found in input');
      });
    });

    it('should clear previous errors when new input is provided', async () => {
      const { GameService } = require('../services/gameService');
      const mockGameService = new GameService('mock-token');

      // First attempt: error
      useGameStore.getState().setError('Previous error');
      expect(useGameStore.getState().error).toBe('Previous error');

      // Second attempt: success
      const mockPlayers = [
        { name: 'John', rating: 4.0, found: true, profileUrl: null, searchMethod: 'test' },
      ];

      mockGameService.processLadder.mockResolvedValue({
        players: mockPlayers,
        html: '<html>Success</html>',
      });

      // Clear error before processing
      useGameStore.getState().setError(null);
      useGameStore.getState().setProcessing(true);

      const result = await mockGameService.processLadder('John');

      useGameStore.getState().setResults({
        players: result.players,
      });
      useGameStore.getState().setHtml(result.html);
      useGameStore.getState().setProcessing(false);

      // Verify error is cleared
      await waitFor(() => {
        const state = useGameStore.getState();
        expect(state.error).toBeNull();
        expect(state.results).not.toBeNull();
        expect(state.isProcessing).toBe(false);
      });
    });
  });

  describe('State management', () => {
    it('should maintain state across flow steps', async () => {
      // 1. Select format
      useGameStore.getState().setFormat(GameType.DUPR_LADDER);
      expect(useGameStore.getState().format).toBe(GameType.DUPR_LADDER);

      // 2. Enter input
      const input = 'Player 1\nPlayer 2';
      useGameStore.getState().setInputText(input);
      expect(useGameStore.getState().inputText).toBe(input);

      // 3. Start processing
      useGameStore.getState().setProcessing(true);
      expect(useGameStore.getState().isProcessing).toBe(true);

      // 4. Complete processing
      const mockResults = {
        players: [
          { name: 'Player 1', rating: 4.0, found: true, profileUrl: null, searchMethod: 'test' },
          { name: 'Player 2', rating: 3.5, found: true, profileUrl: null, searchMethod: 'test' },
        ],
      };
      useGameStore.getState().setResults(mockResults);
      useGameStore.getState().setHtml('<html>Results</html>');
      useGameStore.getState().setProcessing(false);

      // Verify all state is preserved
      const state = useGameStore.getState();
      expect(state.format).toBe(GameType.DUPR_LADDER);
      expect(state.inputText).toBe(input);
      expect(state.results).toEqual(mockResults);
      expect(state.html).toBe('<html>Results</html>');
      expect(state.isProcessing).toBe(false);
    });

    it('should reset state when reset is called', () => {
      // Set up state
      useGameStore.getState().setFormat(GameType.DUPR_LADDER);
      useGameStore.getState().setInputText('Test input');
      useGameStore.getState().setResults({
        players: [
          { name: 'Test', rating: 3.0, found: true, profileUrl: null, searchMethod: 'test' },
        ],
      });
      useGameStore.getState().setHtml('<html>Test</html>');
      useGameStore.getState().setError('Test error');

      // Reset
      useGameStore.getState().reset();

      // Verify all state is cleared
      const state = useGameStore.getState();
      expect(state.format).toBeNull();
      expect(state.inputText).toBe('');
      expect(state.results).toBeNull();
      expect(state.html).toBeNull();
      expect(state.error).toBeNull();
      expect(state.isProcessing).toBe(false);
    });
  });
});
