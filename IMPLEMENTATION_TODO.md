# DUPR Mobile App - Detailed Implementation TODO

**Document Purpose:** Break down implementation into specific, actionable programming tasks for developers/coding agents.

**Format:** Each task includes:
- **File(s):** What to create/modify
- **Function Signature:** What to implement (if applicable)
- **Inputs/Outputs:** Clear data types
- **Acceptance Criteria:** What "done" means
- **Related Tests:** Unit/integration tests required

**How to Use:**
1. Pick next unchecked task
2. Read task description + acceptance criteria
3. Implement code + tests
4. Check task when complete
5. Move to next task

---

## 🚀 SPIKE PHASE - Environment & Validation

### Environment Setup
- [ ] **SPIKE-ENV-1:** Install Android SDK
  - **Task:** Download Android SDK (API 28+), configure emulator
  - **Acceptance:** `emulator -list-avds` shows available Android emulator

- [ ] **SPIKE-ENV-2:** Create Android emulator instance
  - **Task:** Create emulator with API 28+ image, 2GB RAM minimum
  - **Acceptance:** Emulator boots successfully, can run `adb shell`

- [ ] **SPIKE-ENV-3:** Install Xcode + iOS tools (Mac only)
  - **Task:** Install Xcode, verify `xcrun simctl list` works
  - **Acceptance:** `xcrun simctl list devices` shows available iOS simulators

- [ ] **SPIKE-ENV-4:** Install Node.js + npm/yarn
  - **Task:** Install Node 18+ LTS
  - **Acceptance:** `node --version && npm --version` shows v18+

- [ ] **SPIKE-ENV-5:** Install Expo CLI
  - **Task:** `npm install -g expo-cli`
  - **Acceptance:** `expo --version` works, `expo whoami` prompts for login

---

### WebView Auth Validation (Android)

- [ ] **SPIKE-AUTH-A1:** Create minimal Expo WebView test app
  - **Files:** `/spike/webview-test/app.json`, `/spike/webview-test/App.tsx`
  - **Implementation:** 
    - Scaffold Expo app
    - Add react-native-webview dependency
    - Create component that loads `https://dashboard.dupr.com`
  - **Acceptance Criteria:**
    - App boots on Android emulator
    - WebView displays DUPR login page (no CORS errors)
    - Can interact with login form

- [ ] **SPIKE-AUTH-A2:** Capture WebView network responses
  - **Files:** `/spike/webview-test/App.tsx`
  - **Implementation:**
    - Add WebView `onMessage` handler
    - Inject JS to capture: response headers, cookies, localStorage, auth tokens
    - Log all captured data to console
  - **Acceptance Criteria:**
    - After login, console logs show token location (header/cookie/localStorage)
    - Token value is printed (e.g., `AUTH_TOKEN=abc123...`)
    - Security flags documented (HttpOnly, Secure, Domain, SameSite)

- [ ] **SPIKE-AUTH-A3:** Test token persistence on app restart
  - **Files:** `/spike/webview-test/App.tsx`
  - **Implementation:**
    - After login, store token in AsyncStorage (temporary)
    - Close app, reopen
    - Verify token still accessible
  - **Acceptance Criteria:**
    - Token persists after app close/reopen
    - Value matches original token

- [ ] **SPIKE-AUTH-A4:** Document error cases (Android)
  - **Files:** `/spike/ANDROID_AUTH_FINDINGS.md`
  - **Implementation:**
    - Test invalid credentials → document error behavior
    - Test network timeout → document timeout behavior
    - Test page unreachable → document fallback behavior
  - **Acceptance Criteria:**
    - Document: What happens on invalid login?
    - Document: How long until timeout?
    - Document: Is error message visible in WebView?

---

### WebView Auth Validation (iOS Simulator)

- [ ] **SPIKE-AUTH-I1:** Test WebView auth on iOS simulator
  - **Files:** (reuse iOS simulator on same Expo app)
  - **Implementation:**
    - Run same Expo app on iOS simulator
    - Repeat SPIKE-AUTH-A2, A3, A4 tests
  - **Acceptance Criteria:**
    - Token captured on iOS (same method as Android or document differences)
    - Persistence works on iOS
    - Error handling documented

- [ ] **SPIKE-AUTH-I2:** Document iOS-specific blockers
  - **Files:** `/spike/IOS_AUTH_FINDINGS.md`
  - **Implementation:**
    - Compare Android vs iOS behavior
    - Document HttpOnly/Secure flag handling on iOS (WKWebView)
    - Note any platform differences
  - **Acceptance Criteria:**
    - Document: Does iOS WKWebView handle HttpOnly cookies differently?
    - Document: Any CSP/CORS issues on iOS?
    - Document: Token capture method identical or different?

---

### Direct API Auth (Fallback)

- [ ] **SPIKE-AUTH-API-1:** Research DUPR API endpoints
  - **Files:** `/spike/DUPR_API_FINDINGS.md`
  - **Implementation:**
    - Review DUPR GitHub/docs for login endpoint
    - Try common patterns: POST /api/login, POST /auth/login, POST /authenticate
    - Reverse engineer if needed (inspect browser requests)
  - **Acceptance Criteria:**
    - Document: Is login endpoint public and available?
    - Document: Request format (username, password, others?)
    - Document: Response format (token, user info, expires_at?)

- [ ] **SPIKE-AUTH-API-2:** Test direct API auth (if endpoint found)
  - **Files:** `/spike/api-test.js` or `/spike/test-api.ts`
  - **Implementation:**
    - Use curl or axios to POST credentials to endpoint
    - Capture response token
    - Test token validity (use for other API calls?)
  - **Acceptance Criteria:**
    - If endpoint exists: token successfully obtained via POST
    - Document token format + validity period
    - If endpoint not found: document in DUPR_API_FINDINGS.md

---

### Report Export Validation

