# DUPR API Findings - SPIKE-AUTH-API-1

## Research Date
January 29, 2026

## Objective
Research and document DUPR API endpoints available for authentication, specifically:
- Is login endpoint public and available?
- Request format (username, password, others?)
- Response format (token, user info, expires_at?)

## Investigation

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

## Findings

### Public API Availability
❌ **DUPR does not expose a public authentication API endpoint**

### Authentication Method
- DUPR uses web-based authentication through their dashboard
- Authentication is handled via browser sessions/cookies
- No documented REST API for direct authentication

### Recommended Approach
Since DUPR has no public API:
1. **WebView-based authentication** (React Native WebView on mobile)
   - Load dashboard.dupr.com in WebView
   - Capture session cookies/tokens after login
   - Store and reuse for subsequent requests
   
2. **Web scraping approach** (Not recommended)
   - Parse HTML responses from DUPR pages
   - Risk: Terms of Service may prohibit this

3. **Contact DUPR for API access**
   - May have private/undocumented API for partners
   - Required for production mobile app

## Conclusion
The pickleball_scheduler mobile app should:
- Primary: Use WebView authentication (browser login flow)
- Fallback: Use web scraping if no WebView possible (not recommended)
- Long-term: Request API access from DUPR for official integration

## Next Steps
- Proceed with SPIKE-AUTH-A1: Create minimal Expo WebView test app
- This will validate whether browser-based auth can work in mobile app
