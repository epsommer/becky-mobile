# Security Audit Report: Becky Mobile Application

**Audit Date:** December 26, 2024
**Application:** becky-mobile (Expo SDK 52, React Native 0.76.9)
**Auditor:** Security Review Team
**Report Version:** 1.0

---

## Executive Summary

### Overall Security Posture Score: 5/10 (Needs Improvement)

The Becky Mobile application has several security vulnerabilities that require immediate attention. While the application demonstrates some good security practices (such as using OAuth via expo-auth-session and implementing CSRF protection for OAuth flows), there are critical issues that need to be addressed before production deployment.

### Finding Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 3 | Requires Immediate Action |
| High | 5 | Action Within 1 Week |
| Medium | 6 | Action Within 2 Weeks |
| Low | 4 | Action Within 1 Month |

### Critical Findings Overview

1. **API Keys Exposed in .env File** - Anthropic and Google API keys are present in the repository
2. **Sensitive Data Stored in AsyncStorage** - JWT tokens stored in plaintext storage
3. **API Keys Bundled in Client Code** - Anthropic API key is bundled into the mobile app

---

## Detailed Findings

### 1. Authentication & Authorization

#### Finding 1.1: JWT Tokens Stored in AsyncStorage (CRITICAL)

**Location:** `/Users/epsommer/projects/apps/becky-mobile/context/AuthContext.tsx` (lines 51, 112-113)
**Severity:** Critical
**Description:** Authentication tokens are stored using AsyncStorage, which stores data in plaintext. On rooted/jailbroken devices or through backup extraction, these tokens can be easily retrieved.

**Evidence:**
```typescript
// Line 112-113
await AsyncStorage.setItem('auth_token', newToken);
await AsyncStorage.setItem('user', JSON.stringify(newUser));
```

**Risk:** An attacker with physical access to the device or one who can extract app data could steal the user's authentication token and impersonate them.

**Recommendation:** Replace AsyncStorage with `expo-secure-store` for all sensitive data:
```typescript
import * as SecureStore from 'expo-secure-store';

// Store token securely
await SecureStore.setItemAsync('auth_token', newToken);
await SecureStore.setItemAsync('user', JSON.stringify(newUser));
```

---

#### Finding 1.2: No Token Expiration Validation on Client Side (HIGH)

**Location:** `/Users/epsommer/projects/apps/becky-mobile/context/AuthContext.tsx` (lines 42-46)
**Severity:** High
**Description:** The application skips token verification on app start to improve performance, but this means expired or revoked tokens could be used until a server request fails.

**Evidence:**
```typescript
// Line 42-46
useEffect(() => {
  console.log('[AuthProvider] useEffect triggered - loading stored auth');
  loadStoredAuth(true); // Skip verification on app start
}, []);
```

**Risk:** Users could continue using the app with invalid tokens, potentially exposing stale data or causing unexpected behavior.

**Recommendation:** Implement background token validation and add JWT expiration checking locally:
```typescript
import { jwtDecode } from 'jwt-decode';

const isTokenExpired = (token: string): boolean => {
  const decoded = jwtDecode(token);
  return decoded.exp * 1000 < Date.now();
};
```

---

#### Finding 1.3: Token Logged in Console (MEDIUM)

**Location:** `/Users/epsommer/projects/apps/becky-mobile/lib/api/interceptors.ts` (line 126)
**Severity:** Medium
**Description:** A portion of the authentication token is logged to the console, which could be captured in crash logs or debugging sessions.

**Evidence:**
```typescript
// Line 126
console.log('[authInterceptor] Retrieved token:', token ? `${token.substring(0, 20)}...` : 'null');
```

**Risk:** Token fragments could be exposed in logs, potentially aiding attackers in token analysis.

**Recommendation:** Remove token logging in production or use a logging library that strips sensitive data.

---

### 2. Data Storage Security

#### Finding 2.1: Multiple Sensitive Data in AsyncStorage (HIGH)

**Location:** Multiple files including:
- `/Users/epsommer/projects/apps/becky-mobile/services/notifications.ts` (line 253)
- `/Users/epsommer/projects/apps/becky-mobile/hooks/useGoogleCalendar.ts` (lines 91-92)
- `/Users/epsommer/projects/apps/becky-mobile/services/followups.ts` (lines 221-244)

