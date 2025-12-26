# Security Remediation Plan

**Created:** December 26, 2024
**Based On:** Security audits of becky-mobile and evangelo-sommer applications
**Version:** 1.0
**Status:** Actionable

---

## Executive Summary

This remediation plan consolidates findings from security audits of both the Becky Mobile application (Expo SDK 52, React Native 0.76) and the Evangelo-Sommer web application (Next.js 15.5.7, Prisma ORM). The plan provides prioritized, actionable remediation steps with implementation guidance.

### Findings Overview

| Priority | Count | Category Description |
|----------|-------|---------------------|
| **P0 (Critical)** | 5 | Must fix before any production deployment |
| **P1 (High)** | 7 | Fix within first sprint after deployment |
| **P2 (Medium)** | 9 | Fix within 30 days |
| **P3 (Low)** | 7 | Address in regular maintenance |
| **Total** | 28 | |

### Estimated Total Effort

| Phase | Items | Estimated Time |
|-------|-------|----------------|
| Phase 1 (P0 Critical) | 5 items | 8-12 hours |
| Phase 2 (P1 High) | 7 items | 12-16 hours |
| Phase 3 (P2/P3) | 16 items | 20-30 hours |
| **Total** | 28 items | **40-58 hours** |

### Recommended Implementation Order

1. **Immediate (Day 1):** Rotate all exposed API keys and secrets
2. **Day 1-2:** Secure token storage, update vulnerable dependencies
3. **Week 1:** Move API keys to backend, implement certificate pinning
4. **Week 2:** Implement CSP, refresh token rotation, console log stripping
5. **Month 1:** Remaining medium/low priority items

---

## P0 Critical Items (Must Fix Before Production)

### SEC-001: Rotate All Exposed API Keys and Secrets

**Priority:** P0 (Critical)
**Affected:** Both (Mobile & Web)
**Complexity:** Simple
**Estimated Time:** 1-2 hours

**Current Issue:**
Active API keys and secrets are exposed in local environment files in both projects:
- Mobile: `.env` contains Anthropic and Google Places API keys
- Web: `.env.local` contains all production secrets including database credentials, OAuth secrets, and API keys

**Files Affected:**
- `/Users/epsommer/projects/apps/becky-mobile/.env`
- `/Users/epsommer/projects/web/evangelo-sommer/.env.local`

**Implementation Steps:**

1. **Rotate Anthropic API Key**
   - Go to https://console.anthropic.com/settings/keys
   - Create new API key
   - Delete the compromised key

2. **Rotate Google Places API Key**
   - Go to https://console.cloud.google.com/apis/credentials
   - Create new API key with appropriate restrictions
   - Delete the compromised key

3. **Rotate Web Application Secrets** (in Vercel Dashboard or hosting provider)
   - `NEXTAUTH_SECRET`: Generate new with `openssl rand -base64 32`
   - `DATABASE_URL`: Change password in Neon dashboard, update connection string
   - `GOOGLE_CLIENT_SECRET`: Generate new in Google Cloud Console
   - `NOTION_CLIENT_SECRET`: Generate new in Notion Integrations
   - `SENDGRID_API_KEY`: Generate new in SendGrid dashboard
   - `EMAIL_SERVER_PASSWORD`: Reset SMTP password
   - `UPSTASH_REDIS_REST_TOKEN`: Regenerate in Upstash console

4. **Update Production Environment Variables**
   - Update Vercel environment variables for web app
   - Update EAS Secrets for mobile app: `eas secret:create --name API_KEY`

5. **Remove Local .env Files**
   - Delete or secure local environment files
   - Ensure they are in `.gitignore`

**Verification:**
- [ ] Old API keys return authentication errors
- [ ] Applications work with new keys in staging/production
- [ ] No secrets visible in git history

---

### SEC-002: Secure JWT Token Storage (Mobile)

**Priority:** P0 (Critical)
**Affected:** Mobile
**Complexity:** Moderate
**Estimated Time:** 2-3 hours

**Current Issue:**
JWT tokens are stored in AsyncStorage (plaintext) instead of secure storage. Tokens can be extracted from device backups or on rooted/jailbroken devices.

**Files to Modify:**
- `/Users/epsommer/projects/apps/becky-mobile/context/AuthContext.tsx`
- `/Users/epsommer/projects/apps/becky-mobile/lib/api/interceptors.ts`
- `/Users/epsommer/projects/apps/becky-mobile/services/notifications.ts`
- `/Users/epsommer/projects/apps/becky-mobile/hooks/useGoogleCalendar.ts`

**Implementation Steps:**

1. **Install expo-secure-store**
```bash
cd /Users/epsommer/projects/apps/becky-mobile
npx expo install expo-secure-store
```

2. **Create Secure Storage Utility**

