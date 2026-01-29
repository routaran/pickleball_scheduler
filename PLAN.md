# Android/iOS Mobile App - Implementation Plan

## Problem Statement

The current DUPR Pickleball Scheduler works well as a desktop application (Windows/Linux console-based), but requires:
1. A mobile-friendly UI (console interaction is not suitable for phones)
2. Alternative authentication approach (Playwright cannot be used on mobile)
3. Cross-platform support (Android and iOS eventually)
4. Feature parity with the desktop application

**Scope:** Extract proven core logic into shared TypeScript module, validate mobile auth approach, then build cross-platform UI with feature parity to desktop.

**Key Principle:** Avoid rewriting proven logic; extract and test incrementally against known-good outputs.

---

## Current Application Architecture

**Desktop App (Python):**
- Authentication: Browser-based login via Playwright, captures `dupr_access_token` cookie
- Core Logic: 
  - DUPR API client for player lookup
  - Player search with fuzzy matching
  - HTML report generation (DUPR Ladder, Partner DUPR, PickleBros formats)
  - Config management (tokens, user info, player overrides)
- Input: Console-based interactive prompts
- Output: Auto-opens HTML in browser

**Key Modules:**
- `auth.py` - Playwright-based browser login
- `dupr_client.py` - DUPR API interactions
- `player_search.py` - Fuzzy matching player lookup
- `game_types.py` - Game format logic
- `html_generator.py` - Report generation

---

## Critical Unknowns (Blocking Decisions)

**Must resolve before finalizing stack:**
1. **DUPR Authentication on Mobile** - Can WebView capture auth token? Do cookies work? CORS? Token endpoint?
   - **Blocker:** iOS WKWebView blocks third-party cookies by default; many SSO pages set HttpOnly/Secure cookies inaccessible to JS
   - **Status:** UNVALIDATED - requires 1-2 day spike
   
2. **DUPR API Surface** - Public API? Rate limits? Token refresh? Error handling?
   - **Status:** UNVALIDATED - needs documentation review + testing
   
3. **Feature Parity Definition** - What exactly must work identically?
   - **Status:** UNDEFINED - need acceptance criteria checklist per format

---

## Chosen Architecture: Expo-Managed React Native (TypeScript)

I’m locking the decision to Expo-managed React Native for speed, long-term maintainability, and lower mobile expertise requirements. We will only drop to bare React Native if the auth spike proves we need a custom native module that Expo config plugins cannot cover.

**Why Expo-managed RN:**
- ✅ Single codebase for Android + iOS with OTA updates (EAS) and simpler tooling
- ✅ Good defaults for new mobile developers (build service, diagnostics, assets)
- ✅ Secure storage, sharing, printing available as first-party Expo modules
- ⚠️ If WebView auth needs deeper cookie control than Expo offers, we’ll migrate to bare RN (decision gate stays in Spike Phase)

**Stack (pre-selected):**
- **Framework:** Expo-managed React Native (React Native 0.76 via Expo SDK 51/52 equivalent)
- **Language:** TypeScript
- **State:** Zustand
- **Storage:** `expo-secure-store` for tokens/user info (no plain AsyncStorage for secrets)
- **HTTP:** Axios with interceptors for auth
- **Navigation:** React Navigation (Expo-ready)
- **Report/Export:** Generate responsive HTML, render in WebView, share/print via `expo-print` + `expo-sharing`
- **Testing:** Jest + react-native-testing-library + parity tests vs Python fixtures

**Architecture Primer (for non-mobile devs):**
- Expo-managed RN = batteries-included toolchain (builds, OTA updates, config) with minimal native code. Great for small teams and faster releases.
- Bare RN = full control of native code. Only needed if we must write custom native modules (e.g., exotic cookie handling). Migration path exists, but we start with Expo to reduce complexity.
- Secure storage, sharing, printing, and WebView are available as Expo modules; we avoid hand-writing native code unless the auth spike proves necessary.

---

## Implementation Plan (Risk-Reduced, MVP-Oriented)

### Spike Phase (1-2 days) - BLOCKER - Must Complete First
**Goal:** Validate mobile auth approach + report export strategy; de-risk critical unknowns

#### Auth Validation (Parallel Tracks)