- [ ] **SPIKE-EXPORT-A1:** Test expo-print on Android emulator
  - **Files:** `/spike/print-test/App.tsx`
  - **Implementation:**
    - Create sample HTML (copy from Python desktop app output)
    - Use expo-print to render HTML → PDF
    - Verify PDF output
  - **Acceptance Criteria:**
    - PDF generated successfully
    - PDF readable in emulator (open in gallery or file viewer)
    - Text not blurry, margins reasonable

- [ ] **SPIKE-EXPORT-A2:** Test expo-print on physical Android device
  - **Files:** (same app)
  - **Implementation:**
    - Deploy APK to physical device
    - Run print test again
  - **Acceptance Criteria:**
    - PDF generated on physical device
    - PDF quality acceptable (no render artifacts)
    - Native print dialog appears if available

- [ ] **SPIKE-EXPORT-A3:** Document expo-print reliability
  - **Files:** `/spike/EXPORT_FINDINGS.md`
  - **Implementation:**
    - Document: Is expo-print reliable? Any edge cases?
    - If issues found: plan expo-sharing + Copy to Clipboard fallback
  - **Acceptance Criteria:**
    - Document: Recommendation for Phase 6 (use expo-print or fallback?)
    - Document: Any device-specific issues found?

---

### Spike Decision Gate

- [ ] **SPIKE-GATE-1:** Consolidate all findings
  - **Files:** `/spike/SPIKE_DECISION.md`
  - **Implementation:**
    - Summarize: WebView auth passes on Android + iOS?
    - Summarize: Token persistence works?
    - Summarize: Export strategy confirmed?
    - Make final recommendation: Proceed to Phase 0? Escalate? Use bare RN?
  - **Acceptance Criteria:**
    - Clear GO/NO-GO decision documented
    - All blockers resolved or documented
    - Path forward clear for Phase 0

---

## 📋 PHASE 0 - Feature Parity & Test Fixtures

### Extract Python Test Fixtures

- [ ] **P0-SETUP-1:** Set up fixture extraction environment
  - **Files:** `/packages/core/tests/fixtures/` (directory), `/scripts/extract_fixtures.py`
  - **Implementation:**
    - Create directory structure for fixtures
    - Create Python script to run desktop app and capture outputs
  - **Acceptance Criteria:**
    - Directory created: `/packages/core/tests/fixtures/`
    - Script runs Python app in headless mode

- [ ] **P0-LADDER-1:** Extract DUPR Ladder test fixtures
  - **Files:** `/packages/core/tests/fixtures/ladder_*.json`
  - **Implementation:**
    - Run Python app 5-10 times with different player lists
    - Capture input + output for each run
    - Save as JSON: `{ name, format, input: [...], expected_output: {...} }`
  - **Test Cases to Include:**
    - Basic: 3 players (John, Jane, Bob)
    - Edge case: 1 player
    - Edge case: Duplicate names
    - Edge case: Player not found
    - Edge case: Rating not available
    - Realistic: 10 real pickleball players
  - **Acceptance Criteria:**
    - 10+ JSON fixtures created
    - Each contains: input array, expected HTML, expected player array with ratings

- [ ] **P0-PARTNER-1:** Extract Partner DUPR test fixtures
  - **Files:** `/packages/core/tests/fixtures/partner_*.json`
  - **Implementation:**
    - Run Python app with team pair inputs
    - Capture team rating calculations
    - Save as JSON
  - **Test Cases to Include:**
    - Basic: 2 teams (Team A vs Team B)
    - Edge case: Mismatched team sizes
    - Edge case: Player not found in team
    - Realistic: 5 full teams
  - **Acceptance Criteria:**
    - 10+ JSON fixtures with team rating calculations

- [ ] **P0-PICKLEBROS-1:** Extract PickleBros test fixtures
  - **Files:** `/packages/core/tests/fixtures/picklebros_*.json`
  - **Implementation:**
    - Run Python app with PickleBros-specific format
    - Capture format-specific parsing + output
  - **Test Cases:** TBD based on Python app behavior
  - **Acceptance Criteria:**
    - 10+ JSON fixtures with PickleBros outputs

### Document Feature Requirements

- [ ] **P0-SPEC-1:** Document input validation rules
  - **Files:** `/packages/core/FEATURE_PARITY.md`
  - **Implementation:**
    - For each format: document what inputs are valid/invalid
    - Examples: min/max players, allowed characters, delimiters
  - **Acceptance Criteria:**
    - Ladder: max 100 players, one per line, trim whitespace
    - Partner: teams separated by `/` or `,`, max 50 teams
    - PickleBros: format specification documented

- [ ] **P0-SPEC-2:** Document player lookup behavior
  - **Files:** `/packages/core/FEATURE_PARITY.md`
  - **Implementation:**
    - Describe fuzzy matching: typo tolerance, partial names, exact match priority
    - Example: "Jon Smith" matches "John Smith"
    - Example: "Smith" matches "John Smith", "Jane Smith"
  - **Acceptance Criteria:**
    - Fuzzy matching rules clear + quantified (threshold, algorithm)

- [ ] **P0-SPEC-3:** Document override behavior
  - **Files:** `/packages/core/FEATURE_PARITY.md`
  - **Implementation:**
    - When do overrides apply? (before/after fuzzy match)
    - How are overrides stored? (JSON format)
    - Can override be deleted?
  - **Acceptance Criteria:**
    - Override precedence clear
    - Storage format documented

- [ ] **P0-SPEC-4:** Document HTML output format
  - **Files:** `/packages/core/FEATURE_PARITY.md`
  - **Implementation:**
    - Describe HTML structure (table, headers, fields)
    - Describe CSS (print-friendly, colors, fonts)
    - Describe data fields per format
  - **Acceptance Criteria:**
    - HTML template documented
    - All fields per format listed

---

## 📋 PHASE 1 - Core TypeScript Business Logic

### Project Setup

- [ ] **P1-INIT-1:** Create @dupr/core package
  - **Files:** `/packages/core/package.json`, `/packages/core/tsconfig.json`
  - **Implementation:**
    - `npm init -w packages/core`
    - Configure TypeScript, Jest, ESLint
  - **Acceptance Criteria:**
    - `npm run test` works (no tests yet, but infrastructure ready)
    - TypeScript compiles with `npm run build`