Create `/Users/epsommer/projects/apps/becky-mobile/lib/secureStorage.ts`:
```typescript
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// SecureStore only works on native platforms, fall back to AsyncStorage for web
const isSecureStoreAvailable = Platform.OS !== 'web';

export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    if (isSecureStoreAvailable) {
      await SecureStore.setItemAsync(key, value);
    } else {
      // Web fallback - consider using encryption library
      await AsyncStorage.setItem(key, value);
    }
  },

  async getItem(key: string): Promise<string | null> {
    if (isSecureStoreAvailable) {
      return await SecureStore.getItemAsync(key);
    } else {
      return await AsyncStorage.getItem(key);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (isSecureStoreAvailable) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  },
};

// Keys that require secure storage
export const SECURE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  PUSH_TOKEN: 'push_token',
  OAUTH_STATE: 'oauth_state',
} as const;
```

3. **Update AuthContext.tsx**

Replace AsyncStorage calls with secureStorage:

**Before:**
```typescript
await AsyncStorage.setItem('auth_token', newToken);
await AsyncStorage.setItem('user', JSON.stringify(newUser));
```

**After:**
```typescript
import { secureStorage, SECURE_KEYS } from '@/lib/secureStorage';

await secureStorage.setItem(SECURE_KEYS.AUTH_TOKEN, newToken);
await secureStorage.setItem(SECURE_KEYS.USER_DATA, JSON.stringify(newUser));
```

4. **Update interceptors.ts**

**Before:**
```typescript
const token = await AsyncStorage.getItem('auth_token');
```

**After:**
```typescript
import { secureStorage, SECURE_KEYS } from '@/lib/secureStorage';

const token = await secureStorage.getItem(SECURE_KEYS.AUTH_TOKEN);
```

5. **Update notifications.ts**

Replace push token storage:
```typescript
import { secureStorage, SECURE_KEYS } from '@/lib/secureStorage';

// Store push token
await secureStorage.setItem(SECURE_KEYS.PUSH_TOKEN, this.pushToken);

// Retrieve push token
const storedToken = await secureStorage.getItem(SECURE_KEYS.PUSH_TOKEN);
```

6. **Update useGoogleCalendar.ts**

Replace OAuth state storage:
```typescript
import { secureStorage, SECURE_KEYS } from '@/lib/secureStorage';

await secureStorage.setItem(SECURE_KEYS.OAUTH_STATE, response.data.state);
```

7. **Migrate Existing User Data**

Add migration logic for users with existing tokens:
```typescript
// In AuthContext initialization
const migrateFromAsyncStorage = async () => {
  const legacyToken = await AsyncStorage.getItem('auth_token');
  if (legacyToken) {
    await secureStorage.setItem(SECURE_KEYS.AUTH_TOKEN, legacyToken);
    await AsyncStorage.removeItem('auth_token');
  }
};
```

**Verification:**
- [ ] Login flow works correctly
- [ ] Token persists across app restarts
- [ ] Token is NOT visible when inspecting app data on Android
- [ ] OAuth flows still work
- [ ] Push notifications still register

---

### SEC-003: Move Anthropic API to Backend Proxy (Mobile)

**Priority:** P0 (Critical)
**Affected:** Both (implementation in Web, affects Mobile)
**Complexity:** Moderate
**Estimated Time:** 3-4 hours

**Current Issue:**
The Anthropic API key is bundled directly into the mobile app client code, making it extractable through reverse engineering.

**Files to Modify:**
- Mobile: `/Users/epsommer/projects/apps/becky-mobile/lib/services/AIDraftService.ts`
- Mobile: `/Users/epsommer/projects/apps/becky-mobile/app.config.js`
- Web: `/Users/epsommer/projects/web/evangelo-sommer/src/app/api/ai/draft-message/route.ts` (already exists)

**Implementation Steps:**

1. **Remove API Key from Mobile Config**

Modify `/Users/epsommer/projects/apps/becky-mobile/app.config.js`:

**Before:**
```javascript
extra: {
  eas: { projectId: "90f7fff2-5572-4b2f-ae32-edf22e4dd01b" },
  backendUrl: "https://www.evangelosommer.com",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY, // REMOVE THIS
},
```

**After:**
```javascript
extra: {
  eas: { projectId: "90f7fff2-5572-4b2f-ae32-edf22e4dd01b" },
  backendUrl: "https://www.evangelosommer.com",
  // API keys are now managed server-side only
},
```

2. **Update Mobile AIDraftService.ts**

Modify `/Users/epsommer/projects/apps/becky-mobile/lib/services/AIDraftService.ts`:

**Before:**
```typescript
import { ANTHROPIC_API_KEY } from '@env';
const API_KEY = ANTHROPIC_API_KEY || '';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Direct API call to Anthropic
const response = await fetch(ANTHROPIC_API_URL, {
  headers: {
    'x-api-key': API_KEY,
    // ...
  }
});
```

**After:**
```typescript
import { apiClient } from '@/lib/api/client';

interface DraftMessageRequest {
  conversationContext: string;
  clientName: string;
  messageType: 'follow_up' | 'response' | 'initial';
  tone?: string;
}

interface DraftMessageResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function generateDraftMessage(
  request: DraftMessageRequest
): Promise<DraftMessageResponse> {
  try {
    const response = await apiClient.post<DraftMessageResponse>(
      '/api/ai/draft-message',
      request
    );
    return response.data;
  } catch (error) {
    console.error('[AIDraftService] Error generating draft:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate draft',
    };
  }
}
```

