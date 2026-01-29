# DUPR Pickleball Scheduler - Mobile App Specification

## Document Purpose
This specification defines the technical requirements, feature scope, and quality criteria for the mobile version of the DUPR Pickleball Scheduler. It is derived from and complements PLAN.md.

---

## 1. Product Overview

### Goals
- Deliver Android + iOS mobile app with feature parity to desktop Python application
- Enable pickleball organizers to generate player ratings reports on mobile devices
- Maintain security and ease of use across platforms
- Support three game formats: DUPR Ladder, Partner DUPR, PickleBros

### Target Users
- Pickleball event organizers
- Players who want quick access to rating lookups
- Anyone running scheduled tournaments (desk or field)

### Success Definition
- ✅ MVP (DUPR Ladder) working on physical Android device within Phase 4
- ✅ All 3 formats working by end of Phase 5
- ✅ 100% parity between mobile and desktop outputs (same HTML format, same player ratings, same sorting)
- ✅ App store ready (Play Store + TestFlight) by Phase 7-8

---

## 2. Feature Requirements

### 2.1 Authentication
**Requirement:** User must log in with DUPR credentials to access the app.

**Mobile-Specific Challenge:** DUPR uses SSO (likely OAuth/SAML). Desktop uses Playwright browser automation. Mobile needs:
- WebView-based auth (primary), OR
- Direct API endpoint (fallback)

**Acceptance Criteria:**
- [ ] Login form or WebView displays DUPR login page
- [ ] User enters credentials and is authenticated
- [ ] Session token is captured and stored securely
- [ ] Token persists after app restart (stored in secure storage, NOT AsyncStorage)
- [ ] Token refresh on expiration works seamlessly
- [ ] Logout clears token and returns to login screen
- [ ] Invalid credentials show clear error message
- [ ] Network errors handled gracefully (retry prompt)

**Authentication Methods to Validate (in Spike Phase):**
1. **WebView Token Capture:** Load DUPR login in WebView, extract token from response headers or JavaScript execution
2. **Direct API:** If DUPR exposes POST /api/login or similar endpoint, use form-based login

**Spike Blocker:** Must pass WebView auth on Android emulator + iOS simulator before proceeding.

---

### 2.2 Game Format Input & Validation

Three formats supported. Each has unique input/output requirements.

#### 2.2.1 DUPR Ladder (Individual Rankings)
**Input:** List of player names (one per line, paste-formatted)
```
John Smith
Jane Doe
Bob Johnson
```

**Processing:**
- Look up each player in DUPR database by name
- Fuzzy matching for typos / partial names (existing Python logic)
- Retrieve DUPR rating for each player
- Sort by rating (descending)

**Output:** Sorted table (HTML)
```
| Name       | DUPR Rating |
|------------|------------|
| Jane Doe   | 4.2        |
| John Smith | 3.8        |
| Bob Johnson| 3.5        |
```

**Input Validation:**
- Accept 1-100 players
- Trim whitespace
- Reject empty lines
- Allow partial names / typos (fuzzy match)
- Clear error if player not found: "5 players not found: [names]"

**Edge Cases:**
- [ ] Duplicate names in input (handle gracefully, deduplicate or allow both?)
- [ ] Player not in DUPR database (show error, allow manual override)
- [ ] DUPR rating not available (show N/A or allow manual entry?)
- [ ] Very slow DUPR API response (loading spinner, timeout after 30s)

#### 2.2.2 Partner DUPR (Team Rankings)
**Input:** List of player pairs (formatted as "Player1 / Player2" or "Player1, Player2")
```
John Smith / Jane Doe
Bob Johnson / Alice Wilson
```

**Processing:**
- Parse player pairs from input
- Look up each player's DUPR rating
- Calculate team rating (algorithm from Python `game_types.py` — verify parity)
- Sort by team rating (descending)

**Output:** Sorted table (HTML)
```
| Team 1     | Team 2      | Team Rating |
|------------|-------------|------------|
| John/Jane  | Bob/Alice   | 4.0        |
```

