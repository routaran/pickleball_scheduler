# DUPR WebView Auth Test

This spike tests embedded WebView authentication for capturing DUPR tokens in a React Native/Expo app.

## Key Changes from Previous Implementation

| Before | After |
|--------|-------|
| `expo-web-browser` (external browser) | `react-native-webview` (embedded) |
| Fake test tokens | Real token capture via JS injection |
| `AsyncStorage` | `expo-secure-store` (encrypted) |
| No token detection | Auto-detects JWT in localStorage/sessionStorage |

## How Token Capture Works

1. User taps "Login to DUPR" button
2. Embedded WebView loads `https://dashboard.dupr.com/login`
3. User logs in with DUPR credentials
4. JavaScript injection monitors `localStorage` and `sessionStorage`
5. When a JWT token is detected (starts with `eyJ` or matches token patterns), it's sent to React Native via `postMessage`
6. Token is stored in `expo-secure-store` (encrypted on device)

## Token Detection Patterns

The injection script looks for keys containing:
- `token`, `auth`, `jwt`, `access`, `session`
- `dupr`, `bearer`, `id_token`, `access_token`

## Running the Spike

```bash
# Install dependencies (run once after changes to package.json)
cd spike/webview-test
npm install

# Start Android emulator
export ANDROID_SDK_ROOT=/home/rkalluri/Downloads/src/pickleball_scheduler/android-sdk-root
$ANDROID_SDK_ROOT/emulator/emulator -avd pickleball_api28

# In another terminal, start the app
cd spike/webview-test
npm run android
```

## Testing Checklist

See `../ANDROID_AUTH_FINDINGS.md` for the full testing checklist.

## Dependencies

- `react-native-webview` - Embedded WebView component
- `expo-secure-store` - Encrypted storage for tokens

## Security Notes

- Tokens are stored encrypted via `expo-secure-store`
- JavaScript injection only reads storage, never writes
- Token is only captured if it matches JWT patterns
- WebView has `domStorageEnabled`, `thirdPartyCookiesEnabled` for proper auth flow