3. **Secure the Web API Route**

The route already exists at `/Users/epsommer/projects/web/evangelo-sommer/src/app/api/ai/draft-message/route.ts`. Ensure it:
- Requires authentication
- Has rate limiting
- Validates input

4. **Remove ANTHROPIC_API_KEY from env.d.ts**

Update `/Users/epsommer/projects/apps/becky-mobile/types/env.d.ts`:
```typescript
declare module '@env' {
  export const EXPO_PUBLIC_BACKEND_URL: string;
  // REMOVE: export const ANTHROPIC_API_KEY: string;
}
```

5. **Clean Up .env Files**

Remove `ANTHROPIC_API_KEY` from mobile `.env` and `.env.example` files.

**Verification:**
- [ ] AI draft generation works from mobile app
- [ ] API key is NOT in compiled app bundle
- [ ] API calls are authenticated
- [ ] Rate limiting prevents abuse

---

### SEC-004: Update Next.js to Fix DoS Vulnerability (Web)

**Priority:** P0 (Critical)
**Affected:** Web
**Complexity:** Simple
**Estimated Time:** 30 minutes

**Current Issue:**
Next.js 15.5.7 has a high-severity Denial of Service vulnerability in Server Components (GHSA-mwv6-3258-q52c).

**Files to Modify:**
- `/Users/epsommer/projects/web/evangelo-sommer/package.json`

**Implementation Steps:**

1. **Update Next.js**
```bash
cd /Users/epsommer/projects/web/evangelo-sommer
npm update next@15.5.9
```

2. **Verify Installation**
```bash
npm list next
# Should show next@15.5.9 or higher
```

3. **Run Tests**
```bash
npm run build
npm run test  # if tests exist
```

4. **Test Application**
- Start the development server: `npm run dev`
- Test critical user flows
- Verify no regressions

**Verification:**
- [ ] `npm audit` shows no high/critical Next.js vulnerabilities
- [ ] Application builds successfully
- [ ] All routes work correctly
- [ ] Server Components render properly

---

### SEC-005: Remove API Key Logging (Web)

**Priority:** P0 (Critical)
**Affected:** Web
**Complexity:** Simple
**Estimated Time:** 15 minutes

**Current Issue:**
The full Anthropic API key is logged to the console in the draft-message API route, which could expose it in server logs.

**Files to Modify:**
- `/Users/epsommer/projects/web/evangelo-sommer/src/app/api/ai/draft-message/route.ts`

**Implementation Steps:**

1. **Remove Debug Logging**

Modify lines 9-13:

**Before:**
```typescript
console.log('=== API KEY DEBUG ===');
console.log('Raw API Key:', apiKey);
console.log('API Key length:', apiKey.length);
console.log('API Key starts with sk-ant:', apiKey.startsWith('sk-ant'));
console.log('====================');
```

**After:**
```typescript
// Only log presence, never the actual key value
if (!apiKey || !apiKey.startsWith('sk-ant')) {
  console.error('[AI Route] Invalid or missing Anthropic API key');
}
```

2. **Audit Other API Routes**

Search for similar logging patterns:
```bash
grep -r "API.*Key" --include="*.ts" --include="*.tsx" src/app/api/
```

**Verification:**
- [ ] API key is not visible in server logs
- [ ] API route still functions correctly
- [ ] Invalid API key configurations are logged (without the key value)

---

## P1 High Priority Items (Fix Within First Sprint)

### SEC-006: Remove JWT Fallback Secret (Web)

**Priority:** P1 (High)
**Affected:** Web
**Complexity:** Simple
**Estimated Time:** 30 minutes

**Current Issue:**
The mobile login endpoint uses a hardcoded fallback secret if environment variables are not set.

**Files to Modify:**
- `/Users/epsommer/projects/web/evangelo-sommer/src/app/api/auth/mobile-login/route.ts`
- `/Users/epsommer/projects/web/evangelo-sommer/src/lib/auth.ts`

**Implementation Steps:**

1. **Update mobile-login/route.ts**

**Before:**
```typescript
const JWT_SECRET = process.env.JWT_SECRET
  || process.env.NEXTAUTH_SECRET
  || process.env.NEXTAUTH_JWT_SECRET
  || 'fallback-secret-change-in-production';
```

**After:**
```typescript
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

if (!JWT_SECRET) {
  console.error('[Mobile Login] CRITICAL: No JWT secret configured');
  throw new Error('Authentication configuration error');
}
```

2. **Update auth.ts**

**Before:**
```typescript
secret: process.env.NEXTAUTH_SECRET || (
  process.env.NODE_ENV === 'production'
    ? undefined
    : "dev-secret-key-123"
),
```

**After:**
```typescript
secret: process.env.NEXTAUTH_SECRET,
// Will throw error in NextAuth if undefined
```

3. **Add Environment Validation**

Create or update `/Users/epsommer/projects/web/evangelo-sommer/src/lib/env-validation.ts`:
```typescript
export function validateRequiredEnvVars() {
  const required = [
    'NEXTAUTH_SECRET',
    'DATABASE_URL',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

// Call early in application startup
```

