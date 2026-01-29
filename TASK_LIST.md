# DUPR Mobile App - Living Task List

**Document Purpose:** Track task progress throughout implementation phases. Update this file as tasks are completed.

**Last Updated:** 2026-01-29  
**Current Phase:** Spike Phase (Blocker)  
**Overall Progress:** 0% (0/156 tasks complete)

---

## 📊 Progress Summary

| Phase | Total Tasks | Complete | In Progress | Pending | Status |
|-------|------------|----------|-------------|---------|--------|
| Spike | 24 | 0 | 0 | 24 | ⏳ Not Started |
| Phase 0 | 12 | 0 | 0 | 12 | ⏳ Blocked (awaiting Spike) |
| Phase 1 | 22 | 0 | 0 | 22 | ⏳ Blocked (awaiting Spike) |
| Phase 2 | 14 | 0 | 0 | 14 | ⏳ Blocked (awaiting Phase 1) |
| Phase 3 | 14 | 0 | 0 | 14 | ⏳ Blocked (awaiting Phase 2) |
| Phase 4 | 14 | 0 | 0 | 14 | ⏳ Blocked (awaiting Phase 3) |
| Phase 5 | 12 | 0 | 0 | 12 | ⏳ Blocked (awaiting Phase 4) |
| Phase 6 | 14 | 0 | 0 | 14 | ⏳ Blocked (awaiting Phase 5) |
| Phase 7 | 20 | 0 | 0 | 20 | ⏳ Blocked (awaiting Phase 6) |
| Phase 8 | 10 | 0 | 0 | 10 | ⏳ Optional (iOS) |
| **TOTAL** | **156** | **0** | **0** | **156** | **0%** |

---

# 🚀 SPIKE PHASE (BLOCKER - Must complete first)

**Phase Goal:** Validate mobile auth approach + report export strategy; de-risk critical unknowns  
**Estimated Duration:** 1-2 days  
**Blocker Status:** ⛔ MUST PASS to proceed to Phase 0

## Environment Setup
- [ ] SPIKE-1: Install Android SDK + emulator (API 28+ image)
- [ ] SPIKE-2: Install iOS simulator tools (Mac only, or note unavailable)
- [ ] SPIKE-3: Install Node.js + Expo CLI
- [ ] SPIKE-4: Document exact DUPR login flow (cookies, redirects, token location)

## Track A: WebView Auth Validation (PRIMARY)

### Android Emulator
- [ ] SPIKE-A1: Create minimal Expo app with WebView on Android emulator
- [ ] SPIKE-A2: Load dashboard.dupr.com in WebView, verify page loads
- [ ] SPIKE-A3: Document CORS/CSP issues (if any)
- [ ] SPIKE-A4: Test WebView cookie capture with test credentials
- [ ] SPIKE-A5: Identify token location (header, cookie, JS variable)
- [ ] SPIKE-A6: Document HttpOnly/Secure flags on token
- [ ] SPIKE-A7: Extract and print token successfully to console
- [ ] SPIKE-A8: Store token in secure storage, close app, restart
- [ ] SPIKE-A9: Verify token still accessible after app restart
- [ ] SPIKE-A10: Test error cases (invalid creds, timeout, network down)

### iOS Simulator
- [ ] SPIKE-A11: Repeat WebView tests on iOS simulator
- [ ] SPIKE-A12: Document iOS-specific behavior (WKWebView differences)
- [ ] SPIKE-A13: Verify token capture identical to Android (or document differences)

## Track B: Direct API Auth (FALLBACK)
- [ ] SPIKE-B1: Research DUPR API docs / GitHub for login endpoint
- [ ] SPIKE-B2: Test common endpoint patterns (POST /api/login, /auth/login, etc.)
- [ ] SPIKE-B3: Document findings (endpoint found or not found)
- [ ] SPIKE-B4: If found: validate response, extract token, test refresh

## Track C: Report Export Validation

### Android Export
- [ ] SPIKE-C1: Create sample HTML output (copy from Python desktop app)
- [ ] SPIKE-C2: Test expo-print on Android emulator
- [ ] SPIKE-C3: Verify PDF output: readable, margins correct, no cropping
- [ ] SPIKE-C4: Test on 1 physical Android device (if available)
- [ ] SPIKE-C5: Document: expo-print reliable or needs fallback?

