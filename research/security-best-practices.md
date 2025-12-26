# Security Best Practices for React Native Mobile and Next.js Web Applications

**Research Date:** December 2024
**Applicable Projects:** becky-mobile (Expo SDK 52, React Native 0.76), evangelo-sommer (Next.js)
**Authors:** Security Research Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [React Native/Expo Security Checklist](#react-nativeexpo-security-checklist)
3. [Web Application Security Checklist](#web-application-security-checklist)
4. [API Security Requirements](#api-security-requirements)
5. [Priority Matrix](#priority-matrix)
6. [Detailed Findings](#detailed-findings)
7. [Sources and References](#sources-and-references)

---

## Executive Summary

This document provides comprehensive security guidance for React Native mobile applications (specifically Expo SDK 52 and React Native 0.76) and Next.js web applications. The research identifies critical vulnerabilities, industry best practices, and actionable recommendations aligned with OWASP standards.

### Key Findings

1. **Secure Storage is Critical**: AsyncStorage stores data in plaintext and must NEVER be used for sensitive data like tokens, credentials, or API keys. Use `expo-secure-store` instead.

2. **JWT Management Requires Careful Design**: Access tokens should expire in 15-60 minutes, with refresh token rotation implemented for session continuity.

3. **Deep Links are Inherently Insecure**: URL schemes can be hijacked by malicious applications. Use Universal Links (iOS) and App Links (Android) for sensitive flows.

4. **Client-Side Secrets are Not Secrets**: Any environment variable bundled into a mobile app can be extracted. Sensitive API keys must be managed server-side.

5. **Content Security Policy is Essential**: Web applications must implement strict CSP to prevent XSS and code injection attacks.

6. **Prisma Provides Protection with Caveats**: While Prisma ORM prevents most SQL injection through parameterized queries, `$queryRawUnsafe` and operator injection remain risks.

7. **Rate Limiting is Non-Negotiable**: APIs must implement rate limiting to prevent DoS attacks and brute force attempts.

8. **Code Obfuscation Adds Defense in Depth**: Hermes bytecode compilation provides baseline obfuscation; ProGuard/R8 adds additional protection for Android native code.

### Critical Recommendations (Immediate Action Required)

| Priority | Recommendation | Platform |
|----------|---------------|----------|
| CRITICAL | Replace AsyncStorage with expo-secure-store for all sensitive data | Mobile |
| CRITICAL | Implement proper JWT expiration (15-60 min access tokens) | All |
| CRITICAL | Never store API secrets in client-side code | Mobile |
| HIGH | Implement Content Security Policy (CSP) | Web |
| HIGH | Enable SSL/Certificate Pinning for production | Mobile |
| HIGH | Implement rate limiting on all API endpoints | API |
| HIGH | Validate deep link URLs before navigation | Mobile |
| HIGH | Use parameterized queries exclusively (avoid $queryRawUnsafe) | API |

---

## React Native/Expo Security Checklist

### Secure Storage (CRITICAL)

- [ ] **Use expo-secure-store for sensitive data**
  - Implementation: Replace all AsyncStorage usage for tokens, credentials, and PII
  - Platform behavior: iOS uses Keychain, Android uses encrypted SharedPreferences with Keystore
  - Note: 2048 byte limit per value; handle larger payloads by splitting or compressing
  - Severity: **CRITICAL**

  ```typescript
  // WRONG - Never do this
  import AsyncStorage from '@react-native-async-storage/async-storage';
  await AsyncStorage.setItem('authToken', token);

  // CORRECT
  import * as SecureStore from 'expo-secure-store';
  await SecureStore.setItemAsync('authToken', token);
  ```

- [ ] **Clear sensitive data on logout**
  - Remove all tokens and user data from secure storage when user logs out
  - Consider clearing on app uninstall (note: iOS Keychain persists across reinstalls)
  - Severity: **HIGH**

- [ ] **Avoid storing large sensitive payloads locally**
  - Fetch sensitive data from server when needed rather than caching
  - If caching is necessary, implement encryption at application level
  - Severity: **MEDIUM**

### API Key and Secret Management (CRITICAL)

- [ ] **Never bundle sensitive API keys in the app**
  - Client-side code can be decompiled and secrets extracted
  - Use a backend proxy for third-party API calls requiring secrets
  - Severity: **CRITICAL**

- [ ] **Use EXPO_PUBLIC_ prefix only for truly public configuration**
  - Firebase public config, Stripe publishable keys, analytics IDs
  - Never use for: write-access API keys, database credentials, private keys
  - Severity: **CRITICAL**

- [ ] **Use EAS Secrets for build-time configuration**
  - Build-time secrets are not included in the client bundle
  - Use `eas secret:create` for CI/CD pipeline secrets
  - Severity: **HIGH**

  ```bash
  # For build-time secrets (not in client bundle)
  eas secret:create --name MY_SECRET --value "sensitive-value"
  ```

### Certificate Pinning (HIGH)

- [ ] **Implement SSL pinning for production apps**
  - Use `react-native-ssl-public-key-pinning` for easier implementation
  - Alternative: `react-native-ssl-pinning` (requires custom fetch)
  - Severity: **HIGH**

  ```typescript
  import { initializeSslPinning } from 'react-native-ssl-public-key-pinning';

  await initializeSslPinning({
    'api.yourserver.com': {
      includeSubdomains: true,
      publicKeyHashes: [
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
        'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=', // Backup
      ],
    },
  });
  ```

- [ ] **Include backup certificate pins**
  - Plan for certificate rotation
  - Include pins for both current and next certificates
  - Severity: **HIGH**

- [ ] **Consider OTA pin updates**
  - Use expo-updates to update pins without app store release
  - Implement graceful degradation if pins fail
  - Severity: **MEDIUM**

### Deep Link Security (HIGH)

- [ ] **Validate all deep link URLs before navigation**
  - Never trust deep link parameters implicitly
  - Whitelist allowed paths and validate parameters
  - Severity: **HIGH**

  ```typescript
  // Validate deep link before processing
  const validateDeepLink = (url: string): boolean => {
    const allowedPaths = ['/products/', '/profile/', '/settings/'];
    const parsed = new URL(url);
    return allowedPaths.some(path => parsed.pathname.startsWith(path));
  };
  ```

- [ ] **Never pass sensitive data in deep links**
  - URL schemes can be intercepted by malicious apps
  - Use Universal Links (iOS) / App Links (Android) for sensitive flows
  - Severity: **CRITICAL**

- [ ] **Implement Universal Links (iOS) and App Links (Android)**
  - Provides verified association between app and domain
  - Prevents URL scheme hijacking
  - Severity: **HIGH**

- [ ] **Use React Navigation's deep linking config**
  - Avoid using the path prop directly
  - Specify explicit mapping between URLs and screens
  - Severity: **MEDIUM**

### Code Obfuscation (MEDIUM)

- [ ] **Enable Hermes engine**
  - Compiles JavaScript to optimized bytecode
  - Provides baseline obfuscation
  - Severity: **MEDIUM**

- [ ] **Enable ProGuard/R8 for Android release builds**
  - Add to `android/app/build.gradle`:

  ```gradle
  android {
    buildTypes {
      release {
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
      }
    }
  }
  ```
  - Severity: **MEDIUM**

- [ ] **Consider additional JavaScript obfuscation for high-security apps**
  - Use `obfuscator-io-metro-plugin` for Metro bundler
  - Be aware of potential debugging difficulties
  - Severity: **LOW**

### Authentication (HIGH)

- [ ] **Use expo-auth-session for OAuth flows**
  - Never use WebView for OAuth (security risk)
  - Implement PKCE (Proof Key for Code Exchange)
  - Severity: **HIGH**

  ```typescript
  import * as AuthSession from 'expo-auth-session';
  import * as WebBrowser from 'expo-web-browser';

  WebBrowser.maybeCompleteAuthSession();

  const discovery = AuthSession.useAutoDiscovery('https://auth.example.com');
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: 'your-client-id',
      scopes: ['openid', 'profile'],
      redirectUri: AuthSession.makeRedirectUri(),
      usePKCE: true,
    },
    discovery
  );
  ```

- [ ] **Implement biometric authentication where appropriate**
  - Use expo-local-authentication for face/fingerprint
  - Provide fallback to PIN/password
  - Severity: **MEDIUM**

### Runtime Security (MEDIUM)

- [ ] **Detect rooted/jailbroken devices**
  - Use JailMonkey or similar library
  - Warn users or restrict functionality on compromised devices
  - Severity: **MEDIUM**

- [ ] **Implement app integrity checks**
  - Verify app signature at runtime
  - Detect tampering or repackaging
  - Severity: **MEDIUM**

- [ ] **Disable debugging in production**
  - Ensure `__DEV__` checks are in place
  - Remove console.log statements with sensitive data
  - Severity: **HIGH**

---

## Web Application Security Checklist

### Server-Side Authentication (CRITICAL)

- [ ] **Implement authentication in middleware**
  - Check authentication before rendering protected routes
  - Create middleware.ts in root or app directory
  - Severity: **HIGH**

  ```typescript
  // middleware.ts
  import { NextResponse } from 'next/server';
  import type { NextRequest } from 'next/server';

  export function middleware(request: NextRequest) {
    const token = request.cookies.get('auth-token');

    if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
  }

  export const config = {
    matcher: ['/dashboard/:path*', '/api/protected/:path*'],
  };
  ```

- [ ] **Avoid layout-based auth checks**
  - Layout components don't re-render on client navigation
  - Could leave routes unprotected
  - Severity: **HIGH**

- [ ] **Implement auth checks in Server Actions**
  - Server Actions are like API routes and can be called directly
  - Always verify authentication within the action
  - Severity: **CRITICAL**

  ```typescript
  'use server';

  import { getSession } from '@/lib/auth';

  export async function updateProfile(data: FormData) {
    const session = await getSession();
    if (!session) {
      throw new Error('Unauthorized');
    }
    // Process update
  }
  ```

### Content Security Policy (HIGH)

- [ ] **Implement strict CSP headers**
  - Use nonce-based CSP for dynamic content
  - Configure in middleware or next.config.js
  - Severity: **HIGH**

  ```typescript
  // middleware.ts
  import { NextResponse } from 'next/server';
  import type { NextRequest } from 'next/server';

  export function middleware(request: NextRequest) {
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

    const cspHeader = `
      default-src 'self';
      script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
      style-src 'self' 'nonce-${nonce}';
      img-src 'self' blob: data:;
      font-src 'self';
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();

    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', cspHeader);
    response.headers.set('x-nonce', nonce);

    return response;
  }
  ```

- [ ] **Use libraries like Nosecone for simplified CSP management**
  - Provides pre-configured security headers
  - Supports Next.js, SvelteKit, and other frameworks
  - Severity: **MEDIUM**

### CSRF Protection (HIGH)

- [ ] **Implement CSRF tokens for form submissions**
  - Use csrf package for token generation/verification
  - Store tokens in cookies with secure flags
  - Severity: **HIGH**

  ```typescript
  import Csrf from 'csrf';

  const tokens = new Csrf();
  const secret = tokens.secretSync();
  const token = tokens.create(secret);

  // Verify on submission
  if (!tokens.verify(secret, submittedToken)) {
    throw new Error('Invalid CSRF token');
  }
  ```

- [ ] **Use SameSite cookies**
  - Set SameSite=Strict or SameSite=Lax
  - Prevents cross-site request attacks
  - Severity: **HIGH**

### XSS Prevention (HIGH)

- [ ] **Sanitize user input before rendering**
  - Use libraries: DOMPurify, sanitize-html, xss
  - Never use dangerouslySetInnerHTML with unsanitized content
  - Severity: **CRITICAL**

  ```typescript
  import DOMPurify from 'dompurify';

  const sanitizedHtml = DOMPurify.sanitize(userInput);
  ```

- [ ] **Validate and escape output**
  - React automatically escapes JSX content
  - Be cautious with dynamic attribute values
  - Severity: **HIGH**

- [ ] **Use Content-Security-Policy to mitigate XSS impact**
  - Blocks inline scripts unless explicitly allowed
  - Restricts script sources
  - Severity: **HIGH**

### Additional Security Headers (MEDIUM)

- [ ] **Configure comprehensive security headers**

  ```javascript
  // next.config.js
  const securityHeaders = [
    {
      key: 'X-DNS-Prefetch-Control',
      value: 'on',
    },
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    },
    {
      key: 'X-Frame-Options',
      value: 'SAMEORIGIN',
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'Referrer-Policy',
      value: 'origin-when-cross-origin',
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=()',
    },
  ];

  module.exports = {
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: securityHeaders,
        },
      ];
    },
  };
  ```

### API Route Protection (HIGH)

- [ ] **Verify authentication on every API route**
  - Never rely solely on client-side checks
  - Verify JWT/session on server
  - Severity: **CRITICAL**

- [ ] **Implement proper error handling**
  - Don't expose stack traces in production
  - Return generic error messages to clients
  - Severity: **HIGH**

- [ ] **Validate request origins with CORS**
  - Restrict API access to trusted domains
  - Configure in API route handlers
  - Severity: **HIGH**

---

## API Security Requirements

### JWT Best Practices (CRITICAL)

- [ ] **Use short-lived access tokens**
  - Recommended: 15-60 minutes expiration
  - Never issue tokens valid for days/months
  - Severity: **CRITICAL**

- [ ] **Implement refresh token rotation**
  - Generate new refresh token with each use
  - Invalidate old refresh token immediately
  - Severity: **HIGH**

  ```typescript
  interface TokenPair {
    accessToken: string;    // 15-60 min expiry
    refreshToken: string;   // 30-90 days expiry, single use
  }

  async function refreshTokens(oldRefreshToken: string): Promise<TokenPair> {
    // Verify old refresh token
    const payload = verifyRefreshToken(oldRefreshToken);

    // Invalidate old refresh token (add to blocklist or delete from DB)
    await invalidateRefreshToken(oldRefreshToken);

    // Generate new token pair
    const newAccessToken = generateAccessToken(payload.userId);
    const newRefreshToken = generateRefreshToken(payload.userId);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }
  ```

- [ ] **Use RS256 (asymmetric) algorithm**
  - Only private key holder can sign tokens
  - Anyone can verify with public key
  - Severity: **HIGH**

- [ ] **Validate all JWT claims**
  - Check: exp, iat, nbf, aud, iss
  - Reject tokens that don't meet requirements
  - Severity: **HIGH**

- [ ] **Implement token blocklist for logout**
  - Store invalidated tokens until expiry
  - Check blocklist on every request
  - Severity: **MEDIUM**

- [ ] **Store tokens securely**
  - Mobile: expo-secure-store
  - Web: HttpOnly cookies with Secure and SameSite flags
  - Never localStorage for sensitive tokens
  - Severity: **CRITICAL**

### Authorization Patterns (HIGH)

- [ ] **Implement Role-Based Access Control (RBAC)**

  ```typescript
  // Define roles and permissions
  const ROLES = {
    admin: ['read', 'write', 'delete', 'manage_users'],
    editor: ['read', 'write'],
    viewer: ['read'],
  };

  // Middleware for route protection
  function requirePermission(permission: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const user = await getUserFromToken(req);
      const userPermissions = ROLES[user.role] || [];

      if (!userPermissions.includes(permission)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      next();
    };
  }
  ```

- [ ] **Implement resource-based authorization**
  - Verify user owns/can access specific resources
  - Don't rely solely on roles
  - Severity: **HIGH**

  ```typescript
  async function canAccessResource(userId: string, resourceId: string): Promise<boolean> {
    const resource = await getResource(resourceId);
    return resource.ownerId === userId || resource.sharedWith.includes(userId);
  }
  ```

- [ ] **Use principle of least privilege**
  - Grant minimum necessary permissions
  - Review and audit permissions regularly
  - Severity: **MEDIUM**

### Rate Limiting (HIGH)

- [ ] **Implement rate limiting on all endpoints**
  - Use express-rate-limit or similar
  - Configure different limits for different endpoints
  - Severity: **HIGH**

  ```typescript
  import rateLimit from 'express-rate-limit';

  // General API limiter
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });

  // Stricter limiter for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message: 'Too many login attempts, please try again later',
  });

  app.use('/api/', apiLimiter);
  app.use('/api/auth/', authLimiter);
  ```

- [ ] **Implement progressive delays (slow down)**
  - Use express-slow-down for gradual response delays
  - Better UX than hard blocks
  - Severity: **MEDIUM**

- [ ] **Use Redis for distributed rate limiting**
  - Required for multi-server deployments
  - Provides consistent rate limiting across instances
  - Severity: **MEDIUM** (HIGH for production)

### Input Validation and Sanitization (CRITICAL)

- [ ] **Validate all user input**
  - Use validation libraries: Zod, Joi, class-validator
  - Validate on both client and server
  - Severity: **CRITICAL**

  ```typescript
  import { z } from 'zod';

  const CreateUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(100),
    name: z.string().min(1).max(100),
  });

  async function createUser(data: unknown) {
    const validated = CreateUserSchema.parse(data);
    // Proceed with validated data
  }
  ```

- [ ] **Sanitize input to prevent injection**
  - Strip or escape special characters
  - Use parameterized queries
  - Severity: **CRITICAL**

- [ ] **Cast input to expected types**
  - Convert to primitives before database operations
  - Prevents operator injection
  - Severity: **HIGH**

  ```typescript
  // Prevent operator injection
  const email = String(req.body.email);
  const user = await prisma.user.findUnique({
    where: { email },
  });
  ```

### SQL Injection Prevention with Prisma (HIGH)

- [ ] **Use Prisma's built-in query methods**
  - findUnique, findMany, create, update, delete
  - Automatically use parameterized queries
  - Severity: **HIGH**

- [ ] **Avoid $queryRawUnsafe and $executeRawUnsafe**
  - These methods bypass Prisma's protections
  - Only use when absolutely necessary with trusted input
  - Severity: **CRITICAL**

- [ ] **Use tagged templates with $queryRaw**
  - Properly escapes variables
  - Never concatenate strings
  - Severity: **HIGH**

  ```typescript
  // WRONG - Vulnerable to SQL injection
  const result = await prisma.$queryRawUnsafe(
    `SELECT * FROM users WHERE email = '${email}'`
  );

  // CORRECT - Using tagged template
  const result = await prisma.$queryRaw`
    SELECT * FROM users WHERE email = ${email}
  `;
  ```

- [ ] **Be aware of operator injection**
  - Functions like findMany accept objects that can be manipulated
  - Always validate and sanitize filter objects
  - Severity: **HIGH**

---

## Priority Matrix

### Critical Priority (Immediate Action Required)

| Item | Platform | Effort | Impact |
|------|----------|--------|--------|
| Replace AsyncStorage with expo-secure-store for tokens | Mobile | Low | High |
| Implement JWT expiration (15-60 min access tokens) | API | Medium | High |
| Never store API secrets in client code | Mobile | Medium | High |
| Validate and sanitize all user input | API | Medium | High |
| Use HTTPS for all API communication | All | Low | High |
| Implement server-side authentication checks | Web | Medium | High |
| Avoid $queryRawUnsafe in Prisma | API | Low | High |
| Never pass sensitive data in deep links | Mobile | Low | High |

### High Priority (Action Within 2 Weeks)

| Item | Platform | Effort | Impact |
|------|----------|--------|--------|
| Implement Content Security Policy | Web | Medium | High |
| Enable SSL/Certificate Pinning | Mobile | Medium | High |
| Implement rate limiting on API endpoints | API | Medium | Medium |
| Validate deep link URLs before navigation | Mobile | Low | Medium |
| Implement refresh token rotation | API | Medium | High |
| Use HttpOnly/Secure cookies for web tokens | Web | Low | Medium |
| Implement RBAC for API authorization | API | High | High |
| Enable ProGuard/R8 for Android | Mobile | Low | Medium |

### Medium Priority (Action Within 1 Month)

| Item | Platform | Effort | Impact |
|------|----------|--------|--------|
| Implement CSRF protection | Web | Medium | Medium |
| Add security headers (HSTS, X-Frame-Options) | Web | Low | Medium |
| Implement Universal Links / App Links | Mobile | High | Medium |
| Enable Hermes engine | Mobile | Low | Medium |
| Implement token blocklist | API | Medium | Medium |
| Detect rooted/jailbroken devices | Mobile | Medium | Medium |
| Use RS256 for JWT signing | API | Medium | Medium |
| Implement biometric authentication | Mobile | Medium | Low |

### Low Priority (Action Within Quarter)

| Item | Platform | Effort | Impact |
|------|----------|--------|--------|
| Additional JavaScript obfuscation | Mobile | Medium | Low |
| Implement app integrity checks | Mobile | High | Medium |
| Progressive rate limiting (slow down) | API | Low | Low |
| Implement data portability (GDPR) | All | High | Medium |
| Use Redis for distributed rate limiting | API | Medium | Medium |
| Audit third-party SDKs for compliance | All | High | Medium |

---

## Detailed Findings

### 1. React Native Security

#### 1.1 Secure Storage

**Finding:** The becky-mobile project uses `@react-native-async-storage/async-storage` which stores data in plaintext.

**Risk:** HIGH - Authentication tokens and sensitive user data could be extracted from compromised devices or through backup exploitation.

**Recommendation:** Replace AsyncStorage with `expo-secure-store` for all sensitive data:
- Authentication tokens
- User credentials
- API keys (that must be stored client-side)
- Personal identifiable information (PII)

**Technical Details:**
- iOS: expo-secure-store uses Keychain Services (kSecClassGenericPassword)
- Android: Uses SharedPreferences encrypted with Android Keystore
- Limitation: 2048 byte maximum per value
- Note: iOS Keychain data persists across app reinstalls

#### 1.2 API Key Management

**Finding:** Current project structure may allow API keys in client-side code.

**Risk:** CRITICAL - API keys bundled in React Native apps can be extracted through decompilation.

**Recommendation:**
1. Audit all environment variables currently in use
2. Move sensitive API keys to backend proxy
3. Only use `EXPO_PUBLIC_` prefix for truly public configuration
4. Use EAS Secrets for build-time configuration

#### 1.3 Deep Link Security

**Finding:** Deep links using custom URL schemes can be hijacked by malicious applications.

**Risk:** HIGH - Attackers could intercept sensitive data or redirect users to phishing content.

**Recommendation:**
1. Implement URL validation before processing deep links
2. Never include sensitive data (tokens, credentials) in deep link URLs
3. Migrate to Universal Links (iOS) and App Links (Android)
4. Use React Navigation's explicit path mapping

### 2. Next.js/Web Security

#### 2.1 Server-Side Authentication

**Finding:** Authentication checks must be implemented at multiple levels in Next.js applications.

**Risk:** HIGH - Improper authentication implementation could leave routes unprotected.

**Recommendation:**
1. Implement authentication in middleware for first-line defense
2. Avoid layout-based authentication (layouts don't re-render on navigation)
3. Always verify authentication within Server Actions
4. Apply the "proximity principle" - check auth close to data access

#### 2.2 Content Security Policy

**Finding:** CSP is essential for preventing XSS and code injection attacks.

**Risk:** HIGH - Without CSP, malicious scripts could execute in user browsers.

**Recommendation:**
1. Implement nonce-based CSP for applications with dynamic content
2. Use `strict-dynamic` directive for modern browsers
3. Start with report-only mode to identify violations
4. Consider using Nosecone or similar libraries for easier management

#### 2.3 XSS Prevention

**Finding:** React provides automatic escaping but specific scenarios require additional protection.

**Risk:** CRITICAL - XSS attacks could steal user sessions, credentials, or perform actions as users.

**Recommendation:**
1. Never use `dangerouslySetInnerHTML` with unsanitized content
2. Use DOMPurify or sanitize-html for user-generated content
3. Implement CSP as defense-in-depth
4. Validate and escape dynamic attribute values

### 3. API Security

#### 3.1 JWT Implementation

**Finding:** JWT security depends heavily on proper implementation.

**Risk:** HIGH - Poor JWT implementation could lead to session hijacking or privilege escalation.

**Recommendation:**
1. Use short expiration times (15-60 minutes for access tokens)
2. Implement refresh token rotation
3. Use RS256 (asymmetric) algorithm
4. Validate all claims (exp, iat, aud, iss)
5. Implement token blocklist for logout functionality
6. Store tokens in secure storage (never localStorage)

#### 3.2 Prisma Security

**Finding:** Prisma provides SQL injection protection but has specific vulnerabilities.

**Risk:** HIGH - Improper use of raw queries or operator injection could compromise database.

**Recommendation:**
1. Use Prisma's built-in query methods exclusively
2. Avoid `$queryRawUnsafe` and `$executeRawUnsafe`
3. Use tagged templates with `$queryRaw`
4. Cast user input to primitive types before queries
5. Validate filter objects to prevent operator injection

#### 3.3 Rate Limiting

**Finding:** APIs without rate limiting are vulnerable to abuse.

**Risk:** HIGH - DoS attacks, brute force attempts, and resource exhaustion.

**Recommendation:**
1. Implement rate limiting on all endpoints
2. Use stricter limits for authentication endpoints
3. Return proper 429 responses with retry headers
4. Consider progressive delays (express-slow-down)
5. Use Redis for distributed deployments

### 4. Data Protection

#### 4.1 Sensitive Data Handling

**Finding:** PII and credentials require special handling throughout the application lifecycle.

**Risk:** HIGH - Data breaches could expose user information and violate privacy regulations.

**Recommendation:**
1. Implement data minimization (collect only necessary data)
2. Encrypt data at rest and in transit
3. Use secure storage mechanisms on all platforms
4. Implement data retention policies
5. Provide user data access and deletion capabilities (GDPR compliance)

#### 4.2 Environment Variables

**Finding:** Environment variables on client-side applications are not secure.

**Risk:** CRITICAL - Secrets in environment variables can be extracted from app bundles.

**Recommendation:**
1. Never store secrets in client-side environment variables
2. Use backend proxy for sensitive API calls
3. Use server-side environment variables for secrets
4. Implement secrets rotation procedures
5. Use secrets management services (AWS Secrets Manager, HashiCorp Vault)

### 5. OWASP Mobile Top 10 (2024) Relevance

| Vulnerability | Risk Level | Relevance to React Native/Expo |
|--------------|------------|--------------------------------|
| M1: Improper Credential Usage | HIGH | Store credentials in expo-secure-store, never hardcode |
| M2: Inadequate Supply Chain Security | HIGH | Audit npm packages, use npm audit, Snyk |
| M3: Insecure Auth/Authorization | CRITICAL | Use expo-auth-session, implement proper JWT handling |
| M4: Insufficient Input/Output Validation | HIGH | Validate all input server-side, sanitize output |
| M5: Insecure Communication | HIGH | Use HTTPS only, implement certificate pinning |
| M6: Inadequate Privacy Controls | MEDIUM | Implement data minimization, clear data on logout |
| M7: Insufficient Binary Protections | MEDIUM | Enable Hermes, ProGuard; detect jailbreak |
| M8: Security Misconfiguration | HIGH | Disable debug mode, remove console.logs |
| M9: Insecure Data Storage | CRITICAL | Use expo-secure-store, encrypt local databases |
| M10: Insufficient Cryptography | MEDIUM | Use strong algorithms, proper key management |

---

## Sources and References

### Official Documentation

1. [Expo SecureStore Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/)
2. [React Native Security Guide](https://reactnative.dev/docs/security)
3. [Expo Authentication Guide](https://docs.expo.dev/develop/authentication/)
4. [Next.js Authentication Guide](https://nextjs.org/docs/pages/building-your-application/authentication)
5. [Next.js Content Security Policy Guide](https://nextjs.org/docs/pages/guides/content-security-policy)
6. [Prisma Raw Queries Documentation](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries)
7. [OWASP MASVS](https://mas.owasp.org/MASVS/)

### Security Research and Best Practices

8. [Securing React Native Apps - Morrow Digital](https://www.themorrow.digital/blog/securing-your-react-native-app-best-practices-and-strategies)
9. [Mobile Application Security with Expo - HackerOne](https://www.pullrequest.com/blog/ensuring-mobile-application-security-with-expo/)
10. [JWT Storage Best Practices - Dev Genius](https://blog.devgenius.io/keeping-tokens-safe-the-best-storage-options-for-react-native-authentication-9bf23fe28483)
11. [SSL Pinning in React Native - DEV Community](https://dev.to/ajmal_hasan/guide-to-implementing-ssl-pinning-in-react-native-for-ios-and-android-4coo)
12. [SSL Pinning - Callstack](https://www.callstack.com/blog/ssl-pinning-in-react-native-apps)
13. [Next.js Security Checklist - Arcjet](https://blog.arcjet.com/next-js-security-checklist/)
14. [JWT Best Practices - Auth0](https://auth0.com/docs/secure/tokens/token-best-practices)
15. [JWT Security Best Practices - Curity](https://curity.io/resources/learn/jwt-best-practices/)
16. [Refresh Tokens - Auth0](https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/)
17. [Prisma SQL Injection Prevention - Medium](https://medium.com/@farrelshevaa/how-prisma-orm-prevents-sql-injections-aligning-with-owasp-best-practices-6ff62c35ba1b)
18. [Prisma Raw Query Security - nodejs-security.com](https://www.nodejs-security.com/blog/prisma-raw-query-sql-injection)
19. [API Rate Limiting - MDN](https://developer.mozilla.org/en-US/blog/securing-apis-express-rate-limit-and-slow-down/)
20. [Rate Limiting in Express - AppSignal](https://blog.appsignal.com/2024/04/03/how-to-implement-rate-limiting-in-express-for-nodejs.html)
21. [RBAC in Node.js - Medium](https://medium.com/@ignatovich.dm/implementing-role-based-access-control-rbac-in-node-js-and-react-c3d89af6f945)
22. [Code Obfuscation in React Native - DEV Community](https://dev.to/rgomezp/to-obfuscate-or-not-obfuscate-react-native-3mkm)
23. [React Native Security Enhancements - DEV Community](https://dev.to/ajmal_hasan/react-native-code-obfuscation-4d04)

### Tools and Libraries

24. [react-native-ssl-public-key-pinning](https://github.com/frw/react-native-ssl-public-key-pinning)
25. [react-native-ssl-pinning](https://github.com/MaxToyberman/react-native-ssl-pinning)
26. [express-rate-limit](https://www.npmjs.com/package/express-rate-limit)
27. [Nosecone - Security Headers](https://nosecone.com/)

---

## Document Metadata

- **Version:** 1.0
- **Last Updated:** December 2024
- **Review Schedule:** Quarterly
- **Next Review:** March 2025

---

## Appendix A: Security Implementation Checklist Summary

### Before Release Checklist

- [ ] All sensitive data uses expo-secure-store (not AsyncStorage)
- [ ] JWT access tokens expire within 60 minutes
- [ ] Refresh token rotation is implemented
- [ ] No API secrets in client-side code
- [ ] SSL certificate pinning enabled for production
- [ ] Deep links validated before navigation
- [ ] CSP headers configured (web)
- [ ] Rate limiting enabled on all API endpoints
- [ ] Input validation on all user-submitted data
- [ ] No raw SQL queries without parameterization
- [ ] Debug mode disabled
- [ ] Console.log statements removed/sanitized
- [ ] ProGuard/R8 enabled for Android
- [ ] Hermes engine enabled
- [ ] HTTPS enforced for all API communication
- [ ] Security headers configured (HSTS, X-Frame-Options, etc.)
- [ ] Third-party dependencies audited (npm audit)