**Verification:**
- [ ] Application fails to start without JWT_SECRET configured
- [ ] Error message is descriptive but doesn't expose sensitive info
- [ ] Production deployment has all required secrets

---

### SEC-007: Implement SSL Certificate Pinning (Mobile)

**Priority:** P1 (High)
**Affected:** Mobile
**Complexity:** Moderate
**Estimated Time:** 2-3 hours

**Current Issue:**
The mobile app does not implement certificate pinning, making it vulnerable to man-in-the-middle attacks.

**Files to Modify:**
- `/Users/epsommer/projects/apps/becky-mobile/package.json`
- Create: `/Users/epsommer/projects/apps/becky-mobile/lib/ssl-pinning.ts`
- `/Users/epsommer/projects/apps/becky-mobile/App.tsx`

**Implementation Steps:**

1. **Install SSL Pinning Library**
```bash
cd /Users/epsommer/projects/apps/becky-mobile
npm install react-native-ssl-public-key-pinning
npx pod-install  # For iOS
```

2. **Get Server Certificate Hash**
```bash
# Get the public key hash for your server
openssl s_client -connect www.evangelosommer.com:443 -servername www.evangelosommer.com 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

3. **Create SSL Pinning Configuration**

Create `/Users/epsommer/projects/apps/becky-mobile/lib/ssl-pinning.ts`:
```typescript
import { initializeSslPinning } from 'react-native-ssl-public-key-pinning';
import { Platform } from 'react-native';

// Replace with actual certificate hashes
const CERTIFICATE_HASHES = {
  primary: 'YOUR_PRIMARY_CERTIFICATE_HASH_HERE',
  backup: 'YOUR_BACKUP_CERTIFICATE_HASH_HERE',
};

export async function initializeSSLPinning(): Promise<void> {
  // SSL pinning only works on native platforms
  if (Platform.OS === 'web') {
    console.log('[SSL] Skipping SSL pinning on web platform');
    return;
  }

  if (__DEV__) {
    console.log('[SSL] Skipping SSL pinning in development mode');
    return;
  }

  try {
    await initializeSslPinning({
      'www.evangelosommer.com': {
        includeSubdomains: true,
        publicKeyHashes: [
          CERTIFICATE_HASHES.primary,
          CERTIFICATE_HASHES.backup,
        ],
      },
    });
    console.log('[SSL] Certificate pinning initialized successfully');
  } catch (error) {
    console.error('[SSL] Failed to initialize certificate pinning:', error);
    // In production, you might want to prevent app from continuing
    // throw error;
  }
}
```

4. **Initialize on App Start**

Update `/Users/epsommer/projects/apps/becky-mobile/App.tsx`:
```typescript
import { initializeSSLPinning } from '@/lib/ssl-pinning';

useEffect(() => {
  initializeSSLPinning();
}, []);
```

5. **Plan for Certificate Rotation**

Document the process for updating certificate hashes when certificates are renewed.

**Verification:**
- [ ] App connects to API server normally
- [ ] App fails to connect when using a proxy with different certificate
- [ ] Certificate pinning only active in production builds
- [ ] Backup certificate hash is valid

---

### SEC-008: Add Production Console Log Stripping (Both)

**Priority:** P1 (High)
**Affected:** Both
**Complexity:** Simple
**Estimated Time:** 1 hour

**Current Issue:**
Both applications have extensive console logging (2,413 in mobile, 1,968 in web) that persists in production builds.

**Files to Modify:**
- Mobile: `/Users/epsommer/projects/apps/becky-mobile/babel.config.js`
- Mobile: `/Users/epsommer/projects/apps/becky-mobile/package.json`
- Web: Consider implementing structured logging

**Implementation Steps (Mobile):**

1. **Install Babel Plugin**
```bash
cd /Users/epsommer/projects/apps/becky-mobile
npm install --save-dev babel-plugin-transform-remove-console
```

2. **Update babel.config.js**

**Before:**
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // existing plugins
    ],
  };
};
```

**After:**
```javascript
module.exports = function(api) {
  api.cache(true);

  const plugins = [
    // existing plugins
  ];

  // Remove console statements in production
  if (process.env.NODE_ENV === 'production') {
    plugins.push(['transform-remove-console', {
      exclude: ['error', 'warn'], // Keep error and warn for debugging production issues
    }]);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
```

3. **Clear Metro Cache**
```bash
npx expo start --clear
```

**Implementation Steps (Web):**

Consider implementing a structured logging solution:
```typescript
// src/lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';

export const logger = {
  debug: (...args: unknown[]) => {
    if (LOG_LEVELS.debug >= LOG_LEVELS[CURRENT_LEVEL]) {
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (LOG_LEVELS.info >= LOG_LEVELS[CURRENT_LEVEL]) {
      console.log('[INFO]', ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (LOG_LEVELS.warn >= LOG_LEVELS[CURRENT_LEVEL]) {
      console.warn('[WARN]', ...args);
    }
  },
  error: (...args: unknown[]) => {
    if (LOG_LEVELS.error >= LOG_LEVELS[CURRENT_LEVEL]) {
      console.error('[ERROR]', ...args);
    }
  },
};
```

