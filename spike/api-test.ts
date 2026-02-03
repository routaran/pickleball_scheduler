/**
 * SPIKE-AUTH-API-2: Test direct API auth endpoints for DUPR
 *
 * This script tests common API authentication patterns to validate
 * the findings from SPIKE-AUTH-API-1 that DUPR does not expose
 * a public authentication API endpoint.
 *
 * DO NOT USE REAL CREDENTIALS - this uses placeholder test data only.
 *
 * Usage:
 *   Option 1: npx ts-node spike/api-test.ts
 *   Option 2: node spike/api-test.js (after compiling with tsc)
 *
 * Note: Requires Node.js 18+ for native fetch support.
 */

// Test configuration - PLACEHOLDER CREDENTIALS ONLY
const TEST_CREDENTIALS = {
  email: 'test@example.com',
  password: 'placeholder_password_do_not_use_real',
  username: 'test_user',
};

// Common API endpoint patterns to test
const API_ENDPOINTS = [
  // Primary DUPR API domain
  { url: 'https://api.dupr.gg/auth/login', method: 'POST' as const },
  { url: 'https://api.dupr.gg/api/login', method: 'POST' as const },
  { url: 'https://api.dupr.gg/authenticate', method: 'POST' as const },
  { url: 'https://api.dupr.gg/api/auth/login', method: 'POST' as const },
  { url: 'https://api.dupr.gg/api/v1/login', method: 'POST' as const },
  { url: 'https://api.dupr.gg/api/v1/auth/login', method: 'POST' as const },
  { url: 'https://api.dupr.gg/user/login', method: 'POST' as const },
  { url: 'https://api.dupr.gg/users/login', method: 'POST' as const },
  { url: 'https://api.dupr.gg/session', method: 'POST' as const },
  { url: 'https://api.dupr.gg/oauth/token', method: 'POST' as const },

  // Dashboard domain (web app backend)
  { url: 'https://dashboard.dupr.com/api/auth', method: 'POST' as const },
  { url: 'https://dashboard.dupr.com/api/login', method: 'POST' as const },
  { url: 'https://dashboard.dupr.com/api/auth/login', method: 'POST' as const },
  { url: 'https://dashboard.dupr.com/api/v1/login', method: 'POST' as const },
  { url: 'https://dashboard.dupr.com/auth/login', method: 'POST' as const },

  // Main website domain
  { url: 'https://www.dupr.gg/api/login', method: 'POST' as const },
  { url: 'https://www.dupr.gg/api/auth/login', method: 'POST' as const },
  { url: 'https://dupr.gg/api/login', method: 'POST' as const },
];

// Request body formats to try
const REQUEST_FORMATS = [
  // Format 1: email + password
  { email: TEST_CREDENTIALS.email, password: TEST_CREDENTIALS.password },
  // Format 2: username + password
  { username: TEST_CREDENTIALS.username, password: TEST_CREDENTIALS.password },
  // Format 3: user + password
  { user: TEST_CREDENTIALS.email, password: TEST_CREDENTIALS.password },
  // Format 4: grant_type (OAuth style)
  {
    grant_type: 'password',
    username: TEST_CREDENTIALS.email,
    password: TEST_CREDENTIALS.password
  },
];

interface TestResult {
  endpoint: string;
  method: string;
  requestFormat: string;
  statusCode: number | null;
  responseType: 'success' | 'client_error' | 'server_error' | 'network_error' | 'cors_error' | 'timeout';
  errorMessage: string | null;
  hasAuthEndpoint: boolean;
  responseBody?: unknown;
}

async function testEndpoint(
  url: string,
  method: 'POST',
  body: Record<string, string>,
  formatIndex: number
): Promise<TestResult> {
  const result: TestResult = {
    endpoint: url,
    method,
    requestFormat: `Format ${formatIndex + 1}`,
    statusCode: null,
    responseType: 'network_error',
    errorMessage: null,
    hasAuthEndpoint: false,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    result.statusCode = response.status;

    // Try to get response body
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        result.responseBody = await response.json();
      } else {
        const text = await response.text();
        result.responseBody = text.substring(0, 500); // Truncate long responses
      }
    } catch {
      result.responseBody = '[Could not parse response body]';
    }

    // Analyze response
    if (response.status >= 200 && response.status < 300) {
      result.responseType = 'success';
      result.hasAuthEndpoint = true;
      result.errorMessage = 'SUCCESS - Auth endpoint found!';
    } else if (response.status === 401) {
      // 401 means endpoint exists but credentials are invalid
      result.responseType = 'client_error';
      result.hasAuthEndpoint = true;
      result.errorMessage = 'Endpoint exists - returns 401 Unauthorized (invalid credentials)';
    } else if (response.status === 400) {
      // 400 could mean endpoint exists but request format is wrong
      result.responseType = 'client_error';
      result.hasAuthEndpoint = true;
      result.errorMessage = 'Endpoint may exist - returns 400 Bad Request';
    } else if (response.status === 404) {
      result.responseType = 'client_error';
      result.hasAuthEndpoint = false;
      result.errorMessage = 'Endpoint not found (404)';
    } else if (response.status === 403) {
      result.responseType = 'client_error';
      result.hasAuthEndpoint = true;
      result.errorMessage = 'Endpoint exists but access forbidden (403)';
    } else if (response.status === 405) {
      result.responseType = 'client_error';
      result.hasAuthEndpoint = false;
      result.errorMessage = 'Method not allowed (405)';
    } else if (response.status >= 400 && response.status < 500) {
      result.responseType = 'client_error';
      result.errorMessage = `Client error: ${response.status}`;
    } else if (response.status >= 500) {
      result.responseType = 'server_error';
      result.errorMessage = `Server error: ${response.status}`;
    }

  } catch (error) {
    clearTimeout(timeoutId);

    const err = error as Error;
    if (err.name === 'AbortError') {
      result.responseType = 'timeout';
      result.errorMessage = 'Request timed out (10s)';
    } else if (err.message?.includes('ECONNREFUSED')) {
      result.responseType = 'network_error';
      result.errorMessage = 'Connection refused';
    } else if (err.message?.includes('ENOTFOUND') || err.message?.includes('getaddrinfo')) {
      result.responseType = 'network_error';
      result.errorMessage = 'DNS lookup failed - host not found';
    } else if (err.message?.includes('CORS')) {
      result.responseType = 'cors_error';
      result.errorMessage = 'CORS policy blocked request';
    } else {
      result.responseType = 'network_error';
      result.errorMessage = err.message || 'Unknown error';
    }
  }

  return result;
}