- [ ] **P1-INIT-2:** Set up Jest testing
  - **Files:** `/packages/core/jest.config.js`, `/packages/core/src/__tests__/`
  - **Implementation:**
    - Configure Jest for TypeScript
    - Create test directory
  - **Acceptance Criteria:**
    - `npm test` runs and passes (can run `jest --coverage`)

---

### PlayerSearch Module

- [ ] **P1-SEARCH-1:** Create PlayerSearch class
  - **Files:** `/packages/core/src/player-search.ts`
  - **Implementation:**
    ```typescript
    export class PlayerSearch {
      private fuzzyMatcher: Fuse<PlayerRecord>;
      
      constructor(playerDatabase: PlayerRecord[]);
      
      search(query: string, threshold?: number): SearchResult[];
      
      searchMultiple(queries: string[]): SearchResult[][];
    }
    
    interface SearchResult {
      name: string;
      rating: number;
      confidence: 'exact' | 'high' | 'low';
      duprId: string;
    }
    ```
  - **Acceptance Criteria:**
    - Class accepts player database on instantiation
    - `search()` returns array of results sorted by confidence
    - Fuzzy matching uses fuse.js with configurable threshold

- [ ] **P1-SEARCH-2:** Unit tests for PlayerSearch
  - **Files:** `/packages/core/src/__tests__/player-search.test.ts`
  - **Implementation:**
    - Test exact match: "John Smith" → finds "John Smith"
    - Test typo match: "Jon Smith" → finds "John Smith"
    - Test partial match: "Smith" → returns ["John Smith", "Jane Smith"]
    - Test no match: "XYZ" → returns []
    - Test case insensitivity: "john smith" → finds "John Smith"
  - **Acceptance Criteria:**
    - All test cases pass
    - Coverage 90%+

- [ ] **P1-SEARCH-3:** Parity tests vs Python fixtures
  - **Files:** `/packages/core/src/__tests__/player-search.parity.test.ts`
  - **Implementation:**
    - Load phase 0 fixtures
    - For each fixture: run PlayerSearch, compare output to expected
  - **Acceptance Criteria:**
    - All fixture test cases pass
    - Output matches Python app

---

### GameTypeParser Module

- [ ] **P1-PARSER-1:** Create GameTypeParser interface
  - **Files:** `/packages/core/src/game-types.ts`
  - **Implementation:**
    ```typescript
    export interface GameFormat {
      name: 'ladder' | 'partner' | 'picklebros';
      parse(input: string): ParsedGame;
      validate(input: string): ValidationError[];
    }
    
    export interface ParsedGame {
      format: GameFormat['name'];
      players: PlayerReference[];
      teams?: Team[];
    }
    
    interface Team {
      name: string;
      players: PlayerReference[];
    }
    
    interface PlayerReference {
      name: string;
      duprId?: string;
      rating?: number;
      override?: number;
    }
    ```
  - **Acceptance Criteria:**
    - Interfaces clear and flexible for all 3 formats

- [ ] **P1-PARSER-2:** Implement DUPRLadderParser
  - **Files:** `/packages/core/src/game-types.ts`
  - **Implementation:**
    ```typescript
    export class DUPRLadderParser implements GameFormat {
      name = 'ladder';
      
      parse(input: string): ParsedGame {
        // Split by newline, trim, remove empty
        // Return array of PlayerReference
      }
      
      validate(input: string): ValidationError[] {
        // Check: min 1 player, max 100 players
        // Check: no invalid characters
        // Return array of errors (empty if valid)
      }
    }
    ```
  - **Acceptance Criteria:**
    - Parses player list correctly
    - Validation catches errors
    - Matches Python behavior

- [ ] **P1-PARSER-3:** Implement PartnerDUPRParser
  - **Files:** `/packages/core/src/game-types.ts`
  - **Implementation:**
    ```typescript
    export class PartnerDUPRParser implements GameFormat {
      name = 'partner';
      
      parse(input: string): ParsedGame {
        // Split by newline
        // For each line: parse as "Player1 / Player2" or "Player1, Player2"
        // Return ParsedGame with teams array
      }
      
      calculateTeamRating(team: Team): number {
        // Algorithm from Python: average? weighted? documented
      }
    }
    ```
  - **Acceptance Criteria:**
    - Parses team pairs correctly
    - Team rating calculation matches Python
    - Validation works

- [ ] **P1-PARSER-4:** Implement PickleBrosParser
  - **Files:** `/packages/core/src/game-types.ts`
  - **Implementation:**
    - (Implement based on Phase 0 format definition)
  - **Acceptance Criteria:**
    - Parses PickleBros format correctly
    - Matches Python output

- [ ] **P1-PARSER-5:** Unit tests for all parsers
  - **Files:** `/packages/core/src/__tests__/game-types.test.ts`
  - **Implementation:**
    - Test DUPRLadderParser: valid input, invalid input, edge cases
    - Test PartnerDUPRParser: team parsing, rating calculation
    - Test PickleBrosParser: format-specific cases
  - **Acceptance Criteria:**
    - All tests pass
    - Coverage 90%+

- [ ] **P1-PARSER-6:** Parity tests vs Python fixtures
  - **Files:** `/packages/core/src/__tests__/game-types.parity.test.ts`
  - **Implementation:**
    - Load all Phase 0 fixtures
    - For each: parse with TS parser, compare output
  - **Acceptance Criteria:**
    - All fixture tests pass
    - Output 100% matches Python

---

### DUPRClient Module

