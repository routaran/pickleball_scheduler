import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Platform,
  SafeAreaView
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as SecureStore from 'expo-secure-store';

// Token storage key
const TOKEN_STORAGE_KEY = 'dupr_auth_token';
const TOKEN_EXPIRY_KEY = 'dupr_token_expiry';

// DUPR URLs
const DUPR_LOGIN_URL = 'https://dashboard.dupr.com/login';
const DUPR_DASHBOARD_URL = 'https://dashboard.dupr.com';

// JavaScript to inject into WebView to capture authentication tokens
const TOKEN_CAPTURE_SCRIPT = `
(function() {
  // Flag to prevent duplicate messages
  let hasReportedToken = false;

  function log(message) {
    console.log('[DUPR-AUTH] ' + message);
  }

  function sendMessage(data) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(data));
    }
  }

  function checkForToken() {
    if (hasReportedToken) return;

    try {
      // Check localStorage for auth tokens
      const localStorageKeys = Object.keys(localStorage);
      log('Checking localStorage keys: ' + localStorageKeys.join(', '));

      // Common token key patterns used by DUPR
      const tokenPatterns = [
        'token', 'auth', 'jwt', 'access', 'session',
        'dupr', 'bearer', 'id_token', 'access_token'
      ];

      for (const key of localStorageKeys) {
        const keyLower = key.toLowerCase();
        const isTokenKey = tokenPatterns.some(pattern => keyLower.includes(pattern));

        if (isTokenKey) {
          const value = localStorage.getItem(key);

          // Check if it looks like a JWT (starts with eyJ)
          if (value && (value.startsWith('eyJ') || value.length > 50)) {
            log('Found potential token in key: ' + key);
            hasReportedToken = true;

            sendMessage({
              type: 'TOKEN_FOUND',
              source: 'localStorage',
              key: key,
              value: value,
              timestamp: Date.now()
            });
            return;
          }
        }
      }

      // Also check sessionStorage
      const sessionStorageKeys = Object.keys(sessionStorage);
      log('Checking sessionStorage keys: ' + sessionStorageKeys.join(', '));

      for (const key of sessionStorageKeys) {
        const keyLower = key.toLowerCase();
        const isTokenKey = tokenPatterns.some(pattern => keyLower.includes(pattern));

        if (isTokenKey) {
          const value = sessionStorage.getItem(key);

          if (value && (value.startsWith('eyJ') || value.length > 50)) {
            log('Found potential token in sessionStorage key: ' + key);
            hasReportedToken = true;

            sendMessage({
              type: 'TOKEN_FOUND',
              source: 'sessionStorage',
              key: key,
              value: value,
              timestamp: Date.now()
            });
            return;
          }
        }
      }

      // Report page state for debugging
      sendMessage({
        type: 'PAGE_STATE',
        url: window.location.href,
        localStorageKeys: localStorageKeys,
        sessionStorageKeys: sessionStorageKeys,
        timestamp: Date.now()
      });

    } catch (e) {
      log('Error checking for token: ' + e.message);
      sendMessage({
        type: 'ERROR',
        message: e.message,
        timestamp: Date.now()
      });
    }
  }

  // Initial check
  log('Token capture script loaded');
  checkForToken();

  // Check periodically after page loads (tokens may be set after initial load)
  let checkCount = 0;
  const maxChecks = 20;
  const checkInterval = setInterval(() => {
    checkCount++;
    if (checkCount >= maxChecks || hasReportedToken) {
      clearInterval(checkInterval);
      if (!hasReportedToken) {
        log('Max checks reached, no token found');
        sendMessage({
          type: 'NO_TOKEN_FOUND',
          url: window.location.href,
          timestamp: Date.now()
        });
      }
      return;
    }
    checkForToken();
  }, 1000);

  // Also check when page URL changes (for SPA navigation)
  let lastUrl = window.location.href;
  const urlCheckInterval = setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      log('URL changed to: ' + lastUrl);
      hasReportedToken = false; // Reset to check again on new page
      checkForToken();
    }
  }, 500);

  // Listen for storage events (in case token is set by another tab/script)
  window.addEventListener('storage', function(e) {
    log('Storage event: ' + e.key);
    if (e.key && e.newValue) {
      hasReportedToken = false;
      checkForToken();
    }
  });

  true; // Required for injectedJavaScript to work properly
})();
`;

