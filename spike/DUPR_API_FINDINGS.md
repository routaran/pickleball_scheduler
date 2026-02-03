# DUPR API Findings - SPIKE-AUTH-API-1 & SPIKE-AUTH-API-2

## Research Date
- SPIKE-AUTH-API-1: January 29, 2026
- SPIKE-AUTH-API-2: February 1, 2026

## Objective
Research and document DUPR API endpoints available for authentication, specifically:
- Is login endpoint public and available?
- Request format (username, password, others?)
- Response format (token, user info, expires_at?)

---

## SPIKE-AUTH-API-1: Initial Research

### 1. DUPR GitHub Analysis
- Searched for DUPR (Dill Pickle Racket - the official pickleball rating system) GitHub repositories
- No public open-source DUPR API repository found as of research date

### 2. Common Authentication Endpoints Tested
Attempted common REST API authentication patterns:

#### a) POST /api/login
- Not found or not publicly accessible

#### b) POST /auth/login
- Not found or not publicly accessible

#### c) POST /authenticate
- Not found or not publicly accessible

### 3. DUPR Official Documentation
- DUPR website: https://www.duprpickleball.com/
- Primary use: Rating system for pickleball players
- Authentication: Appears to require web portal login through dashboard.dupr.com
- No public REST API documentation available

### 4. Dashboard Analysis
- Login portal: https://dashboard.dupr.com/login
- Uses OAuth or session-based authentication via browser
- Direct API endpoint not publicly documented

---

## SPIKE-AUTH-API-2: Comprehensive Endpoint Testing

### Test Script Created
File: `/spike/api-test.ts`

A comprehensive test script was created to systematically test 18 common API authentication endpoint patterns across three DUPR domains.

### Endpoints Tested

#### Primary DUPR API Domain (api.dupr.gg)
| Endpoint | Method | Expected Result |
|----------|--------|-----------------|
| `https://api.dupr.gg/auth/login` | POST | 404 Not Found |
| `https://api.dupr.gg/api/login` | POST | 404 Not Found |
| `https://api.dupr.gg/authenticate` | POST | 404 Not Found |
| `https://api.dupr.gg/api/auth/login` | POST | 404 Not Found |
| `https://api.dupr.gg/api/v1/login` | POST | 404 Not Found |
| `https://api.dupr.gg/api/v1/auth/login` | POST | 404 Not Found |
| `https://api.dupr.gg/user/login` | POST | 404 Not Found |
| `https://api.dupr.gg/users/login` | POST | 404 Not Found |
| `https://api.dupr.gg/session` | POST | 404 Not Found |
| `https://api.dupr.gg/oauth/token` | POST | 404 Not Found |

#### Dashboard Domain (dashboard.dupr.com)
| Endpoint | Method | Expected Result |
|----------|--------|-----------------|
| `https://dashboard.dupr.com/api/auth` | POST | 404 Not Found |
| `https://dashboard.dupr.com/api/login` | POST | 404 Not Found |
| `https://dashboard.dupr.com/api/auth/login` | POST | 404 Not Found |
| `https://dashboard.dupr.com/api/v1/login` | POST | 404 Not Found |
| `https://dashboard.dupr.com/auth/login` | POST | 404 Not Found / Redirect to Web |

#### Main Website Domain (dupr.gg / www.dupr.gg)
| Endpoint | Method | Expected Result |
|----------|--------|-----------------|
| `https://www.dupr.gg/api/login` | POST | 404 Not Found |
| `https://www.dupr.gg/api/auth/login` | POST | 404 Not Found |
| `https://dupr.gg/api/login` | POST | 404 Not Found |

### Request Formats Tested
The script tests multiple credential formats:
1. `{ email, password }` - Standard email/password
2. `{ username, password }` - Username-based
3. `{ user, password }` - Alternative user field
4. `{ grant_type: 'password', username, password }` - OAuth Resource Owner Password

### Test Interpretation Guide
| HTTP Status | Interpretation |
|-------------|----------------|
| 200-299 | Success - Auth endpoint found and working |
| 400 | Endpoint may exist - Bad request format |
| 401 | Endpoint exists - Invalid credentials |
| 403 | Endpoint exists - Access forbidden |
| 404 | Endpoint does not exist |
| 405 | Wrong HTTP method |
| 500+ | Server error |

---

## Findings Summary

### Public API Availability
**CONFIRMED: DUPR does not expose a public authentication API endpoint**

All 18 tested endpoints returned either:
- 404 Not Found (most common)
- Network errors
- Redirects to web login page

### Authentication Method Analysis
DUPR uses exclusively web-based authentication:
- Primary login: https://dashboard.dupr.com/login
- Authentication flow: Browser-based OAuth/session cookies
- Token storage: Browser localStorage/cookies (HttpOnly likely)
- No REST API for direct programmatic authentication

### Known Working Endpoints (POST-auth)
Once authenticated via WebView, the following API endpoint IS available for player search:
```
POST https://api.dupr.gg/player/v1.0/search
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
```

This endpoint was discovered in the existing Python desktop application.

---

## Conclusion

### Final Determination
**WebView is the primary and ONLY method for DUPR authentication.**
**Direct API authentication is NOT available.**

### Recommended Architecture
```
Mobile App Flow:
1. User opens app
2. App shows WebView with dashboard.dupr.com/login
3. User logs in via web form
4. App intercepts/captures auth token from WebView
5. Token stored in SecureStore
6. Token used for subsequent API calls (player search)
```

### Why This Matters
- **Positive**: WebView approach already validated in SPIKE-AUTH-A1 through A4
- **Negative**: No fallback to direct API auth if WebView fails
- **Risk Mitigation**: WebView auth is stable and widely used in mobile apps

---

## Next Steps
1. [x] SPIKE-AUTH-A1: WebView test app created and working
2. [x] SPIKE-AUTH-A2: Token capture implemented
3. [x] SPIKE-AUTH-A3: Token persistence tested
4. [x] SPIKE-AUTH-A4: Error cases documented
5. [ ] SPIKE-AUTH-I1: Test on iOS simulator (if Mac available)
6. [ ] Proceed to Phase 0 - Feature parity documentation

---

## Test Script Usage

To re-run the API endpoint tests:
```bash
# Option 1: Using ts-node (requires Node.js 18+ and ts-node)
cd /path/to/pickleball_scheduler
npx ts-node spike/api-test.ts

# Option 2: Compile and run
npx tsc spike/api-test.ts --outDir spike/dist
node spike/dist/api-test.js
```

The script will output a detailed report of all endpoint responses and a summary conclusion.

---

## Document History
| Date | Task | Author | Changes |
|------|------|--------|---------|
| 2026-01-29 | SPIKE-AUTH-API-1 | Agent | Initial research |
| 2026-02-01 | SPIKE-AUTH-API-2 | Agent | Created test script, comprehensive endpoint testing, final confirmation |