**Verification:**
- [ ] Production mobile build has no console.log output
- [ ] console.error and console.warn still work
- [ ] Web production build has minimal logging
- [ ] No sensitive data appears in logs

---

### SEC-009: Update Vulnerable Dependencies (Both)

**Priority:** P1 (High)
**Affected:** Both
**Complexity:** Simple
**Estimated Time:** 1 hour

**Current Issue:**
Both applications have vulnerable dependencies:
- Mobile: `@babel/runtime` (moderate - ReDoS)
- Web: `nodemailer` (moderate - DoS)

**Implementation Steps:**

1. **Update Mobile Dependencies**
```bash
cd /Users/epsommer/projects/apps/becky-mobile
npm update @babel/runtime
npm audit fix
```

2. **Update Web Dependencies**
```bash
cd /Users/epsommer/projects/web/evangelo-sommer
npm update nodemailer@latest
npm audit fix
```

3. **Verify Updates**
```bash
# Mobile
cd /Users/epsommer/projects/apps/becky-mobile
npm audit

# Web
cd /Users/epsommer/projects/web/evangelo-sommer
npm audit
```

4. **Test Applications**
- Run build for both applications
- Test email functionality (web)
- Run existing tests

**Verification:**
- [ ] `npm audit` shows 0 high/critical vulnerabilities for both apps
- [ ] All functionality works correctly
- [ ] Builds complete successfully

---

### SEC-010: Implement Token Expiration Checking (Mobile)

**Priority:** P1 (High)
**Affected:** Mobile
**Complexity:** Moderate
**Estimated Time:** 2 hours

**Current Issue:**
The mobile app skips token verification on app start, meaning expired or revoked tokens could be used until a server request fails.

**Files to Modify:**
- `/Users/epsommer/projects/apps/becky-mobile/context/AuthContext.tsx`
- `/Users/epsommer/projects/apps/becky-mobile/package.json`

**Implementation Steps:**

1. **Install JWT Decode Library**
```bash
cd /Users/epsommer/projects/apps/becky-mobile
npm install jwt-decode
npm install --save-dev @types/jwt-decode
```

2. **Create Token Validation Utility**

Create `/Users/epsommer/projects/apps/becky-mobile/lib/tokenValidation.ts`:
```typescript
import { jwtDecode } from 'jwt-decode';

interface JWTPayload {
  exp: number;
  iat: number;
  sub: string;
  [key: string]: unknown;
}

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    const expiryTime = decoded.exp * 1000; // Convert to milliseconds
    const now = Date.now();

    // Consider token expired if within buffer of expiry
    return now >= (expiryTime - TOKEN_EXPIRY_BUFFER_MS);
  } catch (error) {
    console.error('[TokenValidation] Failed to decode token:', error);
    return true; // Treat invalid tokens as expired
  }
}

export function getTokenExpiryTime(token: string): Date | null {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    return new Date(decoded.exp * 1000);
  } catch {
    return null;
  }
}

export function shouldRefreshToken(token: string): boolean {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    const expiryTime = decoded.exp * 1000;
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;

    // Refresh if less than 30 minutes until expiry
    return timeUntilExpiry < 30 * 60 * 1000;
  } catch {
    return true;
  }
}
```

3. **Update AuthContext.tsx**

Add token validation to auth flow:
```typescript
import { isTokenExpired, shouldRefreshToken } from '@/lib/tokenValidation';

const loadStoredAuth = async (skipVerification = false) => {
  const storedToken = await secureStorage.getItem(SECURE_KEYS.AUTH_TOKEN);

  if (!storedToken) {
    setLoading(false);
    return;
  }

  // Check token expiration locally
  if (isTokenExpired(storedToken)) {
    console.log('[Auth] Token expired, clearing auth');
    await clearAuth();
    return;
  }

  // Check if token needs refresh
  if (shouldRefreshToken(storedToken)) {
    console.log('[Auth] Token near expiry, attempting refresh');
    try {
      await refreshToken();
    } catch (error) {
      console.error('[Auth] Token refresh failed:', error);
      await clearAuth();
      return;
    }
  }

  // Token is valid, proceed with loading user
  // ... rest of logic
};
```

**Verification:**
- [ ] Expired tokens are detected without server call
- [ ] Users are logged out when token expires
- [ ] Token refresh is attempted before expiry
- [ ] App handles token decode errors gracefully

---

### SEC-011: Implement Content Security Policy (Web)

**Priority:** P1 (High)
**Affected:** Web
**Complexity:** Moderate
**Estimated Time:** 2-3 hours

**Current Issue:**
The web application does not implement Content Security Policy, reducing protection against XSS attacks.

**Files to Modify:**
- `/Users/epsommer/projects/web/evangelo-sommer/src/middleware.ts`
- `/Users/epsommer/projects/web/evangelo-sommer/src/app/layout.tsx`

**Implementation Steps:**

1. **Update middleware.ts**

Add CSP header generation:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