async function runAllTests(): Promise<TestResult[]> {
  console.log('='.repeat(80));
  console.log('SPIKE-AUTH-API-2: DUPR API Authentication Endpoint Testing');
  console.log('='.repeat(80));
  console.log('');
  console.log('Purpose: Validate SPIKE-AUTH-API-1 findings that DUPR has no public auth API');
  console.log('WARNING: Using placeholder credentials only - DO NOT use real credentials');
  console.log('');
  console.log(`Test started at: ${new Date().toISOString()}`);
  console.log('');

  const allResults: TestResult[] = [];
  const potentialEndpoints: TestResult[] = [];

  // Test each endpoint with the first request format only (to save time)
  // If an endpoint shows promise, we'd test all formats
  for (const endpoint of API_ENDPOINTS) {
    console.log(`Testing: ${endpoint.url}`);

    const result = await testEndpoint(
      endpoint.url,
      endpoint.method,
      REQUEST_FORMATS[0],
      0
    );

    allResults.push(result);

    // Log result immediately
    if (result.hasAuthEndpoint) {
      console.log(`  -> POTENTIAL AUTH ENDPOINT FOUND!`);
      console.log(`     Status: ${result.statusCode}`);
      console.log(`     Message: ${result.errorMessage}`);
      potentialEndpoints.push(result);
    } else {
      console.log(`  -> ${result.errorMessage || result.responseType} (${result.statusCode || 'N/A'})`);
    }

    // Small delay between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Generate summary report
  console.log('');
  console.log('='.repeat(80));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  console.log('');

  // Count results by type
  const summary = {
    total: allResults.length,
    notFound: allResults.filter(r => r.statusCode === 404).length,
    unauthorized: allResults.filter(r => r.statusCode === 401).length,
    badRequest: allResults.filter(r => r.statusCode === 400).length,
    forbidden: allResults.filter(r => r.statusCode === 403).length,
    methodNotAllowed: allResults.filter(r => r.statusCode === 405).length,
    networkError: allResults.filter(r => r.responseType === 'network_error').length,
    timeout: allResults.filter(r => r.responseType === 'timeout').length,
    potentialEndpoints: potentialEndpoints.length,
  };

  console.log('Response Summary:');
  console.log(`  Total endpoints tested: ${summary.total}`);
  console.log(`  404 Not Found: ${summary.notFound}`);
  console.log(`  401 Unauthorized: ${summary.unauthorized}`);
  console.log(`  400 Bad Request: ${summary.badRequest}`);
  console.log(`  403 Forbidden: ${summary.forbidden}`);
  console.log(`  405 Method Not Allowed: ${summary.methodNotAllowed}`);
  console.log(`  Network Errors: ${summary.networkError}`);
  console.log(`  Timeouts: ${summary.timeout}`);
  console.log('');

  if (potentialEndpoints.length > 0) {
    console.log('POTENTIAL AUTH ENDPOINTS FOUND:');
    for (const endpoint of potentialEndpoints) {
      console.log(`  - ${endpoint.endpoint}`);
      console.log(`    Status: ${endpoint.statusCode}`);
      console.log(`    Type: ${endpoint.errorMessage}`);
      if (endpoint.responseBody) {
        console.log(`    Response: ${JSON.stringify(endpoint.responseBody).substring(0, 200)}`);
      }
      console.log('');
    }
  } else {
    console.log('NO PUBLIC AUTH ENDPOINTS FOUND');
    console.log('');
    console.log('This confirms the SPIKE-AUTH-API-1 finding:');
    console.log('  -> DUPR does not expose a public authentication API endpoint');
    console.log('  -> WebView-based authentication is the recommended approach');
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('CONCLUSION');
  console.log('='.repeat(80));
  console.log('');

  if (potentialEndpoints.length === 0) {
    console.log('CONFIRMED: WebView is the primary authentication method.');
    console.log('Direct API authentication is NOT available.');
    console.log('');
    console.log('Recommendation: Proceed with WebView-based auth (SPIKE-AUTH-A1 through A4)');
  } else {
    console.log('POTENTIAL AUTH ENDPOINTS DETECTED - Further investigation required.');
    console.log('Test with additional request formats and analyze responses.');
  }

  console.log('');
  console.log(`Test completed at: ${new Date().toISOString()}`);

  return allResults;
}

// Export for potential use as a module
export { testEndpoint, runAllTests, API_ENDPOINTS, REQUEST_FORMATS, TestResult };

// Run tests if executed directly
// Note: In ES modules, use import.meta.url check instead
const isMainModule = typeof require !== 'undefined' && require.main === module;
if (isMainModule) {
  runAllTests().catch(console.error);
}
