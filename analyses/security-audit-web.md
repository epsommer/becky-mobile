# Security Audit Report: Evangelo-Sommer Web Application

**Audit Date:** December 26, 2024
**Application:** evangelo-sommer (Next.js 15.5.7, React 19, Prisma ORM)
**Auditor:** Security Review Team
**Report Version:** 1.0

---

## Executive Summary

### Overall Security Posture Score: 6/10 (Moderate)

The Evangelo-Sommer web application demonstrates solid security foundations with proper implementation of authentication middleware, rate limiting, input validation with Zod, encryption for OAuth tokens, and comprehensive security headers. However, several critical and high-severity issues require immediate attention, particularly around secrets management and dependency vulnerabilities.

### Finding Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 2 | Requires Immediate Action |
| High | 4 | Action Within 1 Week |
| Medium | 5 | Action Within 2 Weeks |
| Low | 4 | Action Within 1 Month |

### Critical Findings Overview

1. **Active Secrets Exposed in .env.local File** - All production API keys, database credentials, and OAuth secrets are present in the working directory
2. **High Severity Dependency Vulnerability** - Next.js 15.5.7 has known DoS vulnerability requiring update to 15.5.8+

---

## Detailed Findings

### 1. Authentication & Session Management

#### Finding 1.1: JWT Fallback Secret in Production Code (HIGH)

**Location:** `/Users/epsommer/projects/web/evangelo-sommer/src/app/api/auth/mobile-login/route.ts` (lines 14-17)
**Severity:** High
**Description:** The mobile login endpoint uses a fallback secret if environment variables are not set, which could be exploited if environment variables are misconfigured.

**Evidence:**
```typescript
const JWT_SECRET = process.env.JWT_SECRET
  || process.env.NEXTAUTH_SECRET
  || process.env.NEXTAUTH_JWT_SECRET
  || 'fallback-secret-change-in-production';
```

**Risk:** If none of the JWT secret environment variables are configured, the application uses a hardcoded fallback that is publicly visible in the source code.

**Recommendation:** Remove the fallback secret and fail explicitly if no secret is configured:
```typescript
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET or NEXTAUTH_SECRET must be configured');
}
```

---

#### Finding 1.2: Long JWT Expiration for Mobile Tokens (MEDIUM)

**Location:** `/Users/epsommer/projects/web/evangelo-sommer/src/app/api/auth/mobile-login/route.ts` (line 18)
**Severity:** Medium
**Description:** Mobile JWT tokens have a 7-day expiration, which is longer than recommended for access tokens.

**Evidence:**
```typescript
const JWT_EXPIRY = '7d'; // 7 days
```

**Risk:** If a token is compromised, an attacker has a 7-day window to use it.

**Recommendation:** Implement refresh token rotation with shorter access token expiry:
- Access tokens: 15-60 minutes
- Refresh tokens: 7-30 days with rotation

---

#### Finding 1.3: CSRF Token Bypass in Development (MEDIUM)

**Location:** `/Users/epsommer/projects/web/evangelo-sommer/src/lib/csrf.ts` (lines 57-61)
**Severity:** Medium
**Description:** CSRF token validation is bypassed in development mode, which could mask security issues during testing.

**Evidence:**
```typescript
if (process.env.NODE_ENV === 'development') {
  console.warn('CSRF token not found in store - this may be due to server restart during OAuth flow');
  console.warn('In development, proceeding without validation. This would fail in production.');
  return true; // Allow in development to avoid frustrating OAuth reconnect issues
}
```

**Risk:** CSRF vulnerabilities might not be caught during development testing.

**Recommendation:** Log warnings but still enforce CSRF validation in development, or use a persistent token store (Redis) in development.

---

#### Finding 1.4: Session Tokens in Middleware Logging (LOW)

**Location:** `/Users/epsommer/projects/web/evangelo-sommer/src/middleware.ts` (lines 61-67, 200-222)
**Severity:** Low
**Description:** Authentication tokens and headers are logged to console, including partial token values.

**Evidence:**
```typescript
console.log('[Middleware] Auth header value:', authHeader ? authHeader.substring(0, 20) + '...' : 'null');
```

**Risk:** Token fragments could appear in server logs.

**Recommendation:** Remove token logging or ensure it's conditionally disabled in production.

---

### 2. API Security

#### Finding 2.1: API Key Logging in AI Route (HIGH)

**Location:** `/Users/epsommer/projects/web/evangelo-sommer/src/app/api/ai/draft-message/route.ts` (lines 9-13)
**Severity:** High
**Description:** The Anthropic API key is logged to the console, which could expose it in server logs.