- [ ] **P1-CLIENT-1:** Define API contract
  - **Files:** `/packages/core/src/dupr-client.ts`
  - **Implementation:**
    ```typescript
    export interface DUPRClient {
      searchPlayer(name: string): Promise<PlayerRecord>;
      searchPlayers(names: string[]): Promise<PlayerRecord[]>;
      refreshToken(token: string): Promise<TokenResponse>;
      getPlayerRating(duprId: string): Promise<number>;
    }
    
    export interface PlayerRecord {
      duprId: string;
      name: string;
      rating: number;
      updatedAt: Date;
    }
    
    export interface TokenResponse {
      token: string;
      expiresAt: Date;
      user: { name: string; rating: number };
    }
    ```
  - **Acceptance Criteria:**
    - API contract clear
    - Request/response shapes defined
    - Error types defined

- [ ] **P1-CLIENT-2:** Implement DUPRClient (with axios)
  - **Files:** `/packages/core/src/dupr-client.ts`
  - **Implementation:**
    ```typescript
    export class DUPRClientImpl implements DUPRClient {
      private axios: AxiosInstance;
      
      constructor(baseURL: string, token: string) {
        this.axios = axios.create({ baseURL, headers: { Authorization: `Bearer ${token}` } });
      }
      
      async searchPlayer(name: string): Promise<PlayerRecord> {
        // GET /api/players?search={name}
      }
      
      async searchPlayers(names: string[]): Promise<PlayerRecord[]> {
        // Call searchPlayer for each, handle rate limits
      }
    }
    ```
  - **Acceptance Criteria:**
    - HTTP calls use axios
    - Token passed in Authorization header
    - Error handling for 404, 401, rate limits

- [ ] **P1-CLIENT-3:** Unit tests with mock API
  - **Files:** `/packages/core/src/__tests__/dupr-client.test.ts`
  - **Implementation:**
    - Mock axios responses
    - Test successful player lookup
    - Test missing player (404)
    - Test rate limit (429)
    - Test token expiration (401)
  - **Acceptance Criteria:**
    - All scenarios tested
    - Coverage 90%+
    - Mock API behaves like real DUPR API

---

### PlayerRegistry Module

- [ ] **P1-REGISTRY-1:** Create PlayerRegistry class
  - **Files:** `/packages/core/src/player-registry.ts`
  - **Implementation:**
    ```typescript
    export class PlayerRegistry {
      private overrides: Map<string, number> = new Map();
      private cache: Map<string, CachedPlayer> = new Map();
      
      addOverride(playerName: string, rating: number): void;
      removeOverride(playerName: string): void;
      getOverride(playerName: string): number | undefined;
      
      cachePlayer(player: PlayerRecord, ttlMs?: number): void;
      getCachedPlayer(name: string): PlayerRecord | undefined;
      
      getEffectiveRating(
        playerName: string,
        duprLookup?: (name: string) => Promise<number>
      ): Promise<number>;
    }
    
    interface CachedPlayer extends PlayerRecord {
      cachedAt: Date;
      ttlMs: number;
    }
    ```
  - **Acceptance Criteria:**
    - Overrides stored in memory
    - Cache with TTL works
    - Effective rating: override > cache > DUPR lookup

- [ ] **P1-REGISTRY-2:** Implement persistence (JSON file)
  - **Files:** `/packages/core/src/player-registry.ts`
  - **Implementation:**
    - Add `saveToFile(path: string)` method
    - Add `loadFromFile(path: string)` method
    - Format: JSON `{ overrides: { "John Smith": 4.5 }, ... }`
  - **Acceptance Criteria:**
    - Overrides saved to JSON
    - Loaded back correctly after restart

- [ ] **P1-REGISTRY-3:** Unit tests + parity tests
  - **Files:** `/packages/core/src/__tests__/player-registry.test.ts`
  - **Implementation:**
    - Test add/remove overrides
    - Test cache TTL expiration
    - Test effective rating priority
    - Parity tests vs Python
  - **Acceptance Criteria:**
    - All tests pass
    - Behavior matches Python

---

### HTML Generator Module

- [ ] **P1-HTMLGEN-1:** Create HTMLGenerator interface
  - **Files:** `/packages/core/src/html-generator.ts`
  - **Implementation:**
    ```typescript
    export interface HTMLGenerator {
      generateLadder(players: PlayerReference[]): string;
      generatePartner(teams: Team[]): string;
      generatePickleBros(game: ParsedGame): string;
    }
    
    export class DUPRHTMLGenerator implements HTMLGenerator {
      generateLadder(players: PlayerReference[]): string {
        // Sort by rating descending
        // Return HTML table with CSS
      }
    }
    ```
  - **Acceptance Criteria:**
    - Generators return valid HTML
    - Output matches Python CSS/layout

- [ ] **P1-HTMLGEN-2:** Implement all three generators
  - **Files:** `/packages/core/src/html-generator.ts`
  - **Implementation:**
    - generateLadder: table with name + rating
    - generatePartner: table with team1 + team2 + team rating
    - generatePickleBros: format-specific layout
  - **Acceptance Criteria:**
    - All three formats generate valid HTML
    - CSS is print-friendly

- [ ] **P1-HTMLGEN-3:** Unit + snapshot tests
  - **Files:** `/packages/core/src/__tests__/html-generator.test.ts`
  - **Implementation:**
    - Test HTML structure
    - Snapshot tests: compare to Python outputs
  - **Acceptance Criteria:**
    - HTML valid
    - Snapshots match Python outputs
    - Coverage 90%+

---

### Integration Tests

- [ ] **P1-INTEG-1:** End-to-end test: parse → lookup → generate
  - **Files:** `/packages/core/src/__tests__/integration.test.ts`
  - **Implementation:**
    - Load fixture: player input
    - Parse with appropriate GameTypeParser
    - Mock DUPRClient to return ratings
    - Generate HTML
    - Compare to fixture expected output
  - **Acceptance Criteria:**
    - Full pipeline works
    - Output matches fixtures

- [ ] **P1-COVERAGE-1:** Validate 90%+ test coverage
  - **Files:** (run jest --coverage)
  - **Implementation:**
    - Run coverage report
    - Identify and fix gaps
  - **Acceptance Criteria:**
    - Coverage report shows 90%+ for src/

---