interface TokenData {
  type: string;
  source?: string;
  key?: string;
  value?: string;
  url?: string;
  localStorageKeys?: string[];
  sessionStorageKeys?: string[];
  message?: string;
  timestamp: number;
}

interface StoredToken {
  token: string;
  source: string;
  key: string;
  capturedAt: number;
  expiresAt?: number;
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storedToken, setStoredToken] = useState<StoredToken | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    loadStoredToken();
  }, []);

  const addDebugMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugMessages(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
    console.log(`[SPIKE-AUTH] ${message}`);
  };

  const loadStoredToken = async () => {
    try {
      const tokenJson = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      if (tokenJson) {
        const token: StoredToken = JSON.parse(tokenJson);
        addDebugMessage(`Loaded token from SecureStore (${token.source}:${token.key})`);

        // Check if token is expired
        if (token.expiresAt && Date.now() > token.expiresAt) {
          addDebugMessage('Token expired, clearing');
          await clearStoredToken();
        } else {
          setStoredToken(token);
        }
      } else {
        addDebugMessage('No stored token found');
      }
    } catch (err) {
      addDebugMessage(`Error loading token: ${err}`);
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const saveToken = async (tokenData: TokenData) => {
    try {
      if (!tokenData.value) {
        addDebugMessage('No token value to save');
        return;
      }

      const token: StoredToken = {
        token: tokenData.value,
        source: tokenData.source || 'unknown',
        key: tokenData.key || 'unknown',
        capturedAt: Date.now(),
        // JWT tokens typically expire, but we don't parse it here
        // The app will handle 401 responses to detect expiration
      };

      await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, JSON.stringify(token));
      setStoredToken(token);
      setShowWebView(false);
      addDebugMessage(`Token saved to SecureStore (${token.key})`);
      addDebugMessage(`Token preview: ${token.token.substring(0, 50)}...`);
    } catch (err) {
      addDebugMessage(`Error saving token: ${err}`);
      setError(String(err));
    }
  };

  const clearStoredToken = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
      setStoredToken(null);
      setDebugMessages([]);
      addDebugMessage('Token cleared from SecureStore');
    } catch (err) {
      addDebugMessage(`Error clearing token: ${err}`);
    }
  };

  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const data: TokenData = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'TOKEN_FOUND':
          addDebugMessage(`TOKEN FOUND! Source: ${data.source}, Key: ${data.key}`);
          saveToken(data);
          break;

        case 'PAGE_STATE':
          addDebugMessage(`Page: ${data.url?.substring(0, 50)}...`);
          if (data.localStorageKeys && data.localStorageKeys.length > 0) {
            addDebugMessage(`localStorage keys: ${data.localStorageKeys.join(', ')}`);
          }
          break;

        case 'NO_TOKEN_FOUND':
          addDebugMessage(`No token found at: ${data.url?.substring(0, 50)}...`);
          break;

        case 'ERROR':
          addDebugMessage(`WebView error: ${data.message}`);
          break;

        default:
          addDebugMessage(`Unknown message type: ${data.type}`);
      }
    } catch (err) {
      addDebugMessage(`Error parsing message: ${err}`);
    }
  };

  const handleNavigationStateChange = (navState: { url: string; loading: boolean }) => {
    setCurrentUrl(navState.url);
    if (!navState.loading) {
      addDebugMessage(`Navigated to: ${navState.url.substring(0, 60)}...`);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showWebView) {
    return (
      <SafeAreaView style={styles.webViewContainer}>
        <View style={styles.webViewHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowWebView(false)}
          >
            <Text style={styles.backButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.webViewTitle} numberOfLines={1}>
            {currentUrl ? currentUrl.replace('https://', '').substring(0, 30) : 'DUPR Login'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <WebView
          ref={webViewRef}
          source={{ uri: DUPR_LOGIN_URL }}
          style={styles.webView}
          injectedJavaScript={TOKEN_CAPTURE_SCRIPT}
          onMessage={handleWebViewMessage}
          onNavigationStateChange={handleNavigationStateChange}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          thirdPartyCookiesEnabled={true}
          sharedCookiesEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webViewLoading}>
              <ActivityIndicator size="large" color="#2196F3" />
            </View>
          )}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            addDebugMessage(`WebView error: ${nativeEvent.description}`);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            addDebugMessage(`HTTP error: ${nativeEvent.statusCode}`);
          }}
        />

        {/* Debug console overlay */}
        <View style={styles.debugOverlay}>
          <Text style={styles.debugTitle}>Console ({debugMessages.length})</Text>
          <ScrollView style={styles.debugScroll}>
            {debugMessages.slice(0, 5).map((msg, i) => (
              <Text key={i} style={styles.debugText}>{msg}</Text>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>DUPR Auth Spike</Text>
        <Text style={styles.subText}>WebView Token Capture Test</Text>
      </View>

      {storedToken && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>Token Captured Successfully</Text>
          <View style={styles.tokenInfo}>
            <Text style={styles.tokenLabel}>Source:</Text>
            <Text style={styles.tokenValue}>{storedToken.source}:{storedToken.key}</Text>
          </View>
          <View style={styles.tokenInfo}>
            <Text style={styles.tokenLabel}>Captured:</Text>
            <Text style={styles.tokenValue}>
              {new Date(storedToken.capturedAt).toLocaleString()}
            </Text>
          </View>
          <View style={styles.tokenInfo}>
            <Text style={styles.tokenLabel}>Preview:</Text>
            <Text style={styles.tokenPreview}>
              {storedToken.token.substring(0, 40)}...
            </Text>
          </View>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearStoredToken}
          >
            <Text style={styles.clearButtonText}>Clear Token</Text>
          </TouchableOpacity>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Instructions</Text>
          <Text style={styles.instructions}>
            1. Tap "Login to DUPR" button below{'\n'}
            2. Login with your DUPR credentials{'\n'}
            3. Wait for token capture (auto-detected){'\n'}
            4. Token will be stored in SecureStore{'\n'}
            5. Close and reopen app to verify persistence
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug Console</Text>
          <ScrollView style={styles.consoleContainer}>
            {debugMessages.length === 0 ? (
              <Text style={styles.consoleEmpty}>No messages yet</Text>
            ) : (
              debugMessages.map((msg, i) => (
                <Text key={i} style={styles.consoleText}>{msg}</Text>
              ))
            )}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Implementation Notes</Text>
          <Text style={styles.notes}>
            Using react-native-webview (embedded){'\n'}
            Token stored in expo-secure-store (encrypted){'\n'}
            JavaScript injection scans localStorage/sessionStorage{'\n'}
            Monitors URL changes for SPA navigation
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.loginButton, storedToken && styles.loginButtonSecondary]}
          onPress={() => setShowWebView(true)}
        >
          <Text style={styles.loginButtonText}>
            {storedToken ? 'Re-authenticate' : 'Login to DUPR'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subText: {
    fontSize: 14,
    color: '#e3f2fd',
    marginTop: 4,
  },
  successContainer: {
    backgroundColor: '#c8e6c9',
    borderRadius: 8,
    margin: 12,
    padding: 16,
  },
  successText: {
    color: '#2e7d32',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tokenInfo: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  tokenLabel: {
    color: '#1b5e20',
    fontSize: 13,
    fontWeight: '600',
    width: 80,
  },
  tokenValue: {
    color: '#2e7d32',
    fontSize: 13,
    flex: 1,
  },
  tokenPreview: {
    color: '#1565c0',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  clearButton: {
    marginTop: 12,
    backgroundColor: '#d32f2f',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    margin: 12,
    padding: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1565c0',
    marginBottom: 8,
  },
  instructions: {
    fontSize: 13,
    color: '#555',
    lineHeight: 22,
  },
  notes: {
    fontSize: 12,
    color: '#666',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  consoleContainer: {
    maxHeight: 150,
    backgroundColor: '#263238',
    borderRadius: 4,
    padding: 8,
  },
  consoleEmpty: {
    color: '#78909c',
    fontSize: 12,
    fontStyle: 'italic',
  },
  consoleText: {
    color: '#4fc3f7',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  loginButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  loginButtonSecondary: {
    backgroundColor: '#1976D2',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // WebView styles
  webViewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
  },
  backButton: {
    padding: 4,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  webViewTitle: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  placeholder: {
    width: 60,
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  debugOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    maxHeight: 120,
    padding: 8,
  },
  debugTitle: {
    color: '#4fc3f7',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  debugScroll: {
    maxHeight: 90,
  },
  debugText: {
    color: '#81d4fa',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },
});
