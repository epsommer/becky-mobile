<research_objective>
Research and document security best practices for React Native mobile applications and Next.js/web applications, with specific focus on authentication, API security, and data protection patterns relevant to the becky-mobile and evangelo-sommer projects.

This research will inform the security audit and remediation prompts that follow.
</research_objective>

<scope>
Focus areas:
1. **React Native Security**
   - Secure storage (AsyncStorage alternatives, encrypted storage)
   - API key and secret management
   - Certificate pinning
   - Deep link security
   - Code obfuscation for production builds

2. **Next.js/Web Security**
   - Server-side authentication patterns
   - API route protection
   - CSRF protection
   - XSS prevention
   - Content Security Policy (CSP)

3. **API Security**
   - JWT best practices (expiration, refresh tokens, secure storage)
   - Authorization patterns (role-based, resource-based)
   - Rate limiting
   - Input validation and sanitization
   - SQL injection prevention with Prisma

4. **Data Protection**
   - Sensitive data handling (PII, credentials)
   - Data encryption at rest and in transit
   - Secure credential storage patterns
   - Environment variable security

5. **OWASP Mobile Top 10 (2024)**
   - Current threats and mitigations
   - Relevance to React Native/Expo apps

Sources to prioritize:
- OWASP Mobile Security Testing Guide
- React Native Security documentation
- Expo Security best practices
- Next.js security documentation
- NIST guidelines for mobile app security
</scope>

<deliverables>
Create a comprehensive research document with:

1. **Executive Summary** - Key findings and critical recommendations
2. **React Native/Expo Security Checklist** - Actionable items for mobile app
3. **Web Application Security Checklist** - Actionable items for web app
4. **API Security Requirements** - Standards for backend APIs
5. **Priority Matrix** - Categorize findings by severity and effort

Format: Markdown with clear sections and actionable checklists

Save findings to: `./research/security-best-practices.md`
</deliverables>

<evaluation_criteria>
Research quality checks:
- Sources are from 2023-2024 or authoritative long-standing guides (OWASP)
- Recommendations are specific to the tech stack (Expo SDK 52, React Native 0.76, Next.js)
- Each recommendation includes implementation guidance
- Severity levels are assigned (Critical, High, Medium, Low)
</evaluation_criteria>

<verification>
Before completing, verify:
- All five focus areas have comprehensive coverage
- Checklists are actionable, not just theoretical
- Technology versions are current (Expo 52, RN 0.76)
- At least 10 critical/high priority items identified
- Research document is well-structured and scannable
</verification>
