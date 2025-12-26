<objective>
Perform a comprehensive security audit of the evangelo-sommer web application to identify vulnerabilities, insecure patterns, and areas requiring hardening.

This audit will complement the mobile app audit and inform the unified security remediation plan.
</objective>

<context>
Project: evangelo-sommer (Web application)
Location: ~/projects/web/evangelo-sommer

First, examine the codebase to understand the tech stack:
!ls -la ~/projects/web/evangelo-sommer/
!cat ~/projects/web/evangelo-sommer/package.json 2>/dev/null

Reference research: `./research/security-best-practices.md` (if available)
Reference mobile audit: `./analyses/security-audit-mobile.md` (if available)
</context>

<audit_areas>

1. **Authentication & Session Management**
   - Authentication implementation (JWT, sessions, OAuth)
   - Session handling and storage
   - Password policies and hashing
   - Token management (access/refresh)
   - Logout/session invalidation

2. **API Security**
   - API route protection patterns
   - Authorization checks on endpoints
   - Input validation and sanitization
   - Rate limiting implementation
   - CORS configuration

3. **Data Protection**
   - Database query patterns (SQL injection via ORM)
   - Sensitive data handling (PII)
   - Data encryption at rest
   - Secure data transmission

4. **Frontend Security**
   - XSS vulnerabilities (dangerouslySetInnerHTML, user input rendering)
   - CSRF protection
   - Content Security Policy
   - Secure cookie settings
   - Client-side storage of sensitive data

5. **Secrets Management**
   - Environment variable handling
   - Hardcoded credentials search
   - API keys in frontend code
   - Git history for leaked secrets

6. **Server Configuration**
   - Security headers (HSTS, X-Frame-Options, etc.)
   - Error handling and information disclosure
   - Debug mode settings
   - Logging of sensitive data

7. **Dependency Security**
   - npm audit results
   - Known vulnerabilities in packages
   - Outdated critical packages

</audit_areas>

<analysis_requirements>
For each finding:
- **Location**: File path and line number
- **Severity**: Critical/High/Medium/Low
- **Description**: What the vulnerability is
- **Risk**: Potential impact if exploited
- **Recommendation**: Specific fix with code example if applicable

Run these commands during audit:
!cd ~/projects/web/evangelo-sommer && npm audit --json 2>/dev/null | head -100
!grep -r "password\|secret\|api_key\|apikey\|token\|credential" ~/projects/web/evangelo-sommer --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" 2>/dev/null | grep -v node_modules | head -50
!cat ~/projects/web/evangelo-sommer/.gitignore 2>/dev/null | grep -E "env|secret|key"
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

5. **Cross-Platform Findings**
   - Shared vulnerabilities with mobile app
   - Common patterns that need fixing in both

6. **Recommendations Summary**
   - Prioritized action items

Save audit report to: `./analyses/security-audit-web.md`
</output_format>

<verification>
Before completing, verify:
- All seven audit areas have been examined
- At least 25 files reviewed for security patterns
- npm audit has been run and results included
- Each finding has severity rating and specific recommendation
- Cross-platform issues identified (shared with mobile)
- Report is actionable, not just descriptive
</verification>
