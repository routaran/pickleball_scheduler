import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import App from '../../App';
import { TokenStorage } from '../services/tokenStorage';
import { useAuthStore } from '../stores/authStore';

// Mock TokenStorage
jest.mock('../services/tokenStorage', () => ({
  TokenStorage: {
    getToken: jest.fn(),
    saveToken: jest.fn(),
    deleteToken: jest.fn(),
    hasToken: jest.fn(),
  },
}));

// Mock RootNavigator
jest.mock('../navigation/RootNavigator', () => ({
  RootNavigator: () => null,
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ component: Component }: { component: React.ComponentType }) => <Component />,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ component: Component }: { component: React.ComponentType }) => <Component />,
  }),
}));

// Mock screens
jest.mock('../screens/GameScreen', () => ({
  GameScreen: () => null,
}));

jest.mock('../screens/ResultsScreen', () => ({
  ResultsScreen: () => null,
}));

jest.mock('../screens/SettingsScreen', () => ({
  SettingsScreen: () => null,
}));

jest.mock('../screens/LoginScreen', () => ({
  LoginScreen: () => null,
}));

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset auth store
    useAuthStore.setState({ token: null, user: null, isLoading: false, error: null });
  });

  it('should show loading spinner while initializing', async () => {
    (TokenStorage.getToken as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    const { getByTestId } = render(<App />);

    // Should show loading spinner
    const loadingIndicator = getByTestId('loading-indicator');
    expect(loadingIndicator).toBeTruthy();
  });

  it('should load token from storage and set it in auth store', async () => {
    const mockToken = 'test-token-123';
    (TokenStorage.getToken as jest.Mock).mockResolvedValue(mockToken);

    render(<App />);

    await waitFor(() => {
      expect(TokenStorage.getToken).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().token).toBe(mockToken);
    });
  });

  it('should not set token in auth store when no saved token exists', async () => {
    (TokenStorage.getToken as jest.Mock).mockResolvedValue(null);

    render(<App />);

    await waitFor(() => {
      expect(TokenStorage.getToken).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().token).toBeNull();
    });
  });

  it('should handle token loading errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockError = new Error('Failed to load token');
    (TokenStorage.getToken as jest.Mock).mockRejectedValue(mockError);

    render(<App />);

    await waitFor(() => {
      expect(TokenStorage.getToken).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load token:', mockError);
      expect(useAuthStore.getState().token).toBeNull();
    });

    consoleErrorSpy.mockRestore();
  });

  it('should show RootNavigator after initialization completes with token', async () => {
    const mockToken = 'test-token-123';
    (TokenStorage.getToken as jest.Mock).mockResolvedValue(mockToken);

    const { queryByTestId } = render(<App />);

    await waitFor(() => {
      expect(queryByTestId('loading-indicator')).toBeNull();
    });
  });

  it('should show RootNavigator after initialization completes without token', async () => {
    (TokenStorage.getToken as jest.Mock).mockResolvedValue(null);

    const { queryByTestId } = render(<App />);

    await waitFor(() => {
      expect(queryByTestId('loading-indicator')).toBeNull();
    });
  });

  it('should only load token once on mount', async () => {
    (TokenStorage.getToken as jest.Mock).mockResolvedValue('test-token');

    const { rerender } = render(<App />);

    await waitFor(() => {
      expect(TokenStorage.getToken).toHaveBeenCalledTimes(1);
    });

    // Rerender should not trigger another token load
    rerender(<App />);

    await waitFor(() => {
      expect(TokenStorage.getToken).toHaveBeenCalledTimes(1);
    });
  });
});