**Input Validation:**
- Accept 1-50 team pairs
- Support multiple delimiters: " / ", " , ", "-"
- Fuzzy match player names
- Error on unpaired players (show count + names)

**Calculation Verification:**
- [ ] Port team rating calculation from Python
- [ ] Validate against Python test fixtures
- [ ] Parity tests: same input → exact same output

#### 2.2.3 PickleBros Format
**Input:** Format-specific (TBD in Phase 0)
- Likely includes: player names, event info, bracket structure
- Document exact format during Phase 0 fixture extraction

**Processing:**
- Parse PickleBros-specific format
- Look up players
- Generate PickleBros-compatible output

**Output:** PickleBros-formatted report (HTML or structured data)

**Parity Requirement:**
- [ ] Output matches Python app byte-for-byte (or document any differences)
- [ ] All test cases from Phase 0 pass

---

### 2.3 Player Lookup & Fuzzy Matching

**Requirement:** Tolerate user typos and partial names when looking up players in DUPR database.

**Behavior (from Python `player_search.py`):**
- Input: "Jon Smith" → Match: "John Smith" (typo tolerance)
- Input: "Smith" → Match: "John Smith", "Jane Smith" (partial match)
- Input: "John S" → Match: "John Smith" (partial first + last)

**Acceptance Criteria:**
- [ ] Fuzzy matching works for all test cases from Phase 0
- [ ] No regressions vs Python algorithm
- [ ] User sees match confidence (exact / high / low confidence)
- [ ] Option to manually override if auto-match uncertain

**Implementation:**
- Use `fuse.js` (JavaScript fuzzy matching library)
- Configure threshold to match Python behavior
- Unit tests with Phase 0 fixtures

---

### 2.4 Player Overrides & Manual Entry

**Requirement:** Allow users to manually set a player's rating if:
1. Player not found in DUPR database
2. User knows the correct rating (dispute DUPR data)
3. Player uses nickname not in DUPR database

**Features:**
- Settings screen with "Player Overrides" section
- Add/edit/delete manual overrides
- Overrides persist across app sessions (stored securely)
- Override takes precedence over DUPR lookup

**Acceptance Criteria:**
- [ ] Can add override for player name + custom rating
- [ ] Override is stored persistently
- [ ] Override used in report generation
- [ ] Can delete override to revert to DUPR lookup
- [ ] Parity: matches Python override behavior

---

### 2.5 Report Generation & Export

**Requirement:** Generate HTML report, enable sharing/export to device or external apps.

#### 2.5.1 HTML Output
- Format matches desktop app (same CSS, layout, fields)
- Sortable table (optional: click column headers)
- Print-friendly styling (no ads, minimal whitespace)
- Timestamp of report generation

**Acceptance Criteria:**
- [ ] HTML output matches Python desktop app
- [ ] Snapshot tests validate no regressions
- [ ] PDF export visually similar to desktop PDF

#### 2.5.2 Export Options (Phase 6)
1. **Copy to Clipboard:** User taps "Copy Results" → HTML copied to clipboard
2. **Share Sheet:** Native share (iOS/Android) → email, messaging, cloud storage
3. **Save to Device:** Export as .html or .pdf file to device storage
4. **Print:** Via `expo-print` → device print dialog (Android) or AirPrint (iOS)

**Decision Gate (Spike Phase):**
- [ ] `expo-print` reliable on Android emulator + physical device?
- [ ] If not: use `expo-sharing` + Copy to Clipboard (minimum viable)

**Acceptance Criteria:**
- [ ] HTML rendered correctly in all export formats
- [ ] PDF output readable and formatted correctly
- [ ] Share sheet shows correct apps on Android + iOS
- [ ] File saved to device is valid HTML / PDF

---

### 2.6 Error Handling & User Feedback

**User-Facing Errors (all must be handled):**
1. **Network Error:** "Unable to connect. Check internet and try again."
2. **Player Not Found:** "3 players not found: [names]. Use manual override to add."
3. **Invalid Input:** "Please enter at least one player name."
4. **DUPR API Rate Limited:** "DUPR service busy. Try again in 1 minute."
5. **Token Expired:** "Your session expired. Please log in again."
6. **Authentication Failed:** "Incorrect username or password. Try again."