**Severity:** High
**Description:** Multiple types of sensitive data are stored in AsyncStorage:
- Push notification tokens
- OAuth state for CSRF protection
- Follow-up data with client information
- Calendar integration settings

**Evidence:**
```typescript
// notifications.ts - Line 253
await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, this.pushToken);

// GoogleCalendarService.ts - Line 124
await AsyncStorage.setItem(STORAGE_KEYS.GOOGLE_STATE, response.data.state);
```

**Risk:** All this data is stored in plaintext and can be extracted from device backups or by malicious apps on rooted devices.

**Recommendation:** Categorize data by sensitivity level. Use `expo-secure-store` for:
- Authentication tokens
- OAuth state parameters
- Push notification tokens
- Any PII (client names, emails)

---

#### Finding 2.2: User Data Cached Without Encryption (MEDIUM)

**Location:** `/Users/epsommer/projects/apps/becky-mobile/services/goals.ts`, `/Users/epsommer/projects/apps/becky-mobile/services/followups.ts`
**Severity:** Medium
**Description:** Business data including goals, milestones, and follow-up information is cached locally without encryption.

**Evidence:**
```typescript
// goals.ts - Lines 361-363
await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(this.goals));
await AsyncStorage.setItem(STORAGE_KEYS.MILESTONES, JSON.stringify(this.milestones));
```

**Risk:** Business-sensitive data could be accessed if the device is compromised.

**Recommendation:** Implement application-level encryption for cached data or use encrypted SQLite through WatermelonDB with encryption enabled.

---

### 3. API Communication Security

#### Finding 3.1: No Certificate Pinning Implemented (HIGH)

**Location:** Application-wide
**Severity:** High
**Description:** The application does not implement SSL certificate pinning, making it vulnerable to man-in-the-middle attacks on compromised networks.

**Evidence:** No SSL pinning libraries found in `package.json` and no pinning configuration in API client.

**Risk:** Attackers on the same network could intercept API traffic using a proxy with a fake certificate.

**Recommendation:** Implement certificate pinning using `react-native-ssl-public-key-pinning`:
```typescript
import { initializeSslPinning } from 'react-native-ssl-public-key-pinning';

await initializeSslPinning({
  'www.evangelosommer.com': {
    includeSubdomains: true,
    publicKeyHashes: ['AAAAAAA...', 'BBBBBBB...'],
  },
});
```

---

#### Finding 3.2: HTTP Fallback for Development Server (LOW)

**Location:** `/Users/epsommer/projects/apps/becky-mobile/lib/api/config.ts` (lines 69-74)
**Severity:** Low
**Description:** The API configuration allows HTTP connections for development servers.

