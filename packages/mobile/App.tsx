import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthService } from './src/services/authService';
import { CrashReporting } from './src/services/crashReporting';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Initialize crash reporting
    CrashReporting.init();

    async function initialize() {
      try {
        const result = await AuthService.initialize();
        console.log('[App] Initialization complete:', result ? 'user logged in' : 'no session');
      } catch (error) {
        console.error('[App] Failed to initialize:', error);
      } finally {
        setIsInitializing(false);
      }
    }
    initialize();
  }, []);

  if (isInitializing) {
    return (
      <View style={styles.loading} testID="loading-indicator">
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return <RootNavigator />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
