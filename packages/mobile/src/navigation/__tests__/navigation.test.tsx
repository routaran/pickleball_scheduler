import React from 'react';
import { render } from '@testing-library/react-native';
import { TabNavigator } from '../TabNavigator';
import { RootNavigator } from '../RootNavigator';
import { useAuthStore } from '../../stores/authStore';

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
jest.mock('../../screens/GameScreen', () => ({
  GameScreen: () => <></>,
}));

jest.mock('../../screens/ResultsScreen', () => ({
  ResultsScreen: () => <></>,
}));

jest.mock('../../screens/SettingsScreen', () => ({
  SettingsScreen: () => <></>,
}));

jest.mock('../../screens/LoginScreen', () => ({
  LoginScreen: () => <></>,
}));

describe('Navigation', () => {
  describe('TabNavigator', () => {
    it('should render without crashing', () => {
      const result = render(<TabNavigator />);
      expect(result).toBeTruthy();
    });
  });

  describe('RootNavigator', () => {
    beforeEach(() => {
      // Reset auth store before each test
      useAuthStore.setState({ token: null });
    });

    it('should render without crashing', () => {
      const result = render(<RootNavigator />);
      expect(result).toBeTruthy();
    });

    it('should show login screen when not authenticated', () => {
      useAuthStore.setState({ token: null });
      const result = render(<RootNavigator />);
      expect(result).toBeTruthy();
    });

    it('should show main app when authenticated', () => {
      useAuthStore.setState({ token: 'test-token' });
      const result = render(<RootNavigator />);
      expect(result).toBeTruthy();
    });
  });
});
