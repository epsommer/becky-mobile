<objective>
Create a comprehensive security remediation plan based on the audit findings from both the mobile and web applications, with prioritized action items and implementation guidance.

This plan will serve as the roadmap for implementing security improvements across both repositories.
</objective>

<context>
Input documents (read these first):
- `./research/security-best-practices.md` - Security best practices research
- `./analyses/security-audit-mobile.md` - Mobile app security audit
- `./analyses/security-audit-web.md` - Web app security audit

Projects:
- Mobile: ~/projects/apps/becky-mobile
- Web: ~/projects/web/evangelo-sommer
</context>

<requirements>

1. **Consolidate Findings**
   - Merge findings from both audit reports
   - Identify shared vulnerabilities
   - Categorize by type and severity

2. **Priority Classification**
   - **P0 (Critical)**: Must fix before any production deployment
   - **P1 (High)**: Fix within first sprint after deployment
   - **P2 (Medium)**: Fix within 30 days
   - **P3 (Low)**: Address in regular maintenance

3. **For Each Remediation Item Include**:
   - Unique ID (SEC-001, SEC-002, etc.)
   - Title and description
   - Affected repo(s): Mobile, Web, or Both
   - Priority level with justification
   - Implementation steps (numbered, specific)
   - Code examples where applicable
   - Testing approach to verify fix
   - Estimated complexity (Simple, Moderate, Complex)

4. **Group Remediations By**:
   - Authentication & Authorization
   - Data Protection
   - API Security
   - Secrets Management
   - Dependency Updates
   - Configuration Hardening

</requirements>

<implementation_guidance>
For each fix, provide:
- Specific file(s) to modify
- Before/after code snippets
- Dependencies to add (if any)
- Testing commands to verify

Example format:
```
SEC-001: Secure JWT Storage (Mobile)
Priority: P0 (Critical)
Affected: Mobile

Current Issue:
JWT tokens stored in plain AsyncStorage

Implementation:
1. Install expo-secure-store
2. Replace AsyncStorage token calls with SecureStore
3. Add fallback for web platform

Code:
[specific code changes]

Verification:
- Check token not visible in app data
- Verify login/logout still works
```
</implementation_guidance>

<output_format>
Create a remediation plan document with:

1. **Executive Summary**
   - Total findings by priority
   - Estimated effort for full remediation
   - Recommended implementation order

2. **P0 Critical Items** (with full implementation details)

3. **P1 High Priority Items** (with implementation details)

4. **P2 Medium Priority Items** (with brief guidance)

5. **P3 Low Priority Items** (with brief guidance)

6. **Implementation Roadmap**
   - Phase 1: Critical fixes (pre-production)
   - Phase 2: High priority (first sprint)
   - Phase 3: Medium/Low (ongoing)

7. **Verification Checklist**
   - How to verify each fix is complete
   - Security testing approach

Save remediation plan to: `./analyses/security-remediation-plan.md`
</output_format>

<verification>
Before completing, verify:
- All audit findings are addressed in the plan
- Each P0/P1 item has detailed implementation steps
- Code examples are provided for complex fixes
- Implementation order is logical (dependencies respected)
- Verification steps are included for each fix
- Plan is actionable by a developer without security expertise
</verification>