**Technical Errors (log to console, show generic message to user):**
- All errors should log with timestamp, endpoint, request/response
- Crash reporting via Sentry (optional in Phase 7)

**Acceptance Criteria:**
- [ ] All error scenarios tested
- [ ] Error messages are user-friendly (no stack traces)
- [ ] Retry logic implemented where appropriate
- [ ] Logging enabled for debugging

---

## 3. Non-Functional Requirements

### 3.1 Performance
- **Auth:** Login completes within 10 seconds
- **Player Lookup:** Response for 10 players within 3 seconds
- **Report Generation:** HTML generated in <500ms
- **UI Responsiveness:** Buttons respond within 100ms, navigation smooth (60fps)

### 3.2 Compatibility
- **Android:** API 24 (Android 7.0) and above
- **iOS:** iOS 14.0 and above

### 3.3 Security
- **Token Storage:** Encrypted (expo-secure-store on React Native)
- **Credentials:** Never logged, never stored in plain text
- **HTTPS:** All API calls over HTTPS
- **Token Refresh:** Automatic, before expiration
- **App Lock (Optional):** Require PIN/biometric on resume if token present
- **DUPR ToS Compliance:** Verify no rate limiting abuse, data retention policies

### 3.4 Accessibility
- **Screen Reader:** Basic support (screen reader compatible)
- **Touch Targets:** Minimum 44pt (iOS) / 48dp (Android)
- **Colors:** Sufficient contrast (WCAG AA minimum)
- **Text Size:** Minimum 14pt readable

### 3.5 Testing Coverage
- **Unit Tests:** 90%+ coverage for core logic (@dupr/core)
- **Integration Tests:** All game formats end-to-end
- **Snapshot Tests:** HTML output regression detection
- **Parity Tests:** RN outputs vs Python fixtures (all formats)
- **Manual Testing:** Device matrix (Android: 2-3 devices; iOS: simulator + 1 physical if possible)

---

## 4. Technology Stack (Post-Spike Decision)

### Primary Stack (Expo-Managed)
```json
{
  "expo": "^51",
  "react-native": "^0.76",
  "react": "^18.3",
  "typescript": "^5.x",
  "@react-navigation/native": "^6.x",
  "zustand": "^4.5",
  "axios": "^1.7",
  "expo-secure-store": "^13.x",
  "react-native-webview": "^13.x",
  "fuse.js": "^7.x",
  "jest": "^29.x"
}
```

### Fallback Stack (if Bare RN needed for auth)
- Switch to bare React Native
- Use `react-native-keychain` for secure storage
- Custom native module for WebView auth token capture (if needed)
- **Note:** Entire app migrates in Week 1-2 (not hybrid split)

---

## 5. Project Structure

```
pickleball_scheduler/
├── PLAN.md                    # High-level plan + phases
├── SPEC.md                    # This document (technical spec)
├── TASK_LIST.md               # Living task checklist
├── CODING_REPORT.md           # What was done + git commits
├── packages/
│   ├── core/                  # Shared TypeScript business logic
│   │   ├── src/
│   │   │   ├── player-search.ts
│   │   │   ├── game-types.ts
│   │   │   ├── dupr-client.ts
│   │   │   ├── player-registry.ts
│   │   │   └── html-generator.ts
│   │   ├── tests/
│   │   │   └── fixtures/      # Python test outputs (Phase 0)
│   │   └── package.json
│   └── mobile/                # React Native Expo app
│       ├── app.json
│       ├── src/
│       │   ├── screens/
│       │   ├── components/
│       │   ├── context/
│       │   ├── services/
│       │   └── App.tsx
│       └── package.json
├── src/                       # Existing Python code (unchanged)
├── tests/                     # Existing Python tests
└── pyproject.toml
```

---

## 6. Spike Phase (Blocker) - Detailed Acceptance Criteria