### Export Fallback
- [ ] SPIKE-C6: If expo-print unreliable: plan expo-sharing + Copy to Clipboard

## ⛔ SPIKE GO/NO-GO DECISION (BLOCKER)

**WebView Auth - MUST PASS ALL:**
- [ ] SPIKE-GATE-A1: Token successfully captured on Android emulator
- [ ] SPIKE-GATE-A2: Token successfully captured on iOS simulator
- [ ] SPIKE-GATE-A3: Token format documented (JWT, length, prefix)
- [ ] SPIKE-GATE-A4: Security flags documented (HttpOnly, Secure, Domain, SameSite)
- [ ] SPIKE-GATE-A5: Token persists after app restart (secure storage working)
- [ ] SPIKE-GATE-A6: Token refresh logic validated or strategy documented
- [ ] SPIKE-GATE-A7: Platform compatibility confirmed (Android + iOS identical or differences documented)
- [ ] SPIKE-GATE-A8: Error handling validated (invalid creds, timeout, network errors)

**Export Strategy - MUST PASS:**
- [ ] SPIKE-GATE-C1: Export method confirmed (expo-print or fallback)
- [ ] SPIKE-GATE-C2: PDF output validated as readable on Android

**Decision Output:**
- [ ] SPIKE-GATE-FINAL: All gates passed → Proceed to Phase 0 ✅
- [ ] SPIKE-GATE-FINAL: Any gate failed → Escalate / No-Go ❌

---

# 📋 PHASE 0: Feature Parity Definition & Test Fixtures

**Phase Goal:** Create measurable acceptance criteria before coding  
**Estimated Duration:** 1 day  
**Blocker:** Spike Phase completion  
**Status:** ⏳ Awaiting Spike Phase

## Extract Test Fixtures from Python App
- [ ] P0-1: Run Python app, capture 5-10 DUPR Ladder test cases with outputs
- [ ] P0-2: Run Python app, capture 5-10 Partner DUPR test cases with outputs
- [ ] P0-3: Run Python app, capture 5-10 PickleBros test cases with outputs
- [ ] P0-4: Document edge cases: duplicates, missing ratings, invalid input, empty lists
- [ ] P0-5: Store all fixtures as JSON in `/packages/core/tests/fixtures/`

## Document Feature Requirements
- [ ] P0-6: Document input validation rules per format
- [ ] P0-7: Document player lookup fuzzy matching behavior (typos, nicknames, partial names)
- [ ] P0-8: Document override behavior (when/how applied)
- [ ] P0-9: Document all error messages (one per error state)
- [ ] P0-10: Document HTML output format, sorting, fields, presentation

## Create Parity Test Matrix
- [ ] P0-11: Create FEATURE_PARITY.md with test matrix (inputs → expected outputs)
- [ ] P0-12: Verify all test cases documented and accessible for Phase 1 implementation

---

# 📋 PHASE 1: Extract & Test Core Business Logic (TypeScript)

**Phase Goal:** Port proven logic before building UI; validate against Python outputs  
**Estimated Duration:** 3-4 days  
**Blocker:** Phase 0 completion  
**Status:** ⏳ Awaiting Phase 0

## Initialize TypeScript Project
- [ ] P1-1: Create @dupr/core TypeScript package (Node.js, no React Native yet)
- [ ] P1-2: Configure TypeScript, ESLint, Prettier
- [ ] P1-3: Set up Jest + test infrastructure
- [ ] P1-4: Create /tests/fixtures/ directory structure

## Port PlayerSearch Module
- [ ] P1-5: Implement PlayerSearch class (fuzzy matching with fuse.js or similar)
- [ ] P1-6: Write unit tests: exact match, typo tolerance, partial names
- [ ] P1-7: Run parity tests vs Python fixtures (validate fuse.js threshold)
- [ ] P1-8: Verify 90%+ test coverage for PlayerSearch

## Port GameTypeParser Module
- [ ] P1-9: Implement DUPRLadderParser (parse individual player list)
- [ ] P1-10: Implement PartnerDUPRParser (parse team pairs, calculate team rating)
- [ ] P1-11: Implement PickleBrosParser (format-specific parsing from Phase 0 definition)
- [ ] P1-12: Add input validation for all parsers
- [ ] P1-13: Write unit tests for all parsers (valid, invalid, edge cases)
- [ ] P1-14: Run parity tests vs Python (all 3 formats)

