import React, { useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Platform, SafeAreaView } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { AuthService } from '../services/authService';

const DUPR_LOGIN_URL = 'https://dashboard.dupr.com/login';

// JavaScript to inject into WebView to capture authentication tokens
const TOKEN_CAPTURE_JS = `
(function() {
  let hasReportedToken = false;
  let lastDumpTime = 0;

  function sendMessage(data) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(data));
    }
  }

  function log(msg) {
    console.log('[TOKEN-CAPTURE] ' + msg);
    // Also send to React Native so we can see the logs
    sendMessage({ type: 'DEBUG_LOG', message: msg, timestamp: Date.now() });
  }

  function isValidJWT(value) {
    if (!value || typeof value !== 'string') return false;
    if (!value.startsWith('eyJ')) return false;
    const parts = value.split('.');
    return parts.length === 3 && parts.every(p => p.length > 10);
  }

  function dumpAllStorage() {
    const now = Date.now();
    if (now - lastDumpTime < 5000) return; // Only dump every 5 seconds
    lastDumpTime = now;

    const dump = { localStorage: {}, sessionStorage: {} };

    // Dump localStorage
    for (const key of Object.keys(localStorage)) {
      const value = localStorage.getItem(key);
      const preview = value ? value.substring(0, 100) : 'null';
      dump.localStorage[key] = {
        length: value ? value.length : 0,
        preview: preview,
        isJWT: isValidJWT(value)
      };
    }

    // Dump sessionStorage
    for (const key of Object.keys(sessionStorage)) {
      const value = sessionStorage.getItem(key);
      const preview = value ? value.substring(0, 100) : 'null';
      dump.sessionStorage[key] = {
        length: value ? value.length : 0,
        preview: preview,
        isJWT: isValidJWT(value)
      };
    }

    log('Storage dump: ' + JSON.stringify(dump, null, 2));
    sendMessage({
      type: 'STORAGE_DUMP',
      url: window.location.href,
      localStorage: dump.localStorage,
      sessionStorage: dump.sessionStorage,
      timestamp: now
    });
  }

  function extractJWTFromValue(value) {
    if (!value) return null;

    // Direct JWT
    if (isValidJWT(value)) return value;

    // Try to parse as JSON and look for nested tokens
    try {
      const parsed = JSON.parse(value);

      // Check persist:root structure: { auth: '{"token":"eyJ..."}' }
      if (parsed.auth) {
        const authParsed = typeof parsed.auth === 'string' ? JSON.parse(parsed.auth) : parsed.auth;
        if (authParsed.token && isValidJWT(authParsed.token)) {
          log('Found token in persist:root.auth.token');
          return authParsed.token;
        }
      }

      // Check for token property directly
      if (parsed.token && isValidJWT(parsed.token)) {
        return parsed.token;
      }

      // Check for accessToken property
      if (parsed.accessToken && isValidJWT(parsed.accessToken)) {
        return parsed.accessToken;
      }
    } catch (e) {
      // Not JSON, that's fine
    }

    return null;
  }

  function findTokens() {
    const tokens = [];

    // Scan localStorage for JWTs
    for (const key of Object.keys(localStorage)) {
      const value = localStorage.getItem(key);
      const jwt = extractJWTFromValue(value);
      if (jwt) {
        tokens.push({ source: 'localStorage', key, value: jwt });
      }
    }

    // Scan sessionStorage for JWTs
    for (const key of Object.keys(sessionStorage)) {
      const value = sessionStorage.getItem(key);
      const jwt = extractJWTFromValue(value);
      if (jwt) {
        tokens.push({ source: 'sessionStorage', key, value: jwt });
      }
    }

    return tokens;
  }

  function scrapeUserInfo() {
    const result = { name: null, rating: null, doublesRating: null, singlesRating: null };

    try {
      // DUPR Dashboard specific: Name is in span.text-xl.text-white inside the profile header
      const nameEl = document.querySelector('span.text-xl.text-white');
      if (nameEl && nameEl.textContent) {
        result.name = nameEl.textContent.trim();
        log('Found name: ' + result.name);
      }

      // Method 1: Find rating elements by class
      // DUPR dashboard shows ratings in order: doubles (index 0), singles (index 1)
      const ratingElements = document.querySelectorAll('p.text-2xl');
      log('Found ' + ratingElements.length + ' potential rating elements (p.text-2xl)');

      const ratings = [];
      ratingElements.forEach((el, idx) => {
        const text = (el.textContent || '').trim();
        log('  Rating element ' + idx + ': "' + text + '" (len=' + text.length + ')');
        // Just try parseFloat directly - regex escaping issues in injected JS
        const num = parseFloat(text);
        if (!isNaN(num) && num > 0 && num < 10) {
          log('    -> Parsed as rating: ' + num);
          ratings.push(num);
        } else {
          log('    -> Not a valid rating number');
        }
      });

      // First rating is doubles, second is singles
      if (ratings.length >= 1) {
        result.doublesRating = ratings[0];
        log('Found doubles rating (index 0): ' + result.doublesRating);
      }
      if (ratings.length >= 2) {
        result.singlesRating = ratings[1];
        log('Found singles rating (index 1): ' + result.singlesRating);
      }

      // Method 2: Text scan fallback - look for rating patterns in page
      if (!result.doublesRating && !result.singlesRating) {
        log('Trying text scan fallback...');
        const bodyHtml = document.body.innerHTML;

        // Look for pattern: Doubles followed by rating number
        const doublesMatch = bodyHtml.match(/Doubles[\s\S]{0,200}?>(\d+\.\d{1,3})</);
        if (doublesMatch) {
          result.doublesRating = parseFloat(doublesMatch[1]);
          log('Found doubles via text scan: ' + result.doublesRating);
        }

        const singlesMatch = bodyHtml.match(/Singles[\s\S]{0,200}?>(\d+\.\d{1,3})</);
        if (singlesMatch) {
          result.singlesRating = parseFloat(singlesMatch[1]);
          log('Found singles via text scan: ' + result.singlesRating);
        }
      }

      // Use doubles rating as primary (preferred), fallback to singles
      result.rating = result.doublesRating || result.singlesRating;

      // Fallback selectors if name not found
      if (!result.name) {
        const fallbackNameSelectors = [
          '.font-semibold span.text-white',
          '[class*="text-xl"][class*="text-white"]',
        ];
        for (const selector of fallbackNameSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent && el.textContent.trim().length > 2) {
            result.name = el.textContent.trim();
            log('Found name via fallback: ' + result.name);
            break;
          }
        }
      }

      log('Scraped user info: name=' + result.name + ', rating=' + result.rating +
          ' (doubles=' + result.doublesRating + ', singles=' + result.singlesRating + ')');

    } catch (e) {
      log('Error scraping user info: ' + e.message);
    }

    return result;
  }

  function checkForToken() {
    if (hasReportedToken) return;

    try {
      // Always dump storage for debugging
      dumpAllStorage();

      const tokens = findTokens();

      if (tokens.length > 0) {
        const token = tokens[0];
        hasReportedToken = true;
        log('Found JWT! Key: ' + token.key + ', Length: ' + token.value.length);

        // Wait for page to fully render, with retries for ratings
        let attempts = 0;
        const maxAttempts = 4;
        const delays = [1000, 2000, 3000, 4000]; // Progressive delays

        function tryScrapingAndSend() {
          attempts++;
          log('Scraping attempt ' + attempts + '/' + maxAttempts);
          const userInfo = scrapeUserInfo();

          // If we have both name and rating, or we've exhausted retries, send the message
          if ((userInfo.name && userInfo.rating) || attempts >= maxAttempts) {
            log('Sending TOKEN_FOUND after ' + attempts + ' attempts');
            sendMessage({
              type: 'TOKEN_FOUND',
              source: token.source,
              key: token.key,
              value: token.value,
              allTokenKeys: tokens.map(t => t.source + ':' + t.key),
              scrapedName: userInfo.name,
              scrapedRating: userInfo.rating,
              scrapedDoublesRating: userInfo.doublesRating,
              scrapedSinglesRating: userInfo.singlesRating,
              timestamp: Date.now()
            });
          } else {
            // Retry after delay
            log('Rating not found yet, retrying in ' + delays[attempts] + 'ms...');
            setTimeout(tryScrapingAndSend, delays[attempts]);
          }
        }

        setTimeout(tryScrapingAndSend, delays[0]);
        return;
      }

      log('No JWT found yet. URL: ' + window.location.href);

    } catch (e) {
      log('Error: ' + e.message);
      sendMessage({ type: 'ERROR', message: e.message, timestamp: Date.now() });
    }
  }

  log('Script loaded on ' + window.location.href);
  checkForToken();

  // Check every 2 seconds
  const checkInterval = setInterval(() => {
    if (hasReportedToken) {
      clearInterval(checkInterval);
      return;
    }
    checkForToken();
  }, 2000);

  // Also check on URL changes
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      log('URL changed to: ' + lastUrl);
      hasReportedToken = false;
      checkForToken();
    }
  }, 500);

  true;
})();
`;