### 6.1 WebView Auth Validation (Android Emulator)
**Setup:**
- [ ] Android SDK installed, emulator running API 28+ image
- [ ] Expo CLI configured

**Test Steps:**
- [ ] Create minimal Expo app with WebView
- [ ] Load `https://dashboard.dupr.com` in WebView
- [ ] Document: Does login page load? Any CORS/CSP issues?
- [ ] Enter test credentials, submit
- [ ] Check browser logs: what's the response? Token location?
  - [ ] Response header? (e.g., `Authorization: Bearer TOKEN`)
  - [ ] Cookie? (check `document.cookie` or Network tab)
  - [ ] JavaScript variable? (e.g., `window.authToken`)
- [ ] Document: Is token accessible from JS? Any HttpOnly/Secure flags?
- [ ] Extract token successfully → Print to console for verification
- [ ] Close app, clear cookies, restart → Is token still accessible from secure storage? (If stored)

**Acceptance Criteria (MUST PASS):**
- [ ] Token successfully extracted from WebView
- [ ] Token format documented (e.g., JWT, length, prefix)
- [ ] Can be stored + retrieved in secure storage
- [ ] App restart preserves token
- [ ] Error cases handled: invalid creds, timeout, network down

### 6.2 WebView Auth Validation (iOS Simulator)
**Setup:**
- [ ] Xcode + iOS simulator running iOS 14+

**Test Steps:**
- [ ] Repeat all Android tests on iOS simulator
- [ ] Document any differences: WKWebView behavior vs Android WebView

**Acceptance Criteria (MUST PASS):**
- [ ] Token extraction works on iOS
- [ ] Identical flow to Android (or differences documented)
- [ ] No HttpOnly/Secure flag blocking on iOS

### 6.3 Direct API Fallback (if WebView Fails)
**Research:**
- [ ] Search DUPR GitHub or docs for login endpoint
- [ ] Try reverse-engineering: test common patterns (POST /api/login, /auth/login, etc.)

**Test Steps (if endpoint found):**
- [ ] Make POST request with test credentials
- [ ] Document response: token format, fields, HTTP code on success/failure
- [ ] Extract token
- [ ] Test: token validity, refresh, expiration

**Acceptance Criteria (CONDITIONAL):**
- [ ] If endpoint found: Document for Phase 3 implementation
- [ ] If not found: Document that WebView is primary method; API fallback unavailable

### 6.4 Report Export Validation (Android)
**Setup:**
- [ ] Android emulator API 28+
- [ ] Expo CLI + expo-print configured

**Test Steps:**
- [ ] Create sample HTML output (copy from Python desktop app)
- [ ] Call `Print.printAsync({ html: sample_html })`
- [ ] Check: PDF output displays, margins are correct, text readable
- [ ] Test on 1 physical Android device if available

**Acceptance Criteria (MUST PASS):**
- [ ] PDF output readable
- [ ] Margins acceptable (not cropped, not huge whitespace)
- [ ] Text not blurry
- [ ] If unreliable: Document fallback to `expo-sharing` + Copy to Clipboard

### 6.5 Decision Gate: Go/No-Go
**To Proceed (LOCKED IN):**
- [ ] WebView auth: Token captured on Android + iOS sims
- [ ] Token storage: Persists after app restart
- [ ] Token refresh: Validated or documented strategy
- [ ] Report export: Method confirmed (expo-print or fallback)

**If Any FAIL:**
- [ ] Escalate immediately (no proceeding to Phase 0)
- [ ] Consider: bare React Native, native auth module, API endpoint alternative

---

## 7. Phase 0 Acceptance Criteria (Feature Parity Definition)

### 7.1 Test Fixtures Extracted
**Deliverables:**
- [ ] 5-10 DUPR Ladder test cases with expected outputs
- [ ] 5-10 Partner DUPR test cases with expected outputs
- [ ] 5-10 PickleBros test cases with expected outputs
- [ ] All fixtures saved as JSON in `/packages/core/tests/fixtures/`