## 📋 PHASE 2 - React Native Project Setup

### Project Initialization

- [ ] **P2-INIT-1:** Create React Native project scaffold
  - **Files:** `/packages/mobile/app.json`, `/packages/mobile/package.json`
  - **Implementation:**
    - `npx expo init mobile`
    - Configure TypeScript, ESLint, Prettier
    - Add @dupr/core as dependency
  - **Acceptance Criteria:**
    - Project builds: `npm run ios` or `npm run android`
    - @dupr/core imports work

- [ ] **P2-INIT-2:** Configure monorepo structure
  - **Files:** `/package.json` (root), `/packages/*/package.json`
  - **Implementation:**
    - Set up npm/yarn workspaces
    - Root package.json references both core + mobile
  - **Acceptance Criteria:**
    - `npm run test` runs tests in both packages
    - `npm run build` builds both packages

- [ ] **P2-INIT-3:** Add required dependencies
  - **Files:** `/packages/mobile/package.json`
  - **Implementation:**
    ```json
    {
      "@react-navigation/native": "^6.x",
      "@react-navigation/bottom-tabs": "^6.x",
      "axios": "^1.7",
      "zustand": "^4.5",
      "expo-secure-store": "^13.x",
      "react-native-webview": "^13.x",
      "expo-print": "^13.x",
      "expo-sharing": "^14.x"
    }
    ```
  - **Acceptance Criteria:**
    - All dependencies install without conflict
    - App still builds after adding deps

---

### State Management

- [ ] **P2-STATE-1:** Create Zustand store for auth state
  - **Files:** `/packages/mobile/src/stores/authStore.ts`
  - **Implementation:**
    ```typescript
    interface AuthState {
      token: string | null;
      user: { name: string; rating: number } | null;
      isLoading: boolean;
      error: string | null;
      
      setToken(token: string): void;
      setUser(user: AuthState['user']): void;
      setError(error: string | null): void;
      logout(): void;
    }
    
    export const useAuthStore = create<AuthState>((set) => ({
      token: null,
      user: null,
      isLoading: false,
      error: null,
      setToken: (token) => set({ token }),
      // ...
    }));
    ```
  - **Acceptance Criteria:**
    - Store created and working
    - Can set/get auth state
    - Can be imported and used in components

- [ ] **P2-STATE-2:** Create Zustand store for game state
  - **Files:** `/packages/mobile/src/stores/gameStore.ts`
  - **Implementation:**
    ```typescript
    interface GameState {
      format: 'ladder' | 'partner' | 'picklebros' | null;
      players: PlayerReference[];
      teams: Team[];
      results: ParsedGame | null;
      html: string | null;
      
      setFormat(format: GameState['format']): void;
      setPlayers(players: PlayerReference[]): void;
      setResults(results: ParsedGame): void;
      reset(): void;
    }
    ```
  - **Acceptance Criteria:**
    - Store created
    - Can manage game state across screens

---

## 📋 PHASE 3 - Authentication Implementation

### Auth Screens

- [ ] **P3-LOGIN-1:** Create LoginScreen component
  - **Files:** `/packages/mobile/src/screens/LoginScreen.tsx`
  - **Implementation:**
    ```typescript
    export const LoginScreen: React.FC = () => {
      const { setToken, setUser, error, isLoading } = useAuthStore();
      
      // Render WebView if WebView auth chosen
      // OR form fields if Direct API chosen
      // On success: call setToken + setUser
      // On error: call setError
      
      return (
        <View>
          {/* WebView or Form */}
          {error && <Text>{error}</Text>}
        </View>
      );
    };
    ```
  - **Acceptance Criteria:**
    - Component renders WebView or form
    - Can handle login
    - Error messages display

- [ ] **P3-LOGIN-2:** Implement WebView token capture (if WebView auth)
  - **Files:** `/packages/mobile/src/screens/LoginScreen.tsx`
  - **Implementation:**
    - Use WebView to load DUPR login
    - Inject JS to capture token (from Spike findings)
    - Call `setToken` on successful capture
  - **Acceptance Criteria:**
    - Token captured from WebView
    - Stored in auth store
    - User can proceed to main app

- [ ] **P3-LOGIN-3:** Implement form-based login (if Direct API auth)
  - **Files:** `/packages/mobile/src/screens/LoginScreen.tsx`
  - **Implementation:**
    - Create form with username + password inputs
    - POST to DUPR endpoint (from Spike findings)
    - Handle response: extract token, call setToken
  - **Acceptance Criteria:**
    - Form renders
    - Can submit credentials
    - Token obtained + stored

- [ ] **P3-TOKEN-1:** Implement token secure storage
  - **Files:** `/packages/mobile/src/services/tokenStorage.ts`
  - **Implementation:**
    ```typescript
    export class TokenStorage {
      async saveToken(token: string): Promise<void> {
        await SecureStore.setItemAsync('dupr_token', token);
      }
      
      async getToken(): Promise<string | null> {
        return await SecureStore.getItemAsync('dupr_token');
      }
      
      async deleteToken(): Promise<void> {
        await SecureStore.deleteItemAsync('dupr_token');
      }
    }
    ```
  - **Acceptance Criteria:**
    - Token stored in secure storage (not AsyncStorage)
    - Can retrieve token after app restart
    - Can delete token

- [ ] **P3-TOKEN-2:** Implement token persistence on app launch
  - **Files:** `/packages/mobile/src/App.tsx`
  - **Implementation:**
    - On app launch: check TokenStorage for saved token
    - If found: load token + user into auth store
    - If not: show LoginScreen
  - **Acceptance Criteria:**
    - User stays logged in after app restart
    - Token is loaded from secure storage

- [ ] **P3-LOGOUT-1:** Implement logout functionality
  - **Files:** `/packages/mobile/src/services/authService.ts`
  - **Implementation:**
    ```typescript
    export async function logout() {
      await TokenStorage.deleteToken();
      useAuthStore.setState({ token: null, user: null });
    }
    ```
  - **Acceptance Criteria:**
    - Token cleared from storage
    - Auth state reset
    - User returned to LoginScreen