**Evidence:**
```typescript
console.log('=== API KEY DEBUG ===');
console.log('Raw API Key:', apiKey);
console.log('API Key length:', apiKey.length);
console.log('API Key starts with sk-ant:', apiKey.startsWith('sk-ant'));
console.log('====================');
```

**Risk:** The full API key is written to server logs, which could be accessed by attackers or accidentally exposed.

**Recommendation:** Remove API key logging immediately:
```typescript
// Only log presence, never the actual key
console.log('Anthropic API Key configured:', !!apiKey && apiKey.startsWith('sk-ant'));
```

---

#### Finding 2.2: Rate Limiting Implementation (POSITIVE)

**Location:** `/Users/epsommer/projects/web/evangelo-sommer/src/middleware.ts` (lines 8-12, 109-144)
**Severity:** N/A (Positive Finding)
**Description:** The application implements comprehensive rate limiting in middleware with separate limits for login and general API routes.

**Evidence:**
```typescript
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 100;
const LOGIN_RATE_LIMIT = 5;
```

Additionally, Upstash Redis-based rate limiting is used for password reset flows.

---

#### Finding 2.3: Input Validation with Zod (POSITIVE)

**Location:** `/Users/epsommer/projects/web/evangelo-sommer/src/lib/validation.ts`
**Severity:** N/A (Positive Finding)
**Description:** The application uses Zod for comprehensive input validation across API routes.

**Evidence:** Validation schemas are defined for clients, conversations, messages, participants, services, billing, calendar events, and follow-ups with proper type checking and length constraints.

---

#### Finding 2.4: No Raw SQL Queries (POSITIVE)

**Location:** Application-wide
**Severity:** N/A (Positive Finding)
**Description:** Search for `$queryRawUnsafe` and `$executeRawUnsafe` found no results, indicating proper use of Prisma's parameterized queries.

---

### 3. Data Protection

#### Finding 3.1: OAuth Token Encryption (POSITIVE)

**Location:** `/Users/epsommer/projects/web/evangelo-sommer/src/lib/encryption.ts`
**Severity:** N/A (Positive Finding)
**Description:** OAuth tokens are encrypted using AES-256-GCM before storage in the database.

**Evidence:**
```typescript
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
```

The CalendarIntegration model stores encrypted accessToken and refreshToken fields.

---

#### Finding 3.2: Sensitive Data in LocalStorage (LOW)

**Location:** Multiple files including:
- `/Users/epsommer/projects/web/evangelo-sommer/src/contexts/ViewManagerContext.tsx`
- `/Users/epsommer/projects/web/evangelo-sommer/src/contexts/GoalContext.tsx`

**Severity:** Low
**Description:** Some application state is stored in localStorage, though this appears to be non-sensitive view preferences and goals data.

**Evidence:**
```typescript
localStorage.setItem('time-manager-view-state', JSON.stringify({...}));
localStorage.setItem('goals', JSON.stringify(goals));
```

**Risk:** Data in localStorage is accessible to JavaScript and persists across sessions.

**Recommendation:** Ensure no sensitive data (tokens, PII) is stored in localStorage.

---

### 4. Frontend Security

#### Finding 4.1: dangerouslySetInnerHTML with Safe Content (LOW)

**Location:** `/Users/epsommer/projects/web/evangelo-sommer/src/app/layout.tsx` (lines 25-76)
**Severity:** Low
**Description:** The application uses `dangerouslySetInnerHTML` for a theme initialization script in the layout.

