/**
 * JWT Utilities for DUPR token handling
 * Provides functions to decode, extract user info, and validate JWT tokens
 */

/**
 * Standard JWT payload claims plus DUPR-specific fields
 */
export interface JWTPayload {
  // Standard JWT claims
  iss?: string;           // Issuer
  sub?: string;           // Subject (usually user ID)
  aud?: string | string[]; // Audience
  exp?: number;           // Expiration time (Unix timestamp)
  nbf?: number;           // Not before time
  iat?: number;           // Issued at time
  jti?: string;           // JWT ID

  // DUPR-specific claims (may vary based on actual token structure)
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  duprId?: string;
  userId?: string;

  // Allow additional claims
  [key: string]: unknown;
}

/**
 * User information extracted from DUPR JWT token
 */
export interface DUPRUserInfo {
  name: string;
  email: string;
  duprId: string;
}

/**
 * Decodes the payload part of a JWT token
 *
 * @param token - The JWT token string
 * @returns The decoded payload object, or null if decoding fails
 */
export function decodeJWTPayload(token: string): JWTPayload | null {
  try {
    console.log('[JWT] Attempting to decode token payload');

    // JWT format: header.payload.signature
    const parts = token.split('.');

    if (parts.length !== 3) {
      console.log('[JWT] Invalid token format: expected 3 parts, got', parts.length);
      return null;
    }

    const payloadBase64 = parts[1];

    // Handle base64url encoding (replace - with + and _ with /)
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');

    // Pad with = if necessary
    const paddedBase64 = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');

    // Decode base64 using atob (available in React Native)
    const jsonString = atob(paddedBase64);

    // Parse JSON
    const payload: JWTPayload = JSON.parse(jsonString);

    console.log('[JWT] Successfully decoded token payload');

    return payload;
  } catch (error) {
    console.log('[JWT] Failed to decode token:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Extracts user information from a DUPR JWT token
 *
 * @param token - The JWT token string
 * @returns User info object with name, email, and duprId, or null if extraction fails
 */
export function extractUserFromToken(token: string): DUPRUserInfo | null {
  try {
    console.log('[JWT] Extracting user info from token');

    const payload = decodeJWTPayload(token);

    if (!payload) {
      console.log('[JWT] Cannot extract user: payload decoding failed');
      return null;
    }

    // Try to get name from various possible claims
    let name = payload.name || '';
    if (!name && (payload.firstName || payload.lastName)) {
      name = [payload.firstName, payload.lastName].filter(Boolean).join(' ');
    }

    // Try to get email
    const email = payload.email || '';

    // Try to get DUPR ID from various possible claims
    const duprId = payload.duprId || payload.userId || payload.sub || '';

    if (!name && !email && !duprId) {
      console.log('[JWT] No user information found in token payload');
      return null;
    }

    const userInfo: DUPRUserInfo = {
      name: name,
      email: email,
      duprId: duprId,
    };

    console.log('[JWT] Successfully extracted user info:', {
      name: userInfo.name || '(not provided)',
      email: userInfo.email || '(not provided)',
      duprId: userInfo.duprId || '(not provided)',
    });

    return userInfo;
  } catch (error) {
    console.log('[JWT] Failed to extract user from token:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Extract email from JWT sub claim (base64 encoded)
 *
 * @param token - The JWT token string
 * @returns The decoded email, or null if extraction fails
 */
export function extractEmailFromToken(token: string): string | null {
  const payload = decodeJWTPayload(token);
  if (!payload?.sub) return null;

  try {
    // sub is base64-encoded email
    return atob(payload.sub);
  } catch {
    // If not base64, return as-is (might be plain email)
    return payload.sub;
  }
}

/**
 * Checks if a JWT token is expired based on the exp claim
 *
 * @param token - The JWT token string
 * @returns true if expired, false if not expired, null if expiration cannot be determined
 */
export function isTokenExpired(token: string): boolean | null {
  try {
    console.log('[JWT] Checking token expiration');

    const payload = decodeJWTPayload(token);

    if (!payload) {
      console.log('[JWT] Cannot check expiration: payload decoding failed');
      return null;
    }

    if (typeof payload.exp !== 'number') {
      console.log('[JWT] No expiration claim (exp) found in token');
      return null;
    }

    // exp is in seconds, Date.now() is in milliseconds
    const expirationTime = payload.exp * 1000;
    const currentTime = Date.now();
    const isExpired = currentTime >= expirationTime;

    if (isExpired) {
      const expiredAgo = Math.floor((currentTime - expirationTime) / 1000);
      console.log('[JWT] Token is expired (expired', expiredAgo, 'seconds ago)');
    } else {
      const expiresIn = Math.floor((expirationTime - currentTime) / 1000);
      console.log('[JWT] Token is valid (expires in', expiresIn, 'seconds)');
    }

    return isExpired;
  } catch (error) {
    console.log('[JWT] Failed to check token expiration:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}
