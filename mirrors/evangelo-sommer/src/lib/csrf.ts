// CSRF Protection Utilities for OAuth flows
import { randomBytes, createHmac } from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-csrf-secret-change-in-production';
const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// Token storage (use Redis in production for distributed systems)
const tokenStore = new Map<string, { token: string; expiresAt: number; sessionId?: string }>();

/**
 * Generate a CSRF token for OAuth flows
 * @param sessionId Optional session identifier to bind token to specific session
 * @returns Base64-encoded CSRF token
 */
export function generateCSRFToken(sessionId?: string): string {
  // Clean up expired tokens periodically
  if (Math.random() < 0.1) { // 10% chance
    const now = Date.now();
    for (const [key, value] of tokenStore.entries()) {
      if (value.expiresAt < now) {
        tokenStore.delete(key);
      }
    }
  }

  // Generate random token
  const token = randomBytes(CSRF_TOKEN_LENGTH).toString('base64url');
  const expiresAt = Date.now() + CSRF_TOKEN_EXPIRY_MS;

  // Store token with expiry and optional session binding
  tokenStore.set(token, {
    token,
    expiresAt,
    sessionId,
  });

  return token;
}

/**
 * Validate a CSRF token
 * @param token The token to validate
 * @param sessionId Optional session identifier to verify token binding
 * @returns true if token is valid and not expired
 */
export function validateCSRFToken(token: string, sessionId?: string): boolean {
  if (!token) {
    return false;
  }

  const stored = tokenStore.get(token);

  if (!stored) {
    console.warn('CSRF token not found in store');
    return false;
  }

  // Check expiry
  if (stored.expiresAt < Date.now()) {
    console.warn('CSRF token expired');
    tokenStore.delete(token);
    return false;
  }

  // Check session binding if provided
  if (sessionId && stored.sessionId && stored.sessionId !== sessionId) {
    console.warn('CSRF token session mismatch');
    return false;
  }

  // Token is valid - remove it (one-time use)
  tokenStore.delete(token);
  return true;
}

/**
 * Generate a signed state parameter for OAuth flows
 * Combines CSRF token with optional user data
 * @param csrfToken The CSRF token
 * @param data Optional data to include in state
 * @returns Base64-encoded signed state
 */
export function generateOAuthState(csrfToken: string, data?: Record<string, unknown>): string {
  const stateObj = {
    csrf: csrfToken,
    ts: Date.now(),
    ...data,
  };

  const stateJson = JSON.stringify(stateObj);
  const stateB64 = Buffer.from(stateJson).toString('base64url');

  // Sign the state
  const signature = createHmac('sha256', CSRF_SECRET)
    .update(stateB64)
    .digest('base64url');

  // Return state with signature
  return `${stateB64}.${signature}`;
}

/**
 * Verify and parse OAuth state parameter
 * @param state The state parameter from OAuth callback
 * @returns Parsed state object if valid, null otherwise
 */
export function verifyOAuthState(state: string): { csrf: string; ts: number; [key: string]: unknown } | null {
  if (!state || typeof state !== 'string') {
    console.warn('Invalid OAuth state: missing or wrong type');
    return null;
  }

  const parts = state.split('.');
  if (parts.length !== 2) {
    console.warn('Invalid OAuth state: malformed format');
    return null;
  }

  const [stateB64, signature] = parts;

  // Verify signature
  const expectedSignature = createHmac('sha256', CSRF_SECRET)
    .update(stateB64)
    .digest('base64url');

  if (signature !== expectedSignature) {
    console.warn('Invalid OAuth state: signature mismatch');
    return null;
  }

  try {
    // Parse state
    const stateJson = Buffer.from(stateB64, 'base64url').toString('utf-8');
    const stateObj = JSON.parse(stateJson);

    // Verify timestamp (not too old)
    const age = Date.now() - stateObj.ts;
    if (age > CSRF_TOKEN_EXPIRY_MS) {
      console.warn('Invalid OAuth state: expired');
      return null;
    }

    return stateObj;
  } catch (error) {
    console.warn('Invalid OAuth state: parse error', error);
    return null;
  }
}

/**
 * Middleware helper to validate CSRF tokens in requests
 * @param token Token from request
 * @param sessionId Optional session ID
 * @returns Validation result with error message
 */
export function validateCSRFMiddleware(
  token: string | null | undefined,
  sessionId?: string
): { valid: boolean; error?: string } {
  if (!token) {
    return { valid: false, error: 'CSRF token missing' };
  }

  const isValid = validateCSRFToken(token, sessionId);

  if (!isValid) {
    return { valid: false, error: 'CSRF token invalid or expired' };
  }

  return { valid: true };
}