---

### Navigation Setup

- [ ] **P3-NAV-1:** Create bottom tab navigator
  - **Files:** `/packages/mobile/src/navigation/TabNavigator.tsx`
  - **Implementation:**
    - Set up React Navigation bottom tabs
    - Screen 1: Game Input (GameTypeSelector + PlayerInput)
    - Screen 2: Results
    - Screen 3: Settings
  - **Acceptance Criteria:**
    - Tabs visible and navigable
    - Each tab shows corresponding screen

- [ ] **P3-NAV-2:** Create root navigator (Login vs App)
  - **Files:** `/packages/mobile/src/navigation/RootNavigator.tsx`
  - **Implementation:**
    - If token exists: show TabNavigator
    - If no token: show LoginScreen
  - **Acceptance Criteria:**
    - Navigation switches based on auth state

---

## 📋 PHASE 4 - MVP DUPR Ladder

### UI Screens

- [ ] **P4-SCREEN-1:** Create GameTypeSelector screen
  - **Files:** `/packages/mobile/src/screens/GameTypeScreen.tsx`
  - **Implementation:**
    ```typescript
    export const GameTypeScreen: React.FC = () => {
      const { setFormat } = useGameStore();
      
      return (
        <View>
          <Text>Select Format</Text>
          <TouchableOpacity onPress={() => setFormat('ladder')}>
            <Text>DUPR Ladder</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFormat('partner')}>
            <Text>Partner DUPR</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFormat('picklebros')}>
            <Text>PickleBros</Text>
          </TouchableOpacity>
        </View>
      );
    };
    ```
  - **Acceptance Criteria:**
    - Three buttons render
    - Can select format
    - Format stored in gameStore

- [ ] **P4-SCREEN-2:** Create PlayerInputScreen
  - **Files:** `/packages/mobile/src/screens/PlayerInputScreen.tsx`
  - **Implementation:**
    ```typescript
    export const PlayerInputScreen: React.FC = () => {
      const [input, setInput] = useState('');
      const { setPlayers, format } = useGameStore();
      
      const handlePaste = () => {
        // Parse input based on format
        // Validate
        // setPlayers + navigate to results
      };
      
      return (
        <View>
          <TextInput
            multiline
            placeholder="Paste player names (one per line)"
            value={input}
            onChangeText={setInput}
          />
          <Button title="Get Results" onPress={handlePaste} />
        </View>
      );
    };
    ```
  - **Acceptance Criteria:**
    - TextInput renders
    - Can paste player names
    - Can submit for processing

- [ ] **P4-SCREEN-3:** Create ResultsScreen (Ladder)
  - **Files:** `/packages/mobile/src/screens/ResultsScreen.tsx`
  - **Implementation:**
    - Render sortable table: Name | Rating
    - Show loading while fetching
    - Show error if lookup fails
  - **Acceptance Criteria:**
    - Table renders with player data
    - Sorted by rating (descending)
    - Shows loading/error states

---

### Integration with Core Logic

- [ ] **P4-LOGIC-1:** Create GameService
  - **Files:** `/packages/mobile/src/services/gameService.ts`
  - **Implementation:**
    ```typescript
    export class GameService {
      constructor(duprClient: DUPRClient, playerRegistry: PlayerRegistry) {}
      
      async processLadder(playerNames: string[]): Promise<ParsedGame> {
        const parser = new DUPRLadderParser();
        const parsed = parser.parse(playerNames.join('\n'));
        
        // Lookup each player
        // Apply overrides
        // Return results
      }
    }
    ```
  - **Acceptance Criteria:**
    - Service can process player input
    - Returns parsed game with ratings
    - Handles errors

- [ ] **P4-LOGIC-2:** Wire PlayerInputScreen to GameService
  - **Files:** `/packages/mobile/src/screens/PlayerInputScreen.tsx`
  - **Implementation:**
    - Parse input using appropriate parser
    - Call GameService.processLadder
    - Handle loading + errors
    - Navigate to ResultsScreen
  - **Acceptance Criteria:**
    - Full flow works: input → parse → lookup → results
    - Loading spinner shows while processing
    - Errors display clearly

- [ ] **P4-LOGIC-3:** Wire ResultsScreen to parsed results
  - **Files:** `/packages/mobile/src/screens/ResultsScreen.tsx`
  - **Implementation:**
    - Get results from gameStore
    - Display in table format
    - Generate HTML for export (Phase 6)
  - **Acceptance Criteria:**
    - Results display correctly
    - All player data shown

---

### Testing

- [ ] **P4-TEST-1:** E2E test: Ladder format flow
  - **Files:** `/packages/mobile/src/__tests__/ladder-flow.test.tsx`
  - **Implementation:**
    - Mock DUPR client with fixture data
    - Render GameTypeScreen → select Ladder
    - Enter player names
    - Verify results displayed correctly
  - **Acceptance Criteria:**
    - Full flow tested
    - Results match mock data

- [ ] **P4-MANUAL-1:** Manual testing on Android emulator
  - **Implementation:**
    - Build APK
    - Test login flow
    - Test entering player names
    - Test results display
  - **Acceptance Criteria:**
    - App launches on Android
    - All steps work
    - No crashes

- [ ] **P4-MANUAL-2:** Manual testing on physical Android device
  - **Implementation:**
    - Deploy APK to real device
    - Repeat P4-MANUAL-1 tests
  - **Acceptance Criteria:**
    - App works on real hardware
    - UI responsive
    - No performance issues

---

## 📋 PHASE 5 - Partner DUPR + PickleBros

### Partner DUPR Implementation

- [ ] **P5-LADDER-1:** Extend PlayerInputScreen for team input
  - **Files:** `/packages/mobile/src/screens/PlayerInputScreen.tsx`
  - **Implementation:**
    - If format === 'partner': show instructions for team pairs
    - Accept "Player1 / Player2" format
  - **Acceptance Criteria:**
    - Form accepts team pairs
    - Validation works