**Track A: WebView Auth (Primary)**
- [ ] **Device Setup:** Get Android emulator + iOS simulator running
- [ ] **WebView Cookie Capture**
  - [ ] Document exact login flow on dashboard.dupr.com (cookies, redirects, token location)
  - [ ] Test WebView cookie capture on Android + iOS emulator
  - [ ] Check if DUPR sets HttpOnly/Secure flags (blocks JS access)
  - [ ] Check for CORS preflight requirements
  - [ ] Test if token is accessible via response headers vs cookies
  - [ ] **Decision:** WebView viable? → Continue with Expo-managed RN

**Track B: Direct DUPR API (Plan B, Low Effort)**
- [ ] Scan DUPR API documentation or GitHub for login endpoint
- [ ] Test: `POST /api/login` or similar with credentials
- [ ] If found and works: document endpoint, becomes fallback auth if WebView fails
- [ ] If not found: plan is WebView-only; document for future reference

#### Report Export Validation

**Track C: expo-print + Android Output**
- [ ] **Render Sample HTML** (copy from desktop app output)
- [ ] **Test on Android Emulator:**
  - [ ] Call `Print.printAsync()` on generated HTML
  - [ ] Check PDF output margins, rendering, readability
  - [ ] Verify "print to PDF" dialog appears and works
- [ ] **Test on 1 Physical Android Device:**
  - [ ] Confirm OEM print system works (varies by manufacturer)
  - [ ] Check margins and output quality on real hardware
- [ ] **Decision Output:**
  - [ ] If reliable: Use `expo-print` for PDF export
  - [ ] If shaky/inconsistent: Fall back to HTML export + `expo-sharing` (share text/HTML) + Copy to Clipboard (minimum viable)

#### Spike Go/No-Go Checklist (Blocker)
**Must complete ALL items below to proceed to Phase 0. If ANY item is incomplete or "no," escalate immediately.**

**WebView Auth Track A - MUST PASS:**
- [ ] **Token Captured:** Token successfully extracted from WebView on Android emulator AND iOS simulator
  - Document exact location: Response header? Cookie? JavaScript variable?
  - Document exact token value format (JWT, opaque string, length range)
- [ ] **Security Flags Documented:** HttpOnly flag? Secure flag? Domain? SameSite policy?
  - If HttpOnly: JS cannot access → need native bridge (Plan B or bare RN)
  - If accessible: Continue with Expo
- [ ] **Platform Compatibility:** Token capture works identically on both Android + iOS sims (or document differences)
- [ ] **App Restart Persistence:** 
  - Capture token → Store in secure storage
  - Close + restart app → Verify token is still accessible (not lost)
- [ ] **Error Handling Validated:**
  - Invalid credentials → Clear error message displayed
  - Network timeout → Graceful failure (not hung browser)
  - Token expiration → Re-auth flow triggered

**Direct API Track B - IF WebView FAILS:**
- [ ] **Endpoint Found:** DUPR API docs or reverse-engineered endpoint identified
- [ ] **POST Request Works:** Send credentials → Receive token response (HTTP 200)
- [ ] **Token Format Consistent:** Response includes token, username, rating (or equivalent)

**Report Export Track C - MUST PASS (If expo-print selected):**
- [ ] **HTML → PDF Conversion:** Sample HTML renders correctly in PDF output
- [ ] **Margins Acceptable:** Tested on both emulator + 1 physical Android device
- [ ] **Fallback Documented:** If unreliable, `expo-sharing` + Copy to Clipboard plan ready to implement

#### Decision Gates
- [ ] **Go (Expo-Managed RN):** WebView auth ALL items passed + export strategy confirmed
- [ ] **Go (Direct API):** WebView failed BUT direct API Track B ALL items passed
- [ ] **No-Go / Escalate:** Both WebView AND direct API failed, OR token capture broken on one platform
- [ ] **Bare RN Eject (if needed):** If WebView auth requires deeper native hooks → migrate entire app to bare RN in Week 1-2 (not hybrid split). Clean break, avoid build complexity + maintenance tax.

---

### Phase 0: Feature Parity Definition & Test Fixtures
**Goal:** Create measurable acceptance criteria before coding

- [ ] **Extract Sample Test Cases from Existing App**
  - [ ] DUPR Ladder: 5-10 player names → verify output format, rating sorting, edge cases
  - [ ] Partner DUPR: 4-10 player names (teams) → verify team rating math, output
  - [ ] PickleBros: specific format → verify parsing, output
  - [ ] Edge cases: duplicate names, ratings not found, invalid input, empty lists