**Evidence:**
```typescript
<script
  dangerouslySetInnerHTML={{
    __html: `(function() { try { let colorTheme = localStorage.getItem('color-theme')...`
  }}
/>
```

**Risk:** While the content is hardcoded (not user input), using `dangerouslySetInnerHTML` requires careful review.

**Recommendation:** This is acceptable for static scripts, but ensure no user input is ever included. Consider using Next.js Script component with `strategy="beforeInteractive"`.

---

#### Finding 4.2: Security Headers Properly Configured (POSITIVE)

**Location:** `/Users/epsommer/projects/web/evangelo-sommer/next.config.ts` (lines 29-66)
**Severity:** N/A (Positive Finding)
**Description:** Comprehensive security headers are configured including HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, and Permissions-Policy.

**Evidence:**
```typescript
headers: [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
]
```

---

#### Finding 4.3: Missing Content Security Policy (MEDIUM)

**Location:** `/Users/epsommer/projects/web/evangelo-sommer/next.config.ts`
**Severity:** Medium
**Description:** While other security headers are configured, Content-Security-Policy (CSP) is not implemented.

**Risk:** Without CSP, the application has reduced protection against XSS attacks.

**Recommendation:** Implement CSP in middleware with nonce-based script allowlisting:
```typescript
const cspHeader = `
  default-src 'self';
  script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
  style-src 'self' 'nonce-${nonce}';
  img-src 'self' blob: data:;
  font-src 'self' https://use.typekit.net;
  connect-src 'self' https://api.anthropic.com https://*.neon.tech;
`;
```

---

#### Finding 4.4: CORS Configuration (MEDIUM)

**Location:** `/Users/epsommer/projects/web/evangelo-sommer/src/app/api/testimonials/submit/route.ts` (lines 6-18)
**Severity:** Medium
**Description:** The testimonial submit endpoint has an explicit CORS allowlist including localhost origins.

**Evidence:**
```typescript
const ALLOWED_ORIGINS = [
  'https://woodgreenlandscaping.com',
  'http://localhost:3000', // Local development
  'http://localhost:3001',
  'http://localhost:3002',
]
```

**Risk:** Localhost origins should be conditionally included only in development.

**Recommendation:**
```typescript
const ALLOWED_ORIGINS = [
  'https://woodgreenlandscaping.com',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
]
```

---

### 5. Secrets Management

#### Finding 5.1: All Secrets Exposed in .env.local (CRITICAL)

**Location:** `/Users/epsommer/projects/web/evangelo-sommer/.env.local`
**Severity:** Critical
**Description:** The .env.local file contains active production secrets including API keys, database credentials, OAuth secrets, and email passwords.

**Evidence (keys redacted for security):**
```
ANTHROPIC_API_KEY=sk-ant-api03-...
NEXTAUTH_SECRET=nqXdRXcH...
DATABASE_URL="postgresql://neondb_owner:npg_...
GOOGLE_CLIENT_SECRET=GOCSPX-...
NOTION_CLIENT_SECRET=secret_...
SENDGRID_API_KEY="SG.8y4...
EMAIL_SERVER_PASSWORD=va%aP...
UPSTASH_REDIS_REST_TOKEN="AYntAA..."
```

**Risk:** If this file is accidentally committed, shared, or the workstation is compromised, all secrets are exposed.

**Recommendation:**
1. Immediately rotate ALL secrets listed in this file
2. Use environment-specific secret management (Vercel Environment Variables for production)
3. Never store production secrets in local development files
4. Add additional .gitignore protections

---

#### Finding 5.2: .gitignore Properly Configured (POSITIVE)

**Location:** `/Users/epsommer/projects/web/evangelo-sommer/.gitignore`
**Severity:** N/A (Positive Finding)
**Description:** The .gitignore file properly excludes environment files, credentials, and secret patterns.

**Evidence:**
```
.env*
!.env.example
credentials*.json
*-credentials.json
service-account*.json
*secret*.json
*token*.json
*.key
*.pem
```

---

### 6. Server Configuration

#### Finding 6.1: ESLint Warnings Ignored During Build (LOW)

**Location:** `/Users/epsommer/projects/web/evangelo-sommer/next.config.ts` (lines 13-16)
**Severity:** Low
**Description:** ESLint warnings are ignored during production builds.

**Evidence:**
```typescript
eslint: {
  ignoreDuringBuilds: true,
},
```

**Risk:** Security-related ESLint warnings might be missed.

**Recommendation:** Review and address ESLint warnings, then remove this override.

---

#### Finding 6.2: Development Secret Fallback in Auth (MEDIUM)

**Location:** `/Users/epsommer/projects/web/evangelo-sommer/src/lib/auth.ts` (lines 120-124)
**Severity:** Medium
**Description:** NextAuth configuration allows a fallback secret in development mode.

**Evidence:**
```typescript
secret: process.env.NEXTAUTH_SECRET || (
  process.env.NODE_ENV === 'production'
    ? undefined // Force error in production if no secret
    : "dev-secret-key-123" // Only allow fallback in development
),
```

**Risk:** The development fallback secret is hardcoded and publicly visible.

**Recommendation:** Use a randomly generated development secret stored in .env.local.example and copied locally.

---

### 7. Dependency Vulnerabilities

#### npm audit Results

```json
{
  "vulnerabilities": {
    "next": {
      "severity": "high",
      "title": "Next Vulnerable to Denial of Service with Server Components",
      "range": ">=15.5.1-canary.0 <15.5.8",
      "fixAvailable": "15.5.9"
    },
    "nodemailer": {
      "severity": "moderate",
      "title": "Nodemailer is vulnerable to DoS through Uncontrolled Recursion",
      "range": "<=7.0.10",
      "fixAvailable": true
    }
  },
  "metadata": {
    "vulnerabilities": {
      "moderate": 1,
      "high": 1,
      "critical": 0,
      "total": 2
    }
  }
}
```

#### Finding 7.1: Next.js DoS Vulnerability (CRITICAL)

**Location:** `package.json` - next: "15.5.7"
**Severity:** Critical
**CVE:** GHSA-mwv6-3258-q52c
**Description:** Next.js 15.5.7 is vulnerable to Denial of Service attacks via Server Components.

**Risk:** Attackers could cause application crashes or unavailability.

**Recommendation:**
```bash
npm update next@15.5.9
```

---

#### Finding 7.2: Nodemailer DoS Vulnerability (MEDIUM)

**Location:** `package.json` - nodemailer: "^7.0.9"
**Severity:** Moderate
**CVE:** GHSA-46j5-6fg5-4gv3, GHSA-rcmh-qjqh-p98v
**Description:** Nodemailer's addressparser is vulnerable to DoS through recursive calls.

**Risk:** Malformed email addresses could cause application slowdowns.

**Recommendation:**
```bash
npm update nodemailer@latest
```

---

### 8. Excessive Console Logging (MEDIUM)

**Location:** Application-wide
**Severity:** Medium
**Description:** Found 1,968 console.log/warn/error statements across 270 files.

**Risk:** Excessive logging can expose sensitive information and impact performance.

**Recommendation:**
1. Implement a structured logging library (winston, pino)
2. Configure log levels per environment
3. Remove debug logging in production builds
4. Never log sensitive data (tokens, passwords, PII)

---

## Quick Wins

These are easy fixes that significantly improve security:

1. **Rotate All Exposed Secrets** (1-2 hours)
   - Generate new Anthropic API key
   - Generate new Google OAuth credentials
   - Generate new Notion OAuth credentials
   - Generate new SendGrid API key
   - Update database password
   - Update Upstash Redis token

2. **Update Next.js to 15.5.9** (30 minutes)
   ```bash
   npm update next@15.5.9
   ```

3. **Remove API Key Logging** (15 minutes)
   - Remove debug logging in `src/app/api/ai/draft-message/route.ts`

4. **Remove JWT Fallback Secret** (30 minutes)
   - Update mobile-login route to fail if no secret configured

5. **Update Nodemailer** (15 minutes)
   ```bash
   npm update nodemailer@latest
   ```

6. **Add CSP Header** (1-2 hours)
   - Implement Content-Security-Policy in middleware

---

## Cross-Platform Findings

### Shared Vulnerabilities with Mobile App (becky-mobile)

| Finding | Web App | Mobile App | Shared Pattern |
|---------|---------|------------|----------------|
| JWT Token Expiration | 7 days for mobile tokens | 7 days | Both use long-lived tokens; should implement refresh rotation |
| API Key Management | Keys in .env.local | Keys in .env | Both have exposed API keys in local files |
| Console Logging | 1,968 occurrences | 2,413 occurrences | Excessive logging in both applications |
| Fallback Secrets | Dev fallback in auth | Dev fallback patterns | Hardcoded fallback secrets visible in source |

### Common Patterns Needing Fixes in Both

1. **JWT Token Management**
   - Both apps use long-lived tokens
   - Neither implements proper refresh token rotation
   - Recommendation: Implement shared token refresh endpoint

2. **Secrets Management**
   - Both have local .env files with active secrets
   - Recommendation: Use centralized secrets management (Vercel/EAS Secrets)

3. **Logging Discipline**
   - Both have excessive console logging
   - Recommendation: Implement shared logging library with automatic sensitive data redaction

4. **API Key Handling**
   - Mobile bundles Anthropic API key in client
   - Web has proper server-side API key handling
   - Recommendation: All AI requests should go through web backend

---

## Recommendations Summary (Prioritized)

### Immediate (Within 24-48 hours)

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| 1 | Rotate all exposed secrets in .env.local | Medium | Critical |
| 2 | Update Next.js to 15.5.9 (DoS vulnerability) | Low | Critical |
| 3 | Remove API key logging in draft-message route | Low | High |
| 4 | Remove JWT fallback secret | Low | High |

### Short-term (Within 1 week)

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| 5 | Update Nodemailer to fix DoS vulnerability | Low | Medium |
| 6 | Implement Content Security Policy | Medium | High |
| 7 | Remove CSRF bypass in development | Low | Medium |
| 8 | Conditionally include localhost in CORS | Low | Medium |

### Medium-term (Within 2 weeks)

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| 9 | Implement refresh token rotation | Medium | High |
| 10 | Implement structured logging | Medium | Medium |
| 11 | Remove development secret fallback in auth.ts | Low | Medium |
| 12 | Review and address ESLint warnings | Medium | Low |

### Long-term (Within 1 month)

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| 13 | Centralize secrets management with Vercel | Medium | High |
| 14 | Implement log level configuration per environment | Medium | Medium |
| 15 | Add security scanning to CI/CD pipeline | Medium | High |
| 16 | Conduct penetration testing | High | High |

---

## Files Reviewed (38+)

1. `/Users/epsommer/projects/web/evangelo-sommer/package.json`
2. `/Users/epsommer/projects/web/evangelo-sommer/next.config.ts`
3. `/Users/epsommer/projects/web/evangelo-sommer/.gitignore`
4. `/Users/epsommer/projects/web/evangelo-sommer/.env.local`
5. `/Users/epsommer/projects/web/evangelo-sommer/prisma/schema.prisma`
6. `/Users/epsommer/projects/web/evangelo-sommer/src/middleware.ts`
7. `/Users/epsommer/projects/web/evangelo-sommer/src/app/layout.tsx`
8. `/Users/epsommer/projects/web/evangelo-sommer/src/lib/auth.ts`
9. `/Users/epsommer/projects/web/evangelo-sommer/src/lib/auth-security.ts`
10. `/Users/epsommer/projects/web/evangelo-sommer/src/lib/security.ts`
11. `/Users/epsommer/projects/web/evangelo-sommer/src/lib/encryption.ts`
12. `/Users/epsommer/projects/web/evangelo-sommer/src/lib/csrf.ts`
13. `/Users/epsommer/projects/web/evangelo-sommer/src/lib/validation.ts`
14. `/Users/epsommer/projects/web/evangelo-sommer/src/lib/rate-limiter.ts`
15. `/Users/epsommer/projects/web/evangelo-sommer/src/app/api/auth/[...nextauth]/route.ts`
16. `/Users/epsommer/projects/web/evangelo-sommer/src/app/api/auth/mobile-login/route.ts`
17. `/Users/epsommer/projects/web/evangelo-sommer/src/app/api/ai/draft-message/route.ts`
18. `/Users/epsommer/projects/web/evangelo-sommer/src/app/api/clients/route.ts`
19. `/Users/epsommer/projects/web/evangelo-sommer/src/app/api/testimonials/submit/route.ts`
20. `/Users/epsommer/projects/web/evangelo-sommer/src/contexts/ViewManagerContext.tsx`
21. `/Users/epsommer/projects/web/evangelo-sommer/src/contexts/GoalContext.tsx`
22. 60+ files searched for sensitive patterns
23. 270+ files checked for console logging
24. All API routes examined for authentication patterns

---

## Compliance Notes

### OWASP Top 10 (2021) Coverage

| Vulnerability | Status | Notes |
|--------------|--------|-------|
| A01:2021 Broken Access Control | COMPLIANT | Middleware enforces auth, role-based access implemented |
| A02:2021 Cryptographic Failures | PARTIAL | Good encryption for OAuth, but secrets exposed locally |
| A03:2021 Injection | COMPLIANT | Prisma ORM with parameterized queries, Zod validation |
| A04:2021 Insecure Design | PARTIAL | Good patterns but some fallback secrets |
| A05:2021 Security Misconfiguration | NEEDS ATTENTION | ESLint ignored, development fallbacks |
| A06:2021 Vulnerable Components | NON-COMPLIANT | Next.js and Nodemailer vulnerabilities |
| A07:2021 Auth Failures | PARTIAL | Good implementation but long token expiry |
| A08:2021 Software Integrity Failures | NOT ASSESSED | Requires CI/CD review |
| A09:2021 Security Logging Failures | NEEDS ATTENTION | Excessive logging, no structured approach |
| A10:2021 Server-Side Request Forgery | NOT ASSESSED | Requires deeper analysis |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-26 | Security Review Team | Initial audit |

---

## Next Steps

1. Schedule remediation sprint based on priority
2. Rotate all exposed secrets immediately
3. Update vulnerable dependencies
4. Implement CSP headers
5. Plan centralized secrets management
6. Schedule follow-up audit after remediation

---

*This report should be treated as confidential and shared only with authorized team members.*
