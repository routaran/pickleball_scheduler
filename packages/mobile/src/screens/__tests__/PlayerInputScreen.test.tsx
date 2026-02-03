import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PlayerInputScreen } from '../PlayerInputScreen';
import { useGameStore } from '../../stores/gameStore';
import { useAuthStore } from '../../stores/authStore';
import { GameType } from '@dupr/core';
import { Alert } from 'react-native';

// Mock react-navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock GameService
jest.mock('../../services/gameService', () => ({
  GameService: jest.fn().mockImplementation(() => ({
    process: jest.fn().mockResolvedValue({
      players: [
        { name: 'John Smith', rating: 4.2, found: true, searchMethod: 'test' },
        { name: 'Jane Doe', rating: 3.8, found: true, searchMethod: 'test' },
      ],
      html: '<html>Test HTML</html>',
    }),
  })),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('PlayerInputScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    useGameStore.getState().reset();
    useAuthStore.getState().logout();
    // Set a test token for most tests
    useAuthStore.getState().setToken('test-token-123');
  });

  describe('Placeholder text', () => {
    it('should show DUPR Ladder placeholder when format is DUPR_LADDER', () => {
      useGameStore.getState().setFormat(GameType.DUPR_LADDER);
      render(<PlayerInputScreen />);

      const textInput = screen.getByPlaceholderText(/Enter player names, one per line/);
      expect(textInput).toBeTruthy();
    });

    it('should show Partner DUPR placeholder when format is PARTNER_DUPR', () => {
      useGameStore.getState().setFormat(GameType.PARTNER_DUPR);
      render(<PlayerInputScreen />);

      const textInput = screen.getByPlaceholderText(/Enter team pairs:/);
      expect(textInput).toBeTruthy();
    });

    it('should show PickleBros placeholder when format is PICKLEBROS_MONDAY', () => {
      useGameStore.getState().setFormat(GameType.PICKLEBROS_MONDAY);
      render(<PlayerInputScreen />);

      const textInput = screen.getByPlaceholderText(/Enter player names \(multiple of 4\)/);
      expect(textInput).toBeTruthy();
    });

    it('should show default placeholder when no format is selected', () => {
      render(<PlayerInputScreen />);

      const textInput = screen.getByPlaceholderText(/Enter player names.../);
      expect(textInput).toBeTruthy();
    });
  });

  describe('Input handling', () => {
    it('should update inputText in store when text changes', () => {
      useGameStore.getState().setFormat(GameType.DUPR_LADDER);
      render(<PlayerInputScreen />);

      const textInput = screen.getByPlaceholderText(/Enter player names, one per line/);
      fireEvent.changeText(textInput, 'John Smith\nJane Doe');

      expect(useGameStore.getState().inputText).toBe('John Smith\nJane Doe');
    });

    it('should render Process button', () => {
      useGameStore.getState().setFormat(GameType.DUPR_LADDER);
      render(<PlayerInputScreen />);

      const button = screen.getByText('Process');
      expect(button).toBeTruthy();
    });

    it('should disable Process button when no format is selected', () => {
      const mockSubmit = jest.fn();
      render(<PlayerInputScreen onSubmit={mockSubmit} />);

      const button = screen.getByText('Process');
      fireEvent.press(button);

      // Button should not trigger submit when no format is selected
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please select a game format first.'
      );
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Validation - DUPR Ladder', () => {
    beforeEach(() => {
      useGameStore.getState().setFormat(GameType.DUPR_LADDER);
    });

    it('should show error when input is empty', () => {
      const mockSubmit = jest.fn();
      render(<PlayerInputScreen onSubmit={mockSubmit} />);

      const button = screen.getByText('Process');
      fireEvent.press(button);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Error',
        'Please enter at least one player name.'
      );
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('should show error when input has only whitespace', () => {
      const mockSubmit = jest.fn();
      useGameStore.getState().setInputText('   \n\n   ');
      render(<PlayerInputScreen onSubmit={mockSubmit} />);

      const button = screen.getByText('Process');
      fireEvent.press(button);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Error',
        'Please enter at least one player name.'
      );
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('should pass validation with valid player names', async () => {
      const mockSubmit = jest.fn();
      useGameStore.getState().setInputText('John Smith\nJane Doe\nBob Wilson');
      render(<PlayerInputScreen onSubmit={mockSubmit} />);

      const button = screen.getByText('Process');
      fireEvent.press(button);

      expect(Alert.alert).not.toHaveBeenCalled();

      // Wait for async processing to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Check that navigation was called and processing completed
      expect(mockNavigate).toHaveBeenCalledWith('Results');
      expect(useGameStore.getState().isProcessing).toBe(false);
      expect(useGameStore.getState().results).toBeTruthy();
    });

    it('should show error when more than 100 players', () => {
      const mockSubmit = jest.fn();
      const players = Array.from({ length: 101 }, (_, i) => `Player ${i + 1}`).join('\n');
      useGameStore.getState().setInputText(players);
      render(<PlayerInputScreen onSubmit={mockSubmit} />);

      const button = screen.getByText('Process');
      fireEvent.press(button);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Error',
        'Maximum 100 players allowed for DUPR Ladder format.'
      );
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Validation - Partner DUPR', () => {
    beforeEach(() => {
      useGameStore.getState().setFormat(GameType.PARTNER_DUPR);
    });

    it('should show error when input is empty', () => {
      const mockSubmit = jest.fn();
      render(<PlayerInputScreen onSubmit={mockSubmit} />);

      const button = screen.getByText('Process');
      fireEvent.press(button);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Error',
        'Please enter at least one team pair.'
      );
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('should show error when team pair missing delimiter', () => {
      const mockSubmit = jest.fn();
      useGameStore.getState().setInputText('John Smith Jane Doe');
      render(<PlayerInputScreen onSubmit={mockSubmit} />);

      const button = screen.getByText('Process');
      fireEvent.press(button);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Error',
        'Each team must be formatted as "Player1 / Player2". Please check your input.'
      );
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('should pass validation with valid team pairs', async () => {
      const mockSubmit = jest.fn();
      useGameStore.getState().setInputText('John Smith / Jane Doe\nBob Wilson / Alice Brown');
      render(<PlayerInputScreen onSubmit={mockSubmit} />);

      const button = screen.getByText('Process');
      fireEvent.press(button);

      expect(Alert.alert).not.toHaveBeenCalled();

      // Wait for async processing to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Check that navigation was called and processing completed
      expect(mockNavigate).toHaveBeenCalledWith('Results');
      expect(useGameStore.getState().isProcessing).toBe(false);
      expect(useGameStore.getState().results).toBeTruthy();
    });

    it('should show error when more than 50 teams', () => {
      const mockSubmit = jest.fn();
      const teams = Array.from(
        { length: 51 },
        (_, i) => `Player ${i * 2 + 1} / Player ${i * 2 + 2}`
      ).join('\n');
      useGameStore.getState().setInputText(teams);
      render(<PlayerInputScreen onSubmit={mockSubmit} />);

      const button = screen.getByText('Process');
      fireEvent.press(button);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Error',
        'Maximum 50 teams allowed for Partner DUPR format.'
      );
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Validation - PickleBros', () => {
    beforeEach(() => {
      useGameStore.getState().setFormat(GameType.PICKLEBROS_MONDAY);
    });

    it('should show error when input is empty', () => {
      const mockSubmit = jest.fn();
      render(<PlayerInputScreen onSubmit={mockSubmit} />);

      const button = screen.getByText('Process');
      fireEvent.press(button);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Error',
        'Please enter at least 4 player names.'
      );
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('should show error when player count is not multiple of 4', () => {
      const mockSubmit = jest.fn();
      useGameStore.getState().setInputText('Player 1\nPlayer 2\nPlayer 3');
      render(<PlayerInputScreen onSubmit={mockSubmit} />);

      const button = screen.getByText('Process');
      fireEvent.press(button);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Error',
        'PickleBros format requires a multiple of 4 players. You entered 3 player(s).'
      );
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('should pass validation with 4 players', async () => {
      const mockSubmit = jest.fn();
      useGameStore.getState().setInputText('Player 1\nPlayer 2\nPlayer 3\nPlayer 4');
      render(<PlayerInputScreen onSubmit={mockSubmit} />);

      const button = screen.getByText('Process');
      fireEvent.press(button);

      expect(Alert.alert).not.toHaveBeenCalled();

      // Wait for async processing to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Check that navigation was called and processing completed
      expect(mockNavigate).toHaveBeenCalledWith('Results');
      expect(useGameStore.getState().isProcessing).toBe(false);
      expect(useGameStore.getState().results).toBeTruthy();
    });

    it('should pass validation with 8 players', async () => {
      const mockSubmit = jest.fn();
      const players = Array.from({ length: 8 }, (_, i) => `Player ${i + 1}`).join('\n');
      useGameStore.getState().setInputText(players);
      render(<PlayerInputScreen onSubmit={mockSubmit} />);

      const button = screen.getByText('Process');
      fireEvent.press(button);

      expect(Alert.alert).not.toHaveBeenCalled();

      // Wait for async processing to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Check that navigation was called and processing completed
      expect(mockNavigate).toHaveBeenCalledWith('Results');
      expect(useGameStore.getState().isProcessing).toBe(false);
      expect(useGameStore.getState().results).toBeTruthy();
    });
  });

  describe('UI rendering', () => {
    it('should display the selected format', () => {
      useGameStore.getState().setFormat(GameType.DUPR_LADDER);
      render(<PlayerInputScreen />);

      const formatText = screen.getByText(/Format: DUPR LADDER/);
      expect(formatText).toBeTruthy();
    });

    it('should show warning when no format selected', () => {
      render(<PlayerInputScreen />);

      const warningText = screen.getByText(
        /Please select a game format from the Game Type Selector first./
      );
      expect(warningText).toBeTruthy();
    });
  });
});