**Format (Example):**
```json
{
  "name": "ladder_basic_3_players",
  "format": "ladder",
  "input": ["John Smith", "Jane Doe", "Bob Johnson"],
  "expected_output": {
    "format": "html",
    "html": "<html>...",
    "players": [
      { "name": "Jane Doe", "rating": 4.2 },
      { "name": "John Smith", "rating": 3.8 },
      { "name": "Bob Johnson", "rating": 3.5 }
    ]
  }
}
```

### 7.2 Feature Requirements Spec
**Deliverables:**
- [ ] FEATURE_PARITY.md with test matrix
- [ ] Input validation rules per format documented
- [ ] Error messages documented
- [ ] HTML output format documented
- [ ] Sorting rules documented
- [ ] Override behavior documented

---

## 8. Success Metrics (Objective, Testable)

| Metric | Target | Verification |
|--------|--------|--------------|
| Auth Spike Pass Rate | 100% (all gates pass) | Token captured Android + iOS, export strategy confirmed |
| Parity Test Pass Rate | 100% (all formats) | All Phase 0 test cases pass: RN output == Python output |
| Unit Test Coverage | 90%+ | Jest coverage report on @dupr/core |
| MVP Release Date | By Phase 4 | Ladder format working on physical Android device |
| Feature Parity Release | By Phase 5 | All 3 formats working, all parity tests passing |
| Store Ready | By Phase 7 | Play Store internal testing submission passed |
| Cross-Platform (optional) | By Phase 8 | iOS app also live (if iOS support pursued) |

---

## 9. Known Constraints & Risks

### Constraints
- **DUPR API Access:** Blocked on rate limiting, must respect usage policies
- **Mobile WebView Auth:** HttpOnly/Secure cookies may block token capture
- **Bare RN Risk:** If spike fails, entire app must migrate to bare RN (not hybrid)

### Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| WebView auth fails on both platforms | CRITICAL | Spike validates early; fallback to direct API or escalate |
| expo-print unreliable on real devices | Medium | Fall back to expo-sharing + Copy to Clipboard |
| Regressions in player logic | High | Parity tests against Python fixtures |
| DUPR API changes mid-project | Low | Monitor API status, feature flags for graceful degradation |
| Bare RN eject needed after Phase 2 | High | Plan clean migration in Week 1-2, not mid-project |

---

## 10. Documentation & Communication

### Documents (Living)
- **PLAN.md** - Strategic phases + timeline
- **SPEC.md** - Technical requirements (this document)
- **TASK_LIST.md** - Task checklist + completion tracking
- **CODING_REPORT.md** - What was accomplished + git commits

### Code Quality
- Inline comments for non-obvious logic only
- TypeScript interfaces document API contracts
- Jest test names describe behavior
- Git commit messages reference tasks (e.g., "Phase 1: Port PlayerSearch (#TASK-X)")

---

## Appendix A: Phase Timeline

| Phase | Duration | Key Deliverable | Gate |
|-------|----------|-----------------|------|
| Spike | 1-2 days | Auth method validated, export strategy confirmed | Must pass, else escalate |
| Phase 0 | 1 day | Test fixtures, feature requirements, parity matrix | Document all test cases |
| Phase 1 | 3-4 days | @dupr/core TypeScript package, 90%+ coverage | All parity tests passing |
| Phase 2 | 1-2 days | RN scaffold, stack finalized | Project structure ready |
| Phase 3 | 2-3 days | Auth screens, token management | Login/logout working |
| Phase 4 | 3-4 days | MVP Ladder format | Working on physical Android |
| Phase 5 | 2-3 days | Partner DUPR + PickleBros | All formats working |
| Phase 6 | 2-3 days | Export/sharing, overrides, polish | Feature-complete beta |
| Phase 7 | 2-3 days | Testing, release prep | Play Store ready |
| Phase 8 | 2-3 days | iOS + app store releases | Both platforms live (optional) |

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-29 | System | Initial spec based on PLAN.md |

---

**Document Status:** ACTIVE (Under Development)  
**Last Updated:** 2026-01-29  
**Next Review:** After Spike Phase completion