**Evidence:**
```typescript
// Line 71-72
const devUrl = `http://${host}:3000`;
console.log('[ApiConfig] Using development server:', devUrl);
```

**Risk:** Development builds could accidentally be distributed with HTTP connections enabled.

**Recommendation:** Add a build-time check to ensure only HTTPS is used in production builds.

---

### 4. Secrets Management

#### Finding 4.1: API Keys Exposed in .env File (CRITICAL)

**Location:** `/Users/epsommer/projects/apps/becky-mobile/.env`
**Severity:** Critical
**Description:** Active API keys for Anthropic and Google Places are present in the `.env` file. While `.env` is in `.gitignore`, the file exists in the working directory.

**Evidence:**
```
ANTHROPIC_API_KEY=sk-ant-api03-[REDACTED]
GOOGLE_PLACES_API_KEY=AIzaSy[REDACTED]
```

**Risk:** If these keys are accidentally committed or the file is shared, they could be used for unauthorized API access, potentially incurring costs or accessing sensitive services.

**Recommendation:**
1. Immediately rotate both API keys
2. Use EAS Secrets for build-time configuration: `eas secret:create --name ANTHROPIC_API_KEY`
3. Never store secrets in files that could be accidentally shared

---

#### Finding 4.2: Anthropic API Key Bundled in Client (CRITICAL)

**Location:** `/Users/epsommer/projects/apps/becky-mobile/lib/services/AIDraftService.ts` (lines 4-6)
**Severity:** Critical
**Description:** The Anthropic API key is imported directly into the client-side code and bundled into the app.

**Evidence:**
```typescript
import { ANTHROPIC_API_KEY } from '@env';
const API_KEY = ANTHROPIC_API_KEY || '';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
```

**Risk:** The API key can be extracted from the compiled app bundle through reverse engineering. Anyone could then use the key to make API calls at the owner's expense.

**Recommendation:** Route all AI requests through a backend proxy:
```typescript
// Instead of calling Anthropic directly:
const response = await apiClient.post('/api/ai/draft-message', {
  conversationContext,
  clientName,
  messageType,
});
```

---

#### Finding 4.3: API Key Exposed in app.config.js (HIGH)

**Location:** `/Users/epsommer/projects/apps/becky-mobile/app.config.js` (line 48)
**Severity:** High
**Description:** The Anthropic API key is included in the Expo config's `extra` field, which is accessible at runtime and bundled with the app.

**Evidence:**
```javascript
extra: {
  eas: {
    projectId: "90f7fff2-5572-4b2f-ae32-edf22e4dd01b"
  },
  backendUrl: "https://www.evangelosommer.com",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY // Bundled into app
},
```

**Risk:** The API key becomes part of the app manifest and can be extracted.

**Recommendation:** Remove sensitive keys from `extra` configuration. Only public configuration (backend URLs, public Stripe keys) should be included.

---

### 5. Code Security

#### Finding 5.1: Excessive Console Logging (MEDIUM)

**Location:** Application-wide (2,413 console statements found)
**Severity:** Medium
**Description:** The application has extensive console logging including authentication flows, API requests/responses, and user data.

**Evidence:**
- `App.tsx`: 19 console statements
- `context/AuthContext.tsx`: 15 console statements
- `screens/LoginScreen.tsx`: 22 console statements
- Total: 2,413 occurrences across 315 files

**Risk:** Sensitive information could be exposed through logs, potentially captured by crash reporting tools or visible during debugging.

**Recommendation:**
1. Implement a logging library with log levels (debug, info, warn, error)
2. Strip console statements in production builds using babel plugin
3. Never log tokens, passwords, or PII

---

#### Finding 5.2: OAuth CSRF Protection Implemented (POSITIVE)

**Location:** `/Users/epsommer/projects/apps/becky-mobile/lib/services/GoogleCalendarService.ts` (lines 52-59, 151-154)
**Severity:** N/A (Positive Finding)
**Description:** The OAuth flow properly implements state parameter for CSRF protection.

**Evidence:**
```typescript
// State validation
const savedState = await AsyncStorage.getItem(STORAGE_KEYS.GOOGLE_STATE);
if (savedState && returnedState && returnedState !== savedState) {
  console.error('[GoogleCalendarService] State mismatch - possible CSRF attack');
  return { success: false, error: 'Security validation failed' };
}
```

---

#### Finding 5.3: File Operations Without Path Validation (LOW)

**Location:** `/Users/epsommer/projects/apps/becky-mobile/services/export.ts`, `/Users/epsommer/projects/apps/becky-mobile/services/fileUpload.ts`
**Severity:** Low
**Description:** File operations don't validate that file paths are within expected directories, though the risk is minimal due to Expo's sandboxed file system.

**Risk:** In edge cases, path traversal could be attempted if user-controlled input influences file paths.

**Recommendation:** Add path validation to ensure files are within the document directory:
```typescript
const isWithinAppDirectory = (path: string): boolean => {
  return path.startsWith(FileSystem.documentDirectory!);
};
```

---

### 6. Build Configuration

#### Finding 6.1: Excessive Android Permissions (MEDIUM)

**Location:** `/Users/epsommer/projects/apps/becky-mobile/app.json` (lines 29-37)
**Severity:** Medium
**Description:** The app requests several permissions that may not all be necessary for core functionality.

**Evidence:**
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

**Risk:** Users may be concerned about privacy; app stores may flag excessive permissions.

**Recommendation:** Audit each permission and only request those necessary for core features. Consider using progressive permission requests when features are accessed.

---

#### Finding 6.2: Debug Logging in Production Builds (MEDIUM)

**Location:** Application-wide
**Severity:** Medium
**Description:** There's no indication that console logging is stripped in production builds. The babel configuration doesn't include console removal plugins.

**Evidence:** `babel.config.js` lacks `babel-plugin-transform-remove-console`

**Recommendation:** Add console stripping for production:
```javascript
// babel.config.js
plugins: [
  ...process.env.NODE_ENV === 'production'
    ? ['transform-remove-console']
    : [],
]
```

---

#### Finding 6.3: Google Service Account Path in eas.json (LOW)

**Location:** `/Users/epsommer/projects/apps/becky-mobile/eas.json` (line 30)
**Severity:** Low
**Description:** EAS configuration references a service account JSON file path.

**Evidence:**
```json
"serviceAccountKeyPath": "./credentials/google-service-account.json"
```

**Risk:** If the credentials file is accidentally committed, it could expose Google Cloud access.

**Recommendation:** Ensure `./credentials/` is in `.gitignore` (it currently is not explicitly listed). Use EAS Secrets for service account credentials.

---

## Dependency Vulnerabilities

### npm audit Results

```json
{
  "vulnerabilities": {
    "@babel/runtime": {
      "severity": "moderate",
      "title": "Babel has inefficient RegExp complexity",
      "cwe": ["CWE-1333"],
      "cvss": 6.2,
      "range": "<7.26.10"
    },
    "@nozbe/watermelondb": {
      "severity": "moderate",
      "via": ["@babel/runtime"],
      "fixAvailable": true
    }
  },
  "metadata": {
    "vulnerabilities": {
      "info": 0,
      "low": 0,
      "moderate": 2,
      "high": 0,
      "critical": 0,
      "total": 2
    },
    "dependencies": {
      "total": 1000
    }
  }
}
```

### Summary

| Package | Severity | Issue | Fix Available |
|---------|----------|-------|---------------|
| @babel/runtime | Moderate | ReDoS in named capturing groups | Yes - update to 7.26.10+ |
| @nozbe/watermelondb | Moderate | Transitive via @babel/runtime | Yes - update WatermelonDB |

**Recommendation:** Run `npm update @babel/runtime` to resolve the moderate vulnerabilities.

---

## Quick Wins

These are easy fixes that significantly improve security:

1. **Replace AsyncStorage for tokens** (1-2 hours)
   - Install `expo-secure-store`
   - Update `AuthContext.tsx` to use SecureStore
   - Update `lib/api/interceptors.ts` to read from SecureStore

2. **Remove API key from client code** (2-3 hours)
   - Remove `ANTHROPIC_API_KEY` from app.config.js extra
   - Route AI requests through backend API
   - Delete `.env` file and use EAS Secrets

3. **Rotate exposed API keys** (30 minutes)
   - Generate new Anthropic API key
   - Generate new Google Places API key
   - Update production secrets

4. **Add console stripping** (15 minutes)
   - Install `babel-plugin-transform-remove-console`
   - Configure for production builds

5. **Update vulnerable dependencies** (30 minutes)
   - Run `npm update @babel/runtime`
   - Verify WatermelonDB compatibility

---

## Recommendations Summary (Prioritized)

### Immediate (Within 24-48 hours)

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| 1 | Rotate exposed API keys (Anthropic, Google Places) | Low | Critical |
| 2 | Replace AsyncStorage with expo-secure-store for tokens | Medium | Critical |
| 3 | Move Anthropic API calls to backend proxy | Medium | Critical |
| 4 | Remove anthropicApiKey from app.config.js extra | Low | High |

### Short-term (Within 1 week)

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| 5 | Implement SSL certificate pinning | Medium | High |
| 6 | Add production console log stripping | Low | Medium |
| 7 | Update @babel/runtime to fix vulnerability | Low | Medium |
| 8 | Implement token expiration checking | Medium | High |

### Medium-term (Within 2 weeks)

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| 9 | Audit and minimize Android permissions | Medium | Medium |
| 10 | Implement encrypted local storage for business data | High | Medium |
| 11 | Add file path validation | Low | Low |
| 12 | Set up EAS Secrets for all environment variables | Medium | High |

### Long-term (Within 1 month)

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| 13 | Implement jailbreak/root detection | Medium | Medium |
| 14 | Add app integrity verification | High | Medium |
| 15 | Implement biometric authentication option | Medium | Low |
| 16 | Set up security monitoring and alerting | High | High |

---

## Files Reviewed (20+)

1. `/Users/epsommer/projects/apps/becky-mobile/context/AuthContext.tsx`
2. `/Users/epsommer/projects/apps/becky-mobile/screens/LoginScreen.tsx`
3. `/Users/epsommer/projects/apps/becky-mobile/.env`
4. `/Users/epsommer/projects/apps/becky-mobile/.env.example`
5. `/Users/epsommer/projects/apps/becky-mobile/lib/api/client.ts`
6. `/Users/epsommer/projects/apps/becky-mobile/lib/api/interceptors.ts`
7. `/Users/epsommer/projects/apps/becky-mobile/lib/api/config.ts`
8. `/Users/epsommer/projects/apps/becky-mobile/lib/services/AIDraftService.ts`
9. `/Users/epsommer/projects/apps/becky-mobile/lib/services/GoogleCalendarService.ts`
10. `/Users/epsommer/projects/apps/becky-mobile/services/notifications.ts`
11. `/Users/epsommer/projects/apps/becky-mobile/services/export.ts`
12. `/Users/epsommer/projects/apps/becky-mobile/services/fileUpload.ts`
13. `/Users/epsommer/projects/apps/becky-mobile/services/followups.ts`
14. `/Users/epsommer/projects/apps/becky-mobile/services/goals.ts`
15. `/Users/epsommer/projects/apps/becky-mobile/hooks/useGoogleCalendar.ts`
16. `/Users/epsommer/projects/apps/becky-mobile/app.json`
17. `/Users/epsommer/projects/apps/becky-mobile/app.config.js`
18. `/Users/epsommer/projects/apps/becky-mobile/babel.config.js`
19. `/Users/epsommer/projects/apps/becky-mobile/eas.json`
20. `/Users/epsommer/projects/apps/becky-mobile/package.json`
21. `/Users/epsommer/projects/apps/becky-mobile/.gitignore`
22. `/Users/epsommer/projects/apps/becky-mobile/types/env.d.ts`
23. `/Users/epsommer/projects/apps/becky-mobile/App.tsx`
24. `/Users/epsommer/projects/apps/becky-mobile/context/CalendarContext.tsx`

---

## Compliance Notes

### OWASP Mobile Top 10 (2024) Coverage

| Vulnerability | Status | Notes |
|--------------|--------|-------|
| M1: Improper Credential Usage | NON-COMPLIANT | Tokens in AsyncStorage, API keys in client |
| M2: Inadequate Supply Chain Security | NEEDS ATTENTION | 2 moderate vulnerabilities found |
| M3: Insecure Auth/Authorization | PARTIAL | Uses OAuth correctly but stores tokens insecurely |
| M4: Insufficient Input/Output Validation | NEEDS REVIEW | Limited validation observed |
| M5: Insecure Communication | NEEDS ATTENTION | No certificate pinning |
| M6: Inadequate Privacy Controls | NEEDS REVIEW | Extensive logging of user actions |
| M7: Insufficient Binary Protections | NOT ASSESSED | Requires binary analysis |
| M8: Security Misconfiguration | NON-COMPLIANT | Debug logging in production |
| M9: Insecure Data Storage | NON-COMPLIANT | Sensitive data in AsyncStorage |
| M10: Insufficient Cryptography | NOT APPLICABLE | No custom cryptography observed |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-26 | Security Review Team | Initial audit |

---

## Next Steps

1. Schedule remediation sprints based on priority
2. Rotate all exposed API keys immediately
3. Implement secure storage before next release
4. Plan backend proxy for AI features
5. Schedule follow-up audit after remediation

---

*This report should be treated as confidential and shared only with authorized team members.*