function generateCSPHeader(nonce: string): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`, // unsafe-inline for CSS-in-JS
    "img-src 'self' blob: data: https:",
    "font-src 'self' https://use.typekit.net",
    "connect-src 'self' https://api.anthropic.com https://*.neon.tech https://*.upstash.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];

  return directives.join('; ');
}

export async function middleware(request: NextRequest) {
  // Generate nonce for this request
  const nonce = generateNonce();

  // Get existing response or create new one
  const response = NextResponse.next();

  // Set CSP header
  response.headers.set(
    'Content-Security-Policy',
    generateCSPHeader(nonce)
  );

  // Pass nonce to components via header
  response.headers.set('x-nonce', nonce);

  // ... rest of middleware logic

  return response;
}
```

2. **Update layout.tsx to Use Nonce**

```typescript
import { headers } from 'next/headers';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || '';

  return (
    <html lang="en">
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function() { /* theme script */ })();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

3. **Start with Report-Only Mode**

For initial deployment, use Content-Security-Policy-Report-Only to identify violations without breaking functionality:
```typescript
response.headers.set(
  'Content-Security-Policy-Report-Only',
  generateCSPHeader(nonce)
);
```

4. **Monitor and Adjust**

- Check browser console for CSP violations
- Adjust directives as needed
- Switch to enforcing mode once stable

**Verification:**
- [ ] CSP header is present in responses
- [ ] Application loads without CSP violations (or violations are expected and documented)
- [ ] External scripts are properly nonced
- [ ] XSS attempts are blocked

---

### SEC-012: Fix CORS Configuration (Web)

**Priority:** P1 (High)
**Affected:** Web
**Complexity:** Simple
**Estimated Time:** 30 minutes

**Current Issue:**
CORS configuration includes localhost origins in production, which could be exploited.

**Files to Modify:**
- `/Users/epsommer/projects/web/evangelo-sommer/src/app/api/testimonials/submit/route.ts`
- Check other API routes for similar patterns

**Implementation Steps:**

1. **Update CORS Configuration**

**Before:**
```typescript
const ALLOWED_ORIGINS = [
  'https://woodgreenlandscaping.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
];
```

**After:**
```typescript
const PRODUCTION_ORIGINS = [
  'https://woodgreenlandscaping.com',
  'https://www.woodgreenlandscaping.com',
  'https://www.evangelosommer.com',
];

const DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
];

const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? PRODUCTION_ORIGINS
  : [...PRODUCTION_ORIGINS, ...DEVELOPMENT_ORIGINS];
```

2. **Search for Other CORS Configurations**
```bash
grep -r "ALLOWED_ORIGINS\|Access-Control-Allow-Origin" \
  --include="*.ts" --include="*.tsx" \
  /Users/epsommer/projects/web/evangelo-sommer/src/app/api/
```

3. **Apply Same Pattern to All Routes**

**Verification:**
- [ ] Production build does not allow localhost origins
- [ ] Development still works with localhost
- [ ] Cross-origin requests from allowed domains work
- [ ] Requests from unknown origins are rejected

---

## P2 Medium Priority Items (Fix Within 30 Days)

### SEC-013: Implement Refresh Token Rotation (Both)

**Priority:** P2 (Medium)
**Affected:** Both
**Complexity:** Complex
**Estimated Time:** 4-6 hours

**Current Issue:**
Both applications use long-lived tokens (7 days) without refresh token rotation, increasing the window for token theft exploitation.

**Implementation Guidance:**

1. **Design Token System**
   - Access token: 15-60 minutes expiry
   - Refresh token: 30 days, single-use
   - Store refresh tokens in database
   - Invalidate on use, generate new pair

2. **API Endpoints Needed (Web)**
   - `POST /api/auth/refresh` - Exchange refresh token for new pair
   - Update login endpoints to return both tokens

3. **Mobile Client Changes**
   - Store both tokens in SecureStore
   - Implement automatic refresh before expiry
   - Handle refresh failures gracefully

4. **Database Schema**
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP
);
```

**Verification:**
- [ ] Access tokens expire in 15-60 minutes
- [ ] Refresh tokens work correctly
- [ ] Old refresh tokens are invalidated after use
- [ ] Users stay logged in across sessions

---

### SEC-014: Remove CSRF Bypass in Development (Web)

**Priority:** P2 (Medium)
**Affected:** Web
**Complexity:** Simple
**Estimated Time:** 1 hour

**Files to Modify:**
- `/Users/epsommer/projects/web/evangelo-sommer/src/lib/csrf.ts`

**Implementation Guidance:**

1. Remove or modify the development bypass
2. Use a persistent token store (Redis) in development
3. Log warnings but still enforce validation

**Before:**
```typescript
if (process.env.NODE_ENV === 'development') {
  console.warn('CSRF token not found...');
  return true; // Allow in development
}
```

**After:**
```typescript
if (process.env.NODE_ENV === 'development') {
  console.warn('CSRF validation failed - this would fail in production');
  // Still enforce in development to catch issues early
}
return false;
```

---

### SEC-015: Audit and Minimize Android Permissions (Mobile)

**Priority:** P2 (Medium)
**Affected:** Mobile
**Complexity:** Moderate
**Estimated Time:** 2 hours