## Port DUPRClient Module
- [ ] P1-15: Define API contract (request/response shapes)
- [ ] P1-16: Implement HTTP client with Axios (mock layer for tests)
- [ ] P1-17: Implement error handling (404, 401, rate limits, network)
- [ ] P1-18: Implement token refresh logic
- [ ] P1-19: Write unit tests with mock API responses
- [ ] P1-20: Verify 90%+ test coverage for DUPRClient

## Port PlayerRegistry Module
- [ ] P1-21: Implement player override management (load/save from JSON)
- [ ] P1-22: Implement cache invalidation strategy
- [ ] P1-23: Write unit tests + parity tests vs Python

## Validation & Commit
- [ ] P1-24: Run all parity tests (all should pass)
- [ ] P1-25: Measure overall test coverage (target 90%+)
- [ ] P1-26: Commit @dupr/core package to git (Task P1-26 in CODING_REPORT.md)

---

# 📋 PHASE 2: Stack Finalization & RN Project Setup

**Phase Goal:** Lock decisions, initialize React Native project  
**Estimated Duration:** 1-2 days  
**Blocker:** Phase 1 completion + Spike Phase decision gates  
**Status:** ⏳ Awaiting Phase 1

## Post-Spike Decisions
- [ ] P2-1: Finalize: Expo-managed RN vs bare RN (spike must have decided)
- [ ] P2-2: Finalize config plugins needed (secure storage, PDF, etc.)
- [ ] P2-3: Update dependency versions (react-native 0.76+, others current)
- [ ] P2-4: Finalize state manager (Zustand recommended)

## Initialize React Native Project
- [ ] P2-5: Scaffold project (npx expo init or bare init based on P2-1 decision)
- [ ] P2-6: Create monorepo structure: /packages/core, /packages/mobile
- [ ] P2-7: Import @dupr/core into mobile app (verify builds)
- [ ] P2-8: Configure TypeScript, ESLint, Prettier for mobile
- [ ] P2-9: Set up CI/CD skeleton (GitHub Actions for linting, tests)

## Security Checklist
- [ ] P2-10: Configure token storage (expo-secure-store or react-native-keychain)
- [ ] P2-11: Add security best practices: no credential logging, no plain text storage
- [ ] P2-12: Plan app lock on resume (if token present)
- [ ] P2-13: Review DUPR ToS for compliance (scraping, rate limits, data retention)

## Deliverable
- [ ] P2-14: React Native project scaffold ready, core logic imported, builds successfully

---

# 📋 PHASE 3: Authentication Implementation

**Phase Goal:** Functional login flow on device  
**Estimated Duration:** 2-3 days  
**Blocker:** Phase 2 completion + Spike Phase findings  
**Status:** ⏳ Awaiting Phase 2

## Implement Auth Module
- [ ] P3-1: Implement auth based on Spike findings (WebView or Direct API)
- [ ] P3-2: WebView wrapper (if WebView chosen): load DUPR login page
- [ ] P3-3: Token extraction from WebView (use Spike findings)
- [ ] P3-4: Token/user info persistence (expo-secure-store)
- [ ] P3-5: Implement token refresh on expiration
- [ ] P3-6: Implement logout functionality (clear token, reset state)
- [ ] P3-7: Write unit tests for auth module

## Build Auth Screens
- [ ] P3-8: Create LoginScreen (WebView or form, based on Spike)
- [ ] P3-9: Display user name + rating on success
- [ ] P3-10: Error handling: display meaningful messages
- [ ] P3-11: Re-auth button for expired tokens
- [ ] P3-12: UI tests for auth screens (react-native-testing-library)

## Device Testing
- [ ] P3-13: Manual testing on Android emulator + iOS simulator
- [ ] P3-14: Test token refresh flow end-to-end
- [ ] P3-15: Test re-authentication on token expiration
- [ ] P3-16: Verify secure storage (token not visible in plain text)

---

# 📋 PHASE 4: Delivery Slice 1 - MVP DUPR Ladder