- [ ] **P5-LADDER-2:** Implement Partner DUPR game flow
  - **Files:** `/packages/mobile/src/services/gameService.ts`
  - **Implementation:**
    ```typescript
    async processPartner(teamInput: string[]): Promise<ParsedGame> {
      const parser = new PartnerDUPRParser();
      const parsed = parser.parse(teamInput.join('\n'));
      // Lookup each player in teams
      // Calculate team ratings
    }
    ```
  - **Acceptance Criteria:**
    - Teams parsed correctly
    - Team ratings calculated
    - Results match fixtures

- [ ] **P5-LADDER-3:** Parity tests for Partner DUPR
  - **Files:** `/packages/mobile/src/__tests__/partner-parity.test.tsx`
  - **Implementation:**
    - Load Phase 0 Partner DUPR fixtures
    - Process each fixture
    - Compare to expected output
  - **Acceptance Criteria:**
    - All fixtures pass
    - Output 100% matches Python

---

### PickleBros Implementation

- [ ] **P5-PICKLE-1:** Implement PickleBros game flow
  - **Files:** `/packages/mobile/src/services/gameService.ts`
  - **Implementation:**
    ```typescript
    async processPickleBros(input: string[]): Promise<ParsedGame> {
      // Use PickleBrosParser from @dupr/core
      // Process results
    }
    ```
  - **Acceptance Criteria:**
    - PickleBros format parsed correctly
    - Results match fixtures

- [ ] **P5-PICKLE-2:** Parity tests for PickleBros
  - **Files:** `/packages/mobile/src/__tests__/picklebros-parity.test.tsx`
  - **Implementation:**
    - Load Phase 0 PickleBros fixtures
    - Process each
    - Compare to expected
  - **Acceptance Criteria:**
    - All fixtures pass

---

### Validation

- [ ] **P5-VALIDATE-1:** Manual testing all three formats
  - **Implementation:**
    - Test Ladder on physical device
    - Test Partner DUPR on physical device
    - Test PickleBros on physical device
  - **Acceptance Criteria:**
    - All three formats work correctly
    - Results display properly
    - No crashes

---

## 📋 PHASE 6 - Polish & Export/Sharing

### HTML Report Generation

- [ ] **P6-HTML-1:** Wire HTML generator to results
  - **Files:** `/packages/mobile/src/screens/ResultsScreen.tsx`
  - **Implementation:**
    - Import HTMLGenerator from @dupr/core
    - Generate HTML from parsed results
    - Store in gameStore
  - **Acceptance Criteria:**
    - HTML generated correctly
    - Ready for export

- [ ] **P6-HTML-2:** Create ReportViewScreen (preview)
  - **Files:** `/packages/mobile/src/screens/ReportViewScreen.tsx`
  - **Implementation:**
    - Display HTML in WebView (read-only)
    - Show export options below
  - **Acceptance Criteria:**
    - HTML renders in WebView
    - Clean presentation

---

### Export & Sharing

- [ ] **P6-EXPORT-1:** Implement Copy to Clipboard
  - **Files:** `/packages/mobile/src/services/exportService.ts`
  - **Implementation:**
    ```typescript
    export async function copyResultsToClipboard(html: string) {
      // Use expo-clipboard or native clipboard
      await Clipboard.setStringAsync(html);
    }
    ```
  - **Acceptance Criteria:**
    - HTML copied to clipboard
    - Can paste into email/messenger

- [ ] **P6-EXPORT-2:** Implement Share via share sheet
  - **Files:** `/packages/mobile/src/services/exportService.ts`
  - **Implementation:**
    ```typescript
    export async function shareResults(html: string) {
      await Share.share({ message: html, url: 'file://...' });
    }
    ```
  - **Acceptance Criteria:**
    - Native share sheet opens
    - Can share via email, messaging, etc.

- [ ] **P6-EXPORT-3:** Implement Save to Device
  - **Files:** `/packages/mobile/src/services/exportService.ts`
  - **Implementation:**
    - Use expo-file-system to save HTML
    - Save to Documents or Downloads
  - **Acceptance Criteria:**
    - File saved to device
    - Can open in file explorer

- [ ] **P6-EXPORT-4:** Implement Print via expo-print
  - **Files:** `/packages/mobile/src/services/exportService.ts`
  - **Implementation:**
    ```typescript
    export async function printResults(html: string) {
      await Print.printAsync({ html });
    }
    ```
  - **Acceptance Criteria:**
    - Print dialog opens
    - Can save as PDF or print to printer

---

### Player Overrides

- [ ] **P6-OVERRIDE-1:** Create SettingsScreen
  - **Files:** `/packages/mobile/src/screens/SettingsScreen.tsx`
  - **Implementation:**
    - List current overrides
    - Add new override: form with player name + rating
    - Delete override: swipe or button
  - **Acceptance Criteria:**
    - Can add overrides
    - Can delete overrides
    - List displays all overrides

- [ ] **P6-OVERRIDE-2:** Integrate overrides into game flow
  - **Files:** `/packages/mobile/src/services/gameService.ts`
  - **Implementation:**
    - Load overrides from PlayerRegistry
    - Apply to all game flows
  - **Acceptance Criteria:**
    - Overrides used in lookups
    - Results reflect overrides

---

### UX Polish

- [ ] **P6-UX-1:** Implement dark mode
  - **Files:** `/packages/mobile/src/themes/` (create)
  - **Implementation:**
    - Define light + dark color schemes
    - Use throughout app
  - **Acceptance Criteria:**
    - Dark mode toggle works
    - All screens readable in both modes

- [ ] **P6-UX-2:** Add keyboard handling for small screens
  - **Files:** `/packages/mobile/src/screens/PlayerInputScreen.tsx`
  - **Implementation:**
    - Use KeyboardAvoidingView
    - Adjust layout when keyboard visible
  - **Acceptance Criteria:**
    - Input fields not covered by keyboard
    - Scrollable if content doesn't fit

