import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, ScrollView, Button } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capturedTokens, setCapturedTokens] = useState<string[]>([]);
  const [storedToken, setStoredToken] = useState<string | null>(null);

  useEffect(() => {
    // Load stored token on app start (SPIKE-AUTH-A3)
    loadStoredToken();
  }, []);

  const loadStoredToken = async () => {
    try {
      const token = await AsyncStorage.getItem('dupr_auth_token');
      if (token) {
        console.log('[SPIKE-AUTH-A3] Loaded stored token from AsyncStorage:', token);
        setStoredToken(token);
      }
    } catch (err) {
      console.error('[SPIKE-AUTH-A3] Error loading token:', err);
    }
  };

  // JavaScript to inject into WebView for token capture (SPIKE-AUTH-A2)
  const tokenCaptureScript = `
    (function() {
      console.log('[SPIKE-AUTH-A2] Token capture script loaded');
      
      // Capture localStorage tokens
      const captureLocalStorage = () => {
        try {
          const keys = Object.keys(localStorage);
          console.log('[SPIKE-AUTH-A2] localStorage keys:', keys);
          keys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value && (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth'))) {
              console.log('[SPIKE-AUTH-A2] localStorage[' + key + ']:', value);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'TOKEN_FOUND',
                source: 'localStorage',
                key: key,
                value: value
              }));
            }
          });
        } catch (err) {
          console.error('[SPIKE-AUTH-A2] localStorage error:', err);
        }
      };
      
      // Capture cookies
      const captureCookies = () => {
        try {
          const cookies = document.cookie;
          console.log('[SPIKE-AUTH-A2] All cookies:', cookies);
          if (cookies) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'COOKIES_FOUND',
              source: 'document.cookie',
              value: cookies
            }));
          }
        } catch (err) {
          console.error('[SPIKE-AUTH-A2] Cookie error:', err);
        }
      };
      
      // Capture sessionStorage
      const captureSessionStorage = () => {
        try {
          const keys = Object.keys(sessionStorage);
          console.log('[SPIKE-AUTH-A2] sessionStorage keys:', keys);
          keys.forEach(key => {
            const value = sessionStorage.getItem(key);
            if (value && (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth'))) {
              console.log('[SPIKE-AUTH-A2] sessionStorage[' + key + ']:', value);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'TOKEN_FOUND',
                source: 'sessionStorage',
                key: key,
                value: value
              }));
            }
          });
        } catch (err) {
          console.error('[SPIKE-AUTH-A2] sessionStorage error:', err);
        }
      };
      
      // Initial capture on page load
      captureLocalStorage();
      captureCookies();
      captureSessionStorage();
      
      // Monitor for changes
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth')) {
          console.log('[SPIKE-AUTH-A2] Storage update detected:', key, value);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'TOKEN_FOUND',
            source: 'storage_update',
            key: key,
            value: value
          }));
        }
        return originalSetItem.apply(this, arguments);
      };
      
      console.log('[SPIKE-AUTH-A2] Token capture monitoring active');
    })();
  `;

  const handleLoadStart = () => {
    console.log('[WebView] Loading started');
    setIsLoading(true);
    setError(null);
  };

  const handleLoadEnd = () => {
    console.log('[WebView] Loading completed');
    setIsLoading(false);
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('[WebView Error]', nativeEvent);
    setError(nativeEvent.description);
    setIsLoading(false);
  };

  const handleMessage = async (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('[SPIKE-AUTH-A2] Message received:', message);
      
      // Add to captured tokens list
      const tokenInfo = `[${message.source}] ${message.key || ''}: ${message.value?.substring(0, 50)}...`;
      setCapturedTokens(prev => [...prev, tokenInfo]);
      
      // Store token in AsyncStorage (SPIKE-AUTH-A3)
      if (message.type === 'TOKEN_FOUND') {
        try {
          await AsyncStorage.setItem('dupr_auth_token', message.value);
          await AsyncStorage.setItem('dupr_token_source', message.source);
          await AsyncStorage.setItem('dupr_token_key', message.key || '');
          console.log('[SPIKE-AUTH-A3] Token stored in AsyncStorage');
          setStoredToken(message.value);
        } catch (storageErr) {
          console.error('[SPIKE-AUTH-A3] Error storing token:', storageErr);
        }
      }
    } catch (err) {
      console.error('[WebView] Message parse error:', err);
    }
  };

  const clearStoredToken = async () => {
    try {
      await AsyncStorage.removeItem('dupr_auth_token');
      await AsyncStorage.removeItem('dupr_token_source');
      await AsyncStorage.removeItem('dupr_token_key');
      setStoredToken(null);
      setCapturedTokens([]);
      console.log('[SPIKE-AUTH-A3] Stored token cleared');
    } catch (err) {
      console.error('[SPIKE-AUTH-A3] Error clearing token:', err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>DUPR WebView Test</Text>
        <Text style={styles.subText}>Testing dashboard.dupr.com</Text>
      </View>

      {storedToken && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>✓ Token persisted in AsyncStorage</Text>
          <Button title="Clear Token" onPress={clearStoredToken} color="#d32f2f" />
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      {capturedTokens.length > 0 && (
        <View style={styles.capturedContainer}>
          <Text style={styles.capturedTitle}>Captured Tokens ({capturedTokens.length}):</Text>
          <ScrollView style={styles.tokensList}>
            {capturedTokens.map((token, idx) => (
              <Text key={idx} style={styles.tokenItem}>{idx + 1}. {token}</Text>
            ))}
          </ScrollView>
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Loading DUPR Dashboard...</Text>
        </View>
      )}

      <WebView
        source={{ uri: 'https://dashboard.dupr.com' }}
        style={styles.webview}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onMessage={handleMessage}
        injectedJavaScript={tokenCaptureScript}
        startInLoadingState={true}
        scalesPageToFit={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        userAgent="Mozilla/5.0 (Linux; Android 9; Nexus 5) AppleWebKit/537.36"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
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
    borderRadius: 4,
    margin: 12,
    padding: 12,
  },
  successText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 4,
    margin: 12,
    padding: 12,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  capturedContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
    margin: 12,
    padding: 12,
    maxHeight: 120,
  },
  capturedTitle: {
    color: '#1565c0',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tokensList: {
    marginBottom: 8,
  },
  tokenItem: {
    color: '#0d47a1',
    fontSize: 11,
    marginVertical: 2,
    fontFamily: 'monospace',
  },
  loadingContainer: {
    position: 'absolute',
    top: 180,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  webview: {
    flex: 1,
  },
});