**Phase Goal:** End-to-end flow for simplest format (individual player ladder)  
**Estimated Duration:** 3-4 days  
**Blocker:** Phase 3 completion  
**Status:** ⏳ Awaiting Phase 3

## Build UI Screens
- [ ] P4-1: Create GameTypeSelector screen (radio: Ladder vs Partner vs PickleBros)
- [ ] P4-2: Create PlayerInputScreen (paste player names, one per line)
- [ ] P4-3: Add input validation display + error messages
- [ ] P4-4: Create ResultsScreen (sortable table: name, rating)

## Integration & Business Logic
- [ ] P4-5: Wire GameTypeParser for Ladder format
- [ ] P4-6: Wire PlayerSearch for fuzzy matching
- [ ] P4-7: Wire DUPRClient for player lookup
- [ ] P4-8: Handle network calls + loading states
- [ ] P4-9: Handle errors gracefully (display error messages)

## Testing
- [ ] P4-10: Write E2E tests with mock DUPR API (jest + fixtures)
- [ ] P4-11: Manual testing on Android emulator
- [ ] P4-12: Manual testing on physical Android device
- [ ] P4-13: Compare HTML output to desktop app (visual + parity tests)

## Release
- [ ] P4-14: Generate APK for internal testing, document Ladder working end-to-end

---

# 📋 PHASE 5: Delivery Slice 2 - Partner DUPR + PickleBros

**Phase Goal:** Add remaining game formats  
**Estimated Duration:** 2-3 days  
**Blocker:** Phase 4 completion  
**Status:** ⏳ Awaiting Phase 4

## Partner DUPR Format
- [ ] P5-1: Update PlayerInputScreen for team pair input
- [ ] P5-2: Wire PartnerDUPRParser for team parsing
- [ ] P5-3: Implement team rating calculation (verify parity vs Python)
- [ ] P5-4: Update ResultsScreen to display team ratings
- [ ] P5-5: Parity tests for Partner DUPR (all Phase 0 test cases)
- [ ] P5-6: Manual testing on physical Android device

## PickleBros Format
- [ ] P5-7: Implement PickleBrosParser (using Phase 0 format definition)
- [ ] P5-8: Update screens for PickleBros input/output
- [ ] P5-9: Parity tests for PickleBros (all Phase 0 test cases)
- [ ] P5-10: Manual testing on physical Android device

## Validation
- [ ] P5-11: All parity tests passing for all 3 formats
- [ ] P5-12: Feature-complete beta build ready for internal testing

---

# 📋 PHASE 6: Polish & Export/Sharing

**Phase Goal:** Production-ready UX  
**Estimated Duration:** 2-3 days  
**Blocker:** Phase 5 completion  
**Status:** ⏳ Awaiting Phase 5

## Report Generation & Export
- [ ] P6-1: Generate HTML output (matches desktop format)
- [ ] P6-2: Implement Copy to Clipboard (expo-clipboard or native)
- [ ] P6-3: Implement Share via native share sheet (expo-sharing)
- [ ] P6-4: Implement Save to Device (expo-file-system or native)
- [ ] P6-5: Test export on Android + iOS emulator/simulator

## Player Overrides
- [ ] P6-6: Create SettingsScreen for manual player overrides
- [ ] P6-7: Add/edit/delete override functionality
- [ ] P6-8: Persist overrides (AsyncStorage or FileSystem)
- [ ] P6-9: Use overrides in report generation
- [ ] P6-10: Parity test: overrides behave like Python app

## UX Polish
- [ ] P6-11: Keyboard handling on small screens
- [ ] P6-12: Long list scrolling (virtualization if 100+ players)
- [ ] P6-13: Touch targets minimum 44pt (iOS) / 48dp (Android)
- [ ] P6-14: Dark mode support (if time permits)
- [ ] P6-15: Accessibility basics (screen reader compatible)

---

# 📋 PHASE 7: Testing, Device Validation & Release Prep

**Phase Goal:** Ensure quality before app store  
**Estimated Duration:** 2-3 days  
**Blocker:** Phase 6 completion  
**Status:** ⏳ Awaiting Phase 6