**Files to Modify:**
- `/Users/epsommer/projects/apps/becky-mobile/app.json`

**Current Permissions:**
```json
"permissions": [
  "READ_CONTACTS",
  "READ_SMS",
  "READ_CALENDAR",
  "WRITE_CALENDAR",
  "GET_ACCOUNTS",
  "WAKE_LOCK",
  "RECEIVE_BOOT_COMPLETED"
]
```

**Implementation Guidance:**

1. Review each permission against actual feature usage
2. Remove unused permissions
3. Implement progressive permission requests
4. Document why each remaining permission is needed

**Questions to Answer:**
- Is READ_SMS actually used?
- Is READ_CONTACTS required or optional?
- Can GET_ACCOUNTS be removed?

---

### SEC-016: Implement Structured Logging (Both)

**Priority:** P2 (Medium)
**Affected:** Both
**Complexity:** Moderate
**Estimated Time:** 3-4 hours

**Implementation Guidance:**

1. Create a logging utility with levels (debug, info, warn, error)
2. Add automatic redaction of sensitive fields
3. Configure per-environment log levels
4. Replace console.* calls gradually

**Sensitive Fields to Redact:**
- `token`, `accessToken`, `refreshToken`
- `password`, `secret`, `apiKey`
- `email` (partially), `phone`

---

### SEC-017: Add File Path Validation (Mobile)

**Priority:** P2 (Medium)
**Affected:** Mobile
**Complexity:** Simple
**Estimated Time:** 1 hour

**Files to Modify:**
- `/Users/epsommer/projects/apps/becky-mobile/services/export.ts`
- `/Users/epsommer/projects/apps/becky-mobile/services/fileUpload.ts`

**Implementation:**
```typescript
import * as FileSystem from 'expo-file-system';

function isPathWithinAppDirectory(path: string): boolean {
  const docDir = FileSystem.documentDirectory;
  const cacheDir = FileSystem.cacheDirectory;

  if (!docDir || !cacheDir) return false;

  return path.startsWith(docDir) || path.startsWith(cacheDir);
}

// Use before file operations
if (!isPathWithinAppDirectory(filePath)) {
  throw new Error('Invalid file path');
}
```

---

### SEC-018: Remove Development Secret Fallback (Web)

**Priority:** P2 (Medium)
**Affected:** Web
**Complexity:** Simple
**Estimated Time:** 30 minutes

**Files to Modify:**
- `/Users/epsommer/projects/web/evangelo-sommer/src/lib/auth.ts`

Remove hardcoded development secret and require explicit configuration.

---

### SEC-019: Set Up EAS Secrets Management (Mobile)

**Priority:** P2 (Medium)
**Affected:** Mobile
**Complexity:** Moderate
**Estimated Time:** 2 hours

**Implementation Steps:**

1. **Create EAS Secrets**
```bash
eas secret:create --name GOOGLE_PLACES_API_KEY --value "your-key"
eas secret:create --name BACKEND_URL --value "https://www.evangelosommer.com"
```

2. **Update app.config.js to use EAS secrets during build**

3. **Remove local .env file from development workflow**

4. **Document secrets rotation process**

---

### SEC-020: Ensure Credentials Directory is Gitignored (Mobile)

**Priority:** P2 (Medium)
**Affected:** Mobile
**Complexity:** Simple
**Estimated Time:** 15 minutes

**Files to Modify:**
- `/Users/epsommer/projects/apps/becky-mobile/.gitignore`

**Add:**
```
# Credentials
credentials/
*.credentials.json
service-account*.json
```

---

### SEC-021: Review and Address ESLint Warnings (Web)

**Priority:** P2 (Medium)
**Affected:** Web
**Complexity:** Moderate
**Estimated Time:** 2-4 hours

**Files to Modify:**
- `/Users/epsommer/projects/web/evangelo-sommer/next.config.ts`

1. Remove `ignoreDuringBuilds: true` from ESLint config
2. Run `npm run lint` to see all warnings
3. Fix security-related warnings first
4. Document any intentionally ignored rules

---

## P3 Low Priority Items (Address in Regular Maintenance)

### SEC-022: Remove Token Fragment Logging (Both)

**Priority:** P3 (Low)
**Affected:** Both
**Complexity:** Simple
**Estimated Time:** 1 hour

Remove all instances of token logging, even partial tokens:
```typescript
// Remove lines like:
console.log('[Auth] Token:', token.substring(0, 20) + '...');
```

---

### SEC-023: Implement Jailbreak/Root Detection (Mobile)

**Priority:** P3 (Low)
**Affected:** Mobile
**Complexity:** Moderate
**Estimated Time:** 2-3 hours

Use JailMonkey or similar library to detect compromised devices and warn users.

---

### SEC-024: Use Next.js Script Component (Web)

**Priority:** P3 (Low)
**Affected:** Web
**Complexity:** Simple
**Estimated Time:** 1 hour

Replace `dangerouslySetInnerHTML` script injection with Next.js Script component.

---

### SEC-025: Ensure No Sensitive Data in localStorage (Web)