- [ ] **Document Feature Requirements**
  - [ ] Input format validation rules (what's allowed/rejected?)
  - [ ] Player lookup: fuzzy matching behavior (typos, nicknames, partial names?)
  - [ ] Override behavior: when/how are manual overrides applied?
  - [ ] Error messages: what should user see for each error state?
  - [ ] Output: HTML format, sorting, fields, presentation?

- [ ] **Create Parity Test Fixtures**
  - Store Python app outputs for reference test cases
  - Store sample inputs (CSV, plaintext) with known expected outputs
  - Create checklist of acceptance criteria per format

- [ ] **Deliverable:** `FEATURE_PARITY.md` with test matrix (inputs → expected outputs)

---

### Phase 1: Extract & Test Core Business Logic (TypeScript, No UI)
**Goal:** Port proven logic before building UI; validate against Python outputs

- [ ] **Initialize TypeScript Project**
  - Pure Node.js TypeScript library (NOT React Native yet)
  - Can run tests in Node, easier than RN testing
  - Later: import into React Native app

- [ ] **Port Core Modules (with unit tests using fixtures)**
  - [ ] **`PlayerSearch`** - fuzzy matching (fuse.js or similar)
    - [ ] Test cases: exact match, typo tolerance, partial names
    - [ ] Parity tests vs Python `player_search.py` outputs
  
  - [ ] **`GameTypeParser`** - parse DUPR Ladder, Partner DUPR, PickleBros
    - [ ] Input validation
    - [ ] Test cases: valid, invalid, edge cases
    - [ ] Parity tests vs `game_types.py`
  
  - [ ] **`DUPRClient`** - mock HTTP layer for player lookup
    - [ ] API contract definition (request/response shapes)
    - [ ] Error handling (404, 401, rate limits)
    - [ ] Token refresh logic
  
  - [ ] **`PlayerRegistry`** - override management, caching
    - [ ] Load/save overrides from JSON
    - [ ] Cache invalidation strategy (TTL?)
    - [ ] Parity tests vs Python outputs

- [ ] **Deliverable:** `@dupr/core` TypeScript package with 90%+ test coverage, all tests passing against Python fixtures

---

### Phase 2: Stack Finalization & Project Setup
**Goal:** Lock decisions, initialize React Native project**

- [ ] **Post-Spike Decisions**
  - [ ] Finalize: Expo vs bare RN
  - [ ] Choose config plugins if needed (secure storage, PDF)
  - [ ] Update dependency versions (react-native 0.76+ LTS, others current)
  - [ ] Finalize state manager (Zustand recommended)

- [ ] **Initialize React Native Project**
  - [ ] Scaffold project with chosen approach (npx expo init or bare init)
  - [ ] Structure:
    - `/packages/core/` - TypeScript business logic (from Phase 1)
    - `/packages/mobile/` - React Native UI
  - [ ] Configure TypeScript, ESLint, Prettier
  - [ ] Set up CI/CD skeleton (GitHub Actions for tests, builds)

- [ ] **Security Checklist**
  - [ ] Token storage: encrypted (react-native-keychain or expo-secure-store)
  - [ ] Credential handling: never log credentials or tokens
  - [ ] App lock on resume if token present
  - [ ] Review DUPR ToS for compliance (scraping, rate limits, data retention)

- [ ] **Deliverable:** React Native project scaffold with core logic imported and working

---

### Phase 3: Authentication Implementation (Spike Result Applied)
**Goal:** Functional login flow on device

- [ ] **Implement Auth Module** (based on spike findings)
  - [ ] WebView login wrapper (if WebView auth chosen)
  - [ ] Or: Direct API login form (if API endpoint available)
  - [ ] Token/user info persistence (secure storage)
  - [ ] Token refresh on expiration
  - [ ] Logout functionality

- [ ] **Auth Screens**
  - [ ] Login screen (WebView or form)
  - [ ] Success: display user name + rating
  - [ ] Error handling: display meaningful messages
  - [ ] Re-auth button for expired tokens

- [ ] **Testing**
  - [ ] Manual testing on Android emulator + iOS simulator
  - [ ] Test token refresh flow
  - [ ] Test re-authentication on token expiration
  - [ ] Verify secure storage (token not visible in plain text)

- [ ] **Deliverable:** Functional auth flow, testable on physical device

---

### Phase 4: Delivery Slice 1 - Minimal DUPR Ladder (MVP)
**Goal:** End-to-end flow for simplest format (individual player ladder)

- [ ] **UI Screens**
  - [ ] Game type selector (radio: Ladder vs Partner vs PickleBros)
  - [ ] Player input screen (paste player names, one per line)
  - [ ] Input validation + error display
  - [ ] Results screen (sortable table: name, rating)

- [ ] **Integration**
  - [ ] Wire up core logic (GameTypeParser, PlayerSearch, DUPRClient)
  - [ ] Handle network calls + loading states
  - [ ] Handle errors gracefully

- [ ] **Testing**
  - [ ] End-to-end tests with mock DUPR API
  - [ ] Manual testing on Android device
  - [ ] Compare HTML output to desktop app (visual parity)

- [ ] **Deliverable:** Standalone APK for internal testing, Ladder format fully working

---

### Phase 5: Delivery Slice 2 - Partner DUPR + PickleBros
**Goal:** Add remaining game formats**

- [ ] **Partner DUPR Format**
  - [ ] Player input for team pairs
  - [ ] Team rating calculation (verify parity vs Python)
  - [ ] Results display with team ratings

- [ ] **PickleBros Format**
  - [ ] Format-specific parsing
  - [ ] Results display

- [ ] **Testing**
  - [ ] Parity tests for all formats
  - [ ] Manual testing on device

- [ ] **Deliverable:** Full feature set (all 3 game formats), internal beta build

---

### Phase 6: Polish & Export/Sharing
**Goal:** Production-ready UX

- [ ] **Report Generation**
  - [ ] HTML output (generated in-app, matches desktop format)
  - [ ] Copy results to clipboard
  - [ ] Share via email/messaging (native share sheet)
  - [ ] Save to device storage

- [ ] **Player Overrides**
  - [ ] Settings screen for manual player rating overrides
  - [ ] Load/save overrides persistently

- [ ] **UX Polish**
  - [ ] Keyboard handling on small screens
  - [ ] Long list scrolling (if many players)
  - [ ] Touch targets (minimum 44pt)
  - [ ] Dark mode support (if time permits)
  - [ ] Accessibility (screen reader basics)

- [ ] **Deliverable:** Feature-complete internal beta

---

### Phase 7: Testing, Device Validation & Release Prep
**Goal:** Ensure quality before app store

- [ ] **Automated Testing**
  - [ ] Unit tests for all core logic (from Phase 1)
  - [ ] Integration tests for screens + DUPR client (mocked)
  - [ ] Snapshot tests for HTML output
  - [ ] Parity tests: RN outputs vs Python fixtures (all formats)

- [ ] **Manual Device Testing**
  - [ ] Android device matrix (if possible: 2-3 device sizes/OS versions)
  - [ ] iOS simulator + physical device (if access)
  - [ ] Test scenarios: slow network, token expiration, invalid input, edge cases

- [ ] **Release Readiness**
  - [ ] Crash reporting (Sentry or similar)
  - [ ] Feature flags for auth fallbacks (in case auth fails on Play Store)
  - [ ] Release channels (Expo EAS internal testing / Google Play internal testing)
  - [ ] Version numbering, release notes
  - [ ] Privacy policy, ToS (for app store)

- [ ] **Deliverable:** Production-ready Android build, ready for Google Play

---

### Phase 8: iOS Adaptation & Cross-Platform Release
**Goal:** Ship to both platforms (if iOS support desired)

- [ ] **iOS-Specific Testing**
  - [ ] WKWebView auth flow validation (from spike, but device testing)
  - [ ] iOS-specific UI quirks (safe areas, home indicator, etc.)
  - [ ] Device testing on physical iPhone (if available)

- [ ] **App Store Submission**
  - [ ] iOS app signing, provisioning profiles, TestFlight
  - [ ] Play Store submission (if not already done in Phase 7)

- [ ] **Post-Release Monitoring**
  - [ ] Monitor crash reports
  - [ ] Gather user feedback on mobile-first workflows
  - [ ] Plan iterative improvements

- [ ] **Deliverable:** iOS + Android apps live on stores

---

## Offline & Caching Strategy

**To be defined after Phase 0 (parity requirements known):**
- [ ] Which player lookups are cached? (recent searches, local overrides)
- [ ] TTL for cache: 1 day? 7 days? Configurable?
- [ ] Cache invalidation: manual refresh button, or auto on app resume?
- [ ] Offline behavior: use cache or show error?
- [ ] Stale data warnings: notify user if cached data is old?

---

## Testing Strategy

| Layer | Tool | Focus |
|-------|------|-------|
| Business Logic | Jest | Unit tests for core TS modules; parity vs Python |
| Integration | Jest + mock API | Game flow end-to-end with canned DUPR responses |
| Snapshot | Jest | HTML output regression (compare to desktop app) |
| UI/Navigation | react-native-testing-library | Screen rendering, input, navigation |
| Manual/Device | Physical Android + iOS | Real-world auth flow, UI quirks, performance |
| Regression | Parity matrix | All test cases from Phase 0 verified |

---

## Dependencies (Aligned with Current LTS/Latest)

```json
{
  "expo": "^51",
  "react-native": "^0.76",
  "react": "^18.3",
  "@react-navigation/native": "^6.x",
  "@react-navigation/bottom-tabs": "^6.x",
  "axios": "^1.7",
  "zustand": "^4.5",
  "expo-secure-store": "^13.x",
  "expo-print": "^13.x",
  "expo-sharing": "^14.x",
  "react-native-webview": "^13.x",
  "typescript": "^5.x",
  "fuse.js": "^7.x",
  "jest": "^29.x",
  "react-native-testing-library": "^12.x"
}
```

**Note:** If spike reveals auth requires bare RN, swap `expo-*` modules for bare RN equivalents + `react-native-keychain` for secure storage.

---

## Risks & Mitigations (Revised)

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Auth doesn't work on device (spike fails both tracks)** | CRITICAL | Spike decision gate; have escalation plan (bare RN native bridge or pause) |
| **WebView auth works but expo-print unreliable** | Medium | Fall back to `expo-sharing` (HTML text share) + Copy to Clipboard |
| **Regressions in player logic** | High | Phase 1 parity tests with Python fixtures; comprehensive test coverage |
| **Feature scope creep** | Medium | Phase 0 acceptance criteria + delivery slices, phased rollout |
| **Cross-platform UI differences** | Medium | Consistent RN components; test on both platforms early |
| **Bare RN eject needed mid-project** | High | Spike validates early; if needed, migrate entire app in Week 1-2 (not hybrid split) |
| **DUPR API changes** | Low | Monitor API status; feature flags for graceful degradation |
| **App store rejection** | Low | Follow store guidelines early; test in EAS internal testing channel first |

---

## Success Criteria (Testable)

✅ **Auth Spike:** Token successfully captured on Android emulator + iOS simulator (WebView or API endpoint)  
✅ **Feature Parity:** All test cases from Phase 0 pass (Python vs RN outputs identical)  
✅ **Core Logic:** 90%+ unit test coverage, parity tests passing  
✅ **MVP Release:** DUPR Ladder format works end-to-end on physical Android device  
✅ **Full Feature Release:** All 3 game formats working, player overrides, export working  
✅ **Store Readiness:** App passes Play Store submission; crash-free on internal testing build  
✅ **Cross-Platform:** iOS app also functional (if iOS support pursued)

---

## Execution Timeline (Realistic, No Dates)

**Immediately (Spike):** 1-2 days → auth decision  
**Week 1-2:** Phase 0 (parity definition), Phase 1 (core logic)  
**Week 2-3:** Phase 2 (RN setup), Phase 3 (auth implementation)  
**Week 3-4:** Phase 4 (MVP Ladder)  
**Week 4-5:** Phase 5 (remaining formats)  
**Week 5-6:** Phase 6 (polish), Phase 7 (testing + store prep)  
**Week 6-7+:** Phase 8 (iOS, app store releases)

---

## Quick Wins (Immediate Priority Order)

1. **Run auth spike** (1-2 days) - Unblocks all downstream decisions
2. **Extract Python test fixtures** (1 day) - Define parity baseline
3. **Port core logic to TypeScript** (3-4 days) - Validate logic transfer before UI
4. **Lock tech stack post-spike** (0.5 day) - Avoid mid-project churn
5. **Initialize RN scaffold** (1 day) - Start UI infrastructure
6. **Implement Phase 4 MVP** (3-4 days) - Get something on device fast for feedback

**Rationale:** By week 2-3, have a working MVP on Android to validate UX assumptions and gather real device feedback. Helps catch issues early.