- [ ] **P6-UX-3:** Implement virtualized list for large results
  - **Files:** `/packages/mobile/src/screens/ResultsScreen.tsx`
  - **Implementation:**
    - If >50 players: use FlatList with virtualization
    - Otherwise: regular ScrollView
  - **Acceptance Criteria:**
    - Smooth scrolling with 100+ players
    - No performance lag

---

## 📋 PHASE 7 - Testing & Release Prep

### Automated Testing

- [ ] **P7-TEST-1:** Full test coverage for @dupr/core
  - **Implementation:**
    - Run: `npm run test -w core --coverage`
    - Achieve 90%+ coverage
  - **Acceptance Criteria:**
    - Coverage report shows 90%+
    - All critical paths tested

- [ ] **P7-TEST-2:** Integration tests for mobile app
  - **Files:** `/packages/mobile/src/__tests__/integration/`
  - **Implementation:**
    - Test full flows: login → input → results → export
    - Mock DUPR API
    - Verify correct behavior
  - **Acceptance Criteria:**
    - All flows tested
    - Coverage 80%+

- [ ] **P7-TEST-3:** Snapshot tests for HTML outputs
  - **Files:** `/packages/core/src/__tests__/snapshots/`
  - **Implementation:**
    - Snapshot each HTML output from generators
    - Regression detection on future changes
  - **Acceptance Criteria:**
    - Snapshots created + committed
    - Can detect regressions

---

### Manual Testing

- [ ] **P7-MANUAL-1:** Device matrix testing (Android)
  - **Implementation:**
    - Test on Android 7.0 (min supported)
    - Test on Android 10 (mid-range)
    - Test on Android 14 (latest)
    - Test on different screen sizes
  - **Acceptance Criteria:**
    - App works on all tested versions
    - UI scales correctly
    - No crashes

- [ ] **P7-MANUAL-2:** Edge case testing
  - **Implementation:**
    - Test slow network (throttled)
    - Test token expiration + refresh
    - Test invalid input (empty, special chars)
    - Test offline mode (fail gracefully)
  - **Acceptance Criteria:**
    - All edge cases handled
    - No crashes
    - User sees clear error messages

---

### Release Preparation

- [ ] **P7-RELEASE-1:** Set up Sentry crash reporting
  - **Files:** `/packages/mobile/src/services/crash-reporting.ts`
  - **Implementation:**
    - Initialize Sentry SDK
    - Capture exceptions + errors
  - **Acceptance Criteria:**
    - Sentry configured
    - Can monitor crashes post-release

- [ ] **P7-RELEASE-2:** Create release notes + version
  - **Files:** `/packages/mobile/app.json`, `/RELEASE_NOTES.md`
  - **Implementation:**
    - Update version to 1.0.0
    - Document features in release notes
  - **Acceptance Criteria:**
    - Version bumped
    - Release notes clear + complete

- [ ] **P7-RELEASE-3:** Prepare privacy policy + ToS
  - **Files:** `/PRIVACY_POLICY.md`, `/TERMS_OF_SERVICE.md`
  - **Implementation:**
    - Document data collection (none except token)
    - Document DUPR API usage
    - Document limitations
  - **Acceptance Criteria:**
    - Documents clear + legal-ready
    - Ready for Play Store

- [ ] **P7-RELEASE-4:** Build production APK
  - **Implementation:**
    - `npm run build:android`
    - Sign APK with release key
  - **Acceptance Criteria:**
    - Signed APK ready for Play Store
    - Size reasonable (~100MB max)

- [ ] **P7-RELEASE-5:** Submit to Google Play internal testing
  - **Implementation:**
    - Upload APK to internal testing track
    - Configure release notes
  - **Acceptance Criteria:**
    - Internal testing build available
    - Ready for beta testing

---

## 📋 PHASE 8 - iOS & App Store (OPTIONAL)

### iOS Testing

- [ ] **P8-IOS-1:** Test on iOS simulator
  - **Implementation:**
    - Run app on iOS simulator
    - Test all flows (login, input, results, export)
  - **Acceptance Criteria:**
    - App runs on iOS
    - All features work
    - No platform-specific crashes

- [ ] **P8-IOS-2:** Test on physical iPhone (if available)
  - **Implementation:**
    - Deploy to physical iPhone
    - Test real-world auth flow (WebView)
    - Test print/share on real device
  - **Acceptance Criteria:**
    - Works on real iPhone
    - Auth flow matches Android

---

### iOS App Store

- [ ] **P8-STORE-1:** Set up iOS app signing
  - **Implementation:**
    - Create Apple Developer account
    - Generate certificates + provisioning profiles
    - Configure in Expo
  - **Acceptance Criteria:**
    - Signing configured
    - Can build for iOS

- [ ] **P8-STORE-2:** Build iOS app for TestFlight
  - **Implementation:**
    - `eas build --platform ios`
    - Upload to TestFlight
  - **Acceptance Criteria:**
    - TestFlight build available
    - Ready for beta testing

- [ ] **P8-STORE-3:** Submit to App Store
  - **Implementation:**
    - Configure App Store Connect
    - Submit app for review
  - **Acceptance Criteria:**
    - App submitted for review
    - Awaiting Apple approval

---

## 📊 Task Count Summary

| Phase | Task Count | Est. Hours |
|-------|-----------|-----------|
| Spike | 24 | 16-20 |
| Phase 0 | 12 | 8-10 |
| Phase 1 | 26 | 24-32 |
| Phase 2 | 6 | 8-10 |
| Phase 3 | 12 | 12-16 |
| Phase 4 | 10 | 12-16 |
| Phase 5 | 10 | 8-12 |
| Phase 6 | 14 | 16-20 |
| Phase 7 | 13 | 16-20 |
| Phase 8 | 9 | 12-16 |
| **TOTAL** | **136** | **132-172** |

---

**Document Status:** ACTIVE (Living Document)  
**Last Updated:** 2026-01-29  
**How to Update:** Check task when complete, commit with task ID in message