## Automated Testing
- [ ] P7-1: Unit tests for all core logic (@dupr/core, 90%+ coverage)
- [ ] P7-2: Integration tests for all screens + DUPR client (mocked)
- [ ] P7-3: Snapshot tests for HTML output (regression detection)
- [ ] P7-4: Parity tests: RN outputs vs Python fixtures (all formats)
- [ ] P7-5: Run full test suite, all passing

## Manual Device Testing
- [ ] P7-6: Test on Android device matrix (2-3 device sizes/OS versions if possible)
- [ ] P7-7: Test slow network scenarios (simulate throttling)
- [ ] P7-8: Test token expiration + re-auth flow
- [ ] P7-9: Test all edge cases (invalid input, empty lists, duplicates)
- [ ] P7-10: iOS simulator testing (basic flow if available)

## Release Readiness
- [ ] P7-11: Set up crash reporting (Sentry or similar)
- [ ] P7-12: Add feature flags for auth fallbacks (if auth fails)
- [ ] P7-13: Configure release channels (Expo EAS internal testing / Google Play internal)
- [ ] P7-14: Version numbering + release notes prepared
- [ ] P7-15: Privacy policy + ToS drafted for app store
- [ ] P7-16: Verify app signing certificate + provisioning profiles
- [ ] P7-17: Final security audit (no credentials, no hardcoded tokens, HTTPS only)
- [ ] P7-18: Performance testing (load times, memory usage)
- [ ] P7-19: Generate final APK for Play Store submission
- [ ] P7-20: Play Store internal testing submission + review monitoring

---

# 📋 PHASE 8: iOS Adaptation & Cross-Platform Release (OPTIONAL)

**Phase Goal:** Ship to both platforms (if iOS support desired)  
**Estimated Duration:** 2-3 days  
**Blocker:** Phase 7 completion  
**Status:** ⏳ Optional (awaiting Phase 7)

## iOS-Specific Testing
- [ ] P8-1: WKWebView auth flow validation on physical iPhone (from Spike findings)
- [ ] P8-2: iOS-specific UI quirks (safe areas, notch, home indicator)
- [ ] P8-3: Physical iPhone device testing (if available)
- [ ] P8-4: Dark mode on iOS (if implemented)

## App Store Submission
- [ ] P8-5: iOS app signing, provisioning profiles, certificates
- [ ] P8-6: TestFlight setup + internal testing
- [ ] P8-7: App Store submission + review process
- [ ] P8-8: Monitor TestFlight feedback + crashes

## Post-Release Monitoring
- [ ] P8-9: Monitor crash reports (both platforms)
- [ ] P8-10: Gather user feedback, plan iterative improvements

---

## 📈 How to Use This Document

**Updating Progress:**
1. When you complete a task, change `- [ ]` to `- [x]`
2. Update the progress counters in the Summary table above
3. Add entry to CODING_REPORT.md with what was accomplished + git commit ID
4. Commit this file to git with a clear message: "Update TASK_LIST.md - tasks P1-5 through P1-8 complete"

**Example Update:**
```markdown
# BEFORE
- [ ] P1-5: Implement PlayerSearch class (fuzzy matching with fuse.js or similar)

# AFTER (once done)
- [x] P1-5: Implement PlayerSearch class (fuzzy matching with fuse.js or similar)
```

**Tracking Blockers:**
- If a task is blocked, note it in the phase header status
- Document which task is blocking it
- Communicate blockers in standups/updates

**Escalation:**
- If Spike Phase gates fail: escalate to team immediately (no proceeding to Phase 0)
- If any phase has >5 failing tasks: pause and investigate root cause

---

## 📌 Phase Dependencies

```
Spike Phase (BLOCKER)
    ↓
Phase 0 (Feature Parity Definition)
    ↓
Phase 1 (Core Logic TypeScript)
    ↓
Phase 2 (RN Setup)
    ↓
Phase 3 (Auth Implementation)
    ├→ Phase 4 (MVP Ladder)
    ├→ Phase 5 (Partner DUPR + PickleBros)
    └→ Phase 6 (Polish & Export)
    ↓
Phase 7 (Testing & Release Prep)
    ↓
Phase 8 (iOS - Optional)
```

---

**Document Status:** ACTIVE (Living Document)  
**Last Updated:** 2026-01-29  
**Next Update:** When Spike Phase begins
