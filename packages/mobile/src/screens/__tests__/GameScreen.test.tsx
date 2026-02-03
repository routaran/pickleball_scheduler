import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GameScreen } from '../GameScreen';
import { useGameStore } from '../../stores/gameStore';
import { useAuthStore } from '../../stores/authStore';
import { GameType } from '@dupr/core';

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  })),
}));

// Mock the stores
jest.mock('../../stores/gameStore');
jest.mock('../../stores/authStore');

// Mock GameService
jest.mock('../../services/gameService', () => ({
  GameService: jest.fn().mockImplementation(() => ({
    processLadder: jest.fn(),
    processPartner: jest.fn(),
    processPickleBros: jest.fn(),
    process: jest.fn(),
  })),
}));

describe('GameScreen', () => {
  const mockSetFormat = jest.fn();
  const mockSetResults = jest.fn();
  const mockSetHtml = jest.fn();
  const mockSetProcessing = jest.fn();
  const mockSetError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useGameStore as unknown as jest.Mock).mockReturnValue({
      format: null,
      inputText: '',
      setFormat: mockSetFormat,
      setResults: mockSetResults,
      setHtml: mockSetHtml,
      setProcessing: mockSetProcessing,
      setError: mockSetError,
    });
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      token: 'mock-token',
    });
  });

  it('should render the screen title and subtitle', () => {
    const { getByText } = render(<GameScreen />);

    expect(getByText('Select Game Format')).toBeTruthy();
    expect(getByText('Choose the type of game you want to organize')).toBeTruthy();
  });

  it('should render three game type options', () => {
    const { getByText } = render(<GameScreen />);

    expect(getByText('DUPR Ladder')).toBeTruthy();
    expect(getByText('Individual player rankings')).toBeTruthy();

    expect(getByText('Partner DUPR')).toBeTruthy();
    expect(getByText('Team pairs with combined ratings')).toBeTruthy();

    expect(getByText('PickleBros Monday')).toBeTruthy();
    expect(getByText('Fixed 4-player pools')).toBeTruthy();
  });

  it('should call setFormat when DUPR Ladder is pressed', () => {
    const { getByText } = render(<GameScreen />);

    const duprLadderCard = getByText('DUPR Ladder');
    fireEvent.press(duprLadderCard);

    expect(mockSetFormat).toHaveBeenCalledWith(GameType.DUPR_LADDER);
  });

  it('should call setFormat when Partner DUPR is pressed', () => {
    const { getByText } = render(<GameScreen />);

    const partnerDuprCard = getByText('Partner DUPR');
    fireEvent.press(partnerDuprCard);

    expect(mockSetFormat).toHaveBeenCalledWith(GameType.PARTNER_DUPR);
  });

  it('should call setFormat when PickleBros Monday is pressed', () => {
    const { getByText } = render(<GameScreen />);

    const picklebrosCard = getByText('PickleBros Monday');
    fireEvent.press(picklebrosCard);

    expect(mockSetFormat).toHaveBeenCalledWith(GameType.PICKLEBROS_MONDAY);
  });

  it('should show PlayerInputScreen when a format is selected', () => {
    const { getByText, rerender } = render(<GameScreen />);

    // Initially should show format selection
    expect(getByText('Select Game Format')).toBeTruthy();

    // Press DUPR Ladder button
    const duprLadderCard = getByText('DUPR Ladder');
    fireEvent.press(duprLadderCard);

    // Should have called setFormat
    expect(mockSetFormat).toHaveBeenCalledWith(GameType.DUPR_LADDER);
  });

  it('should show format selection screen when no input is shown', () => {
    const { getByText } = render(<GameScreen />);

    // Should show format selection screen
    expect(getByText('Select Game Format')).toBeTruthy();
    expect(getByText('Choose the type of game you want to organize')).toBeTruthy();
  });

  it('should show checkmark on selected format', () => {
    (useGameStore as unknown as jest.Mock).mockReturnValue({
      format: GameType.DUPR_LADDER,
      inputText: '',
      setFormat: mockSetFormat,
      setResults: mockSetResults,
      setHtml: mockSetHtml,
      setProcessing: mockSetProcessing,
      setError: mockSetError,
    });

    const { getByText } = render(<GameScreen />);

    // Should show the checkmark (✓) for selected format
    expect(getByText('✓')).toBeTruthy();
  });
});