**Priority:** P3 (Low)
**Affected:** Web
**Complexity:** Simple
**Estimated Time:** 1 hour

Audit all localStorage usage and ensure no tokens or PII are stored.

---

### SEC-026: Add Security Scanning to CI/CD (Both)

**Priority:** P3 (Low)
**Affected:** Both
**Complexity:** Moderate
**Estimated Time:** 2-3 hours

Add `npm audit` and dependency scanning to build pipelines.

---

### SEC-027: Implement Biometric Authentication Option (Mobile)

**Priority:** P3 (Low)
**Affected:** Mobile
**Complexity:** Moderate
**Estimated Time:** 3-4 hours

Use `expo-local-authentication` to add optional biometric unlock.

---

### SEC-028: Document Security Configuration (Both)

**Priority:** P3 (Low)
**Affected:** Both
**Complexity:** Simple
**Estimated Time:** 2 hours

Create security documentation including:
- Secrets rotation procedures
- Certificate pinning update process
- Security incident response plan

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Pre-Production) - Days 1-3

| Day | Items | Description |
|-----|-------|-------------|
| 1 | SEC-001 | Rotate all exposed secrets |
| 1 | SEC-005 | Remove API key logging |
| 1-2 | SEC-002 | Implement secure token storage |
| 2 | SEC-004 | Update Next.js |
| 2-3 | SEC-003 | Move Anthropic API to backend |

**Completion Criteria:**
- All critical vulnerabilities addressed
- No secrets in client-side code
- Vulnerable dependencies updated

### Phase 2: High Priority (First Sprint) - Week 1-2

| Week | Items | Description |
|------|-------|-------------|
| 1 | SEC-006, SEC-012 | Remove fallback secrets, fix CORS |
| 1 | SEC-007 | Implement SSL pinning |
| 1 | SEC-008, SEC-009 | Console stripping, dependency updates |
| 2 | SEC-010 | Token expiration checking |
| 2 | SEC-011 | Content Security Policy |

**Completion Criteria:**
- All high priority items resolved
- Security headers in place
- Token management improved

### Phase 3: Medium/Low Priority (Ongoing) - Weeks 3-8

| Timeframe | Items | Description |
|-----------|-------|-------------|
| Week 3-4 | SEC-013 through SEC-017 | Refresh tokens, logging, validation |
| Week 5-6 | SEC-018 through SEC-021 | Configuration hardening |
| Week 7-8 | SEC-022 through SEC-028 | Low priority improvements |

**Completion Criteria:**
- All audit findings addressed
- Security documentation complete
- Monitoring in place

---

## Verification Checklist

### Pre-Deployment Security Verification

#### Authentication & Authorization
- [ ] JWT tokens stored in secure storage (not AsyncStorage)
- [ ] Token expiration is validated client-side
- [ ] No fallback secrets in production code
- [ ] Refresh token rotation implemented

#### Data Protection
- [ ] No API keys in client-side code
- [ ] Sensitive data encrypted at rest
- [ ] No tokens logged (even partial)
- [ ] Console logging stripped in production

#### API Security
- [ ] SSL certificate pinning enabled
- [ ] CSP headers implemented
- [ ] CORS restricted to production domains
- [ ] Rate limiting configured

#### Secrets Management
- [ ] All exposed secrets rotated
- [ ] Secrets stored in environment/vault (not files)
- [ ] EAS Secrets configured for mobile
- [ ] Credentials directories gitignored

#### Dependencies
- [ ] `npm audit` shows 0 high/critical vulnerabilities
- [ ] All dependencies up to date
- [ ] Security scanning in CI/CD

### Security Testing Approach

1. **Static Analysis**
   - Run `npm audit` on both projects
   - Use ESLint security plugins
   - Scan for hardcoded secrets with tools like gitleaks

2. **Dynamic Testing**
   - Test authentication flows
   - Attempt to use expired tokens
   - Test CORS with unauthorized origins
   - Verify CSP blocks inline scripts

3. **Mobile-Specific Testing**
   - Attempt to extract data from app bundle
   - Test on rooted/jailbroken device
   - Verify SSL pinning blocks MITM proxy
   - Check secure storage encryption

4. **Penetration Testing (Recommended)**
   - Schedule professional security assessment
   - Focus on authentication and data exposure
   - Test API rate limiting effectiveness

---

## Appendix A: Quick Reference Commands

### Mobile Project
```bash
cd /Users/epsommer/projects/apps/becky-mobile

# Install secure storage
npx expo install expo-secure-store

# Install SSL pinning
npm install react-native-ssl-public-key-pinning

# Install console stripping
npm install --save-dev babel-plugin-transform-remove-console

# Check vulnerabilities
npm audit

# Create EAS secret
eas secret:create --name SECRET_NAME --value "value"
```

### Web Project
```bash
cd /Users/epsommer/projects/web/evangelo-sommer

# Update Next.js
npm update next@15.5.9

# Update nodemailer
npm update nodemailer@latest

# Check vulnerabilities
npm audit

# Run linting
npm run lint
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-26 | Security Team | Initial remediation plan |

---

*This document should be treated as confidential and shared only with authorized team members.*