interface TokenData {
  type: string;
  source?: string;
  key?: string;
  value?: string;
  url?: string;
  message?: string;
  allTokenKeys?: string[];
  scrapedName?: string | null;
  scrapedRating?: number | null;
  scrapedDoublesRating?: number | null;
  scrapedSinglesRating?: number | null;
  timestamp: number;
}

export function LoginScreen() {
  const webViewRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState<string>('');

  const handleWebViewMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'TOKEN_FOUND' && data.value) {
        // Verify it's a real JWT before accepting
        const isValidJWT = data.value.startsWith('eyJ') && data.value.split('.').length === 3;
        if (!isValidJWT) {
          console.log(`[LoginScreen] Rejecting non-JWT token from ${data.key}`);
          return;
        }

        console.log(`[LoginScreen] Valid JWT found! Source: ${data.source}, Key: ${data.key}`);
        console.log(`[LoginScreen] Token preview: ${data.value.substring(0, 50)}...`);
        console.log(`[LoginScreen] Scraped user info: name="${data.scrapedName}", rating=${data.scrapedRating} (doubles=${data.scrapedDoublesRating}, singles=${data.scrapedSinglesRating})`);

        // Use AuthService to handle login (saves token, extracts user, updates store)
        // Pass scraped user info if available
        await AuthService.login(data.value, {
          name: data.scrapedName || undefined,
          rating: data.scrapedRating || undefined,
        });
        console.log('[LoginScreen] AuthService.login() completed');
      } else if (data.type === 'STORAGE_DUMP') {
        console.log(`[LoginScreen] === STORAGE DUMP === URL: ${data.url}`);
        console.log(`[LoginScreen] localStorage keys: ${Object.keys(data.localStorage || {}).join(', ') || 'none'}`);
        console.log(`[LoginScreen] sessionStorage keys: ${Object.keys(data.sessionStorage || {}).join(', ') || 'none'}`);

        // Log details of each key
        for (const [key, info] of Object.entries(data.localStorage || {})) {
          const i = info as { length: number; preview: string; isJWT: boolean };
          console.log(`[LoginScreen]   localStorage["${key}"]: len=${i.length} jwt=${i.isJWT} preview="${i.preview?.substring(0, 60)}..."`);
        }
        for (const [key, info] of Object.entries(data.sessionStorage || {})) {
          const i = info as { length: number; preview: string; isJWT: boolean };
          console.log(`[LoginScreen]   sessionStorage["${key}"]: len=${i.length} jwt=${i.isJWT} preview="${i.preview?.substring(0, 60)}..."`);
        }
      } else if (data.type === 'PAGE_STATE') {
        console.log(`[LoginScreen] Page: ${data.url?.substring(0, 50)}...`);
      } else if (data.type === 'DEBUG_LOG') {
        console.log(`[WebView] ${data.message}`);
      } else if (data.type === 'ERROR') {
        console.error(`[LoginScreen] WebView error: ${data.message}`);
      }
    } catch (err) {
      console.error(`[LoginScreen] Error parsing message: ${err}`);
    }
  };

  const handleNavigationStateChange = (navState: { url: string; loading: boolean }) => {
    setCurrentUrl(navState.url);
    if (!navState.loading) {
      console.log(`[LoginScreen] Navigated to: ${navState.url}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>DUPR Login</Text>
        {currentUrl ? (
          <Text style={styles.urlText} numberOfLines={1}>
            {currentUrl.replace('https://', '').substring(0, 40)}
          </Text>
        ) : null}
      </View>

      {/* WebView Container */}
      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: DUPR_LOGIN_URL }}
          style={styles.webView}
          injectedJavaScript={TOKEN_CAPTURE_JS}
          onMessage={handleWebViewMessage}
          onNavigationStateChange={handleNavigationStateChange}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          thirdPartyCookiesEnabled={true}
          sharedCookiesEnabled={true}
          startInLoadingState={true}
          // Additional settings to help with rendering
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="compatibility"
          allowsFullscreenVideo={true}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          originWhitelist={['*']}
          cacheEnabled={true}
          cacheMode="LOAD_DEFAULT"
          // Use a modern Chrome user agent to avoid mobile detection issues
          userAgent="Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
          // Force hardware acceleration
          androidHardwareAccelerationDisabled={false}
          androidLayerType="none"
          // Allow all content
          setSupportMultipleWindows={false}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Loading DUPR...</Text>
            </View>
          )}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error(`[LoginScreen] WebView error: ${nativeEvent.description}`);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error(`[LoginScreen] HTTP error: ${nativeEvent.statusCode}`);
          }}
          onLoadStart={() => console.log('[LoginScreen] WebView load started')}
          onLoadEnd={() => console.log('[LoginScreen] WebView load ended')}
          onLoadProgress={({ nativeEvent }) => {
            if (nativeEvent.progress === 1) {
              console.log('[LoginScreen] WebView fully loaded');
            }
          }}
          onContentProcessDidTerminate={() => {
            console.log('[LoginScreen] WebView content process terminated, reloading...');
            webViewRef.current?.reload();
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingTop: Platform.OS === 'android' ? 35 : 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  urlText: {
    fontSize: 11,
    color: '#e3f2fd',
    marginTop: 4,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});
