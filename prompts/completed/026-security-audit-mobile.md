<objective>
Perform a comprehensive security audit of the becky-mobile React Native/Expo application to identify vulnerabilities, insecure patterns, and areas requiring hardening.

This audit will inform the security remediation plan and prioritize fixes before production deployment.
</objective>

<context>
Project: becky-mobile (Expo SDK 52, React Native 0.76)
Location: ~/projects/apps/becky-mobile

Tech stack from package.json:
- Expo ~52.0.0 with expo-dev-client
- React Native 0.76.9
- @prisma/client for database
- @nozbe/watermelondb for offline support
- expo-auth-session for authentication
- expo-notifications for push notifications
- expo-file-system, expo-sharing for file operations
- jsonwebtoken for JWT handling
- @react-native-async-storage/async-storage for local storage

Reference research: `./research/security-best-practices.md` (if available)
</context>

<audit_areas>

1. **Authentication & Authorization**
   - Review expo-auth-session implementation
   - Check JWT handling and storage
   - Verify token refresh mechanisms
   - Check for hardcoded credentials or API keys

2. **Data Storage Security**
   - AsyncStorage usage (sensitive data exposure)
   - WatermelonDB encryption status
   - File system operations (expo-file-system)
   - Cached data handling

3. **API Communication**
   - HTTPS enforcement
   - Certificate pinning implementation
   - API endpoint exposure in source code
   - Request/response data handling

4. **Secrets Management**
   - Environment variables (.env files)
   - Hardcoded secrets in source
   - API keys, tokens in code or config
   - Git history for leaked secrets

5. **Code Security**
   - Input validation patterns
   - Deep link handling security
   - WebView usage (if any)
   - Third-party package vulnerabilities (npm audit)

6. **Build Configuration**
   - app.json/app.config.js exposure
   - Debug settings in production config
   - Bundle identifier security
   - Permissions requested vs. needed

</audit_areas>

<analysis_requirements>
For each finding:
- **Location**: File path and line number
- **Severity**: Critical/High/Medium/Low
- **Description**: What the vulnerability is
- **Risk**: Potential impact if exploited
- **Recommendation**: Specific fix with code example if applicable

Run these commands during audit:
!npm audit --json
!grep -r "password\|secret\|api_key\|apikey\|token" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" . 2>/dev/null | head -50
!cat .gitignore | grep -E "env|secret|key"
</analysis_requirements>

<output_format>
Create a security audit report with:

1. **Executive Summary**
   - Overall security posture (score 1-10)
   - Critical findings count
   - High-risk findings count

2. **Detailed Findings**
   - Organized by audit area
   - Each finding with severity, location, description, recommendation

3. **Dependency Vulnerabilities**
   - npm audit results
   - Third-party package concerns

4. **Quick Wins**
   - Easy fixes that significantly improve security

5. **Recommendations Summary**
   - Prioritized action items

Save audit report to: `./analyses/security-audit-mobile.md`
</output_format>

<verification>
Before completing, verify:
- All six audit areas have been thoroughly examined
- At least 20 files reviewed for security patterns
- npm audit has been run and results included
- Each finding has severity rating and specific recommendation
- Report is actionable, not just descriptive
</verification>
