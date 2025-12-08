# Evangelos Sommer — B.E.C.K.Y. Codex Playbook

## Project Overview
Dual-purpose platform combining a creative portfolio with B.E.C.K.Y. (Business Engagement & Client Knowledge Yield) — a multi-service CRM that supports landscaping (Woodgreen), snow services (White Knight), pet services, and creative/tech engagements.

## Operating Rules for Codex
1. Read `doc/task/context.md` before new work; prefer CRM-first tasks.
2. Log fresh research in `doc/research/`; avoid losing context.
3. Respect dual-site boundaries: public portfolio vs. authenticated CRM.
4. Preserve service-line separation and branding when touching data or UI.
5. Harden security paths (auth, authz, CSRF) whenever editing API/auth flows.

## Agent System (mirrors Claude set)
- Architecture/research: `crm-research-architect`, `dual-site-architecture-researcher`, `tech-stack-researcher`
- Implementation: `api-route-implementer`, `prisma-schema-implementer`, `ui-threejs-implementer`, `config-updater`
- Quality & ops: `code-reviewer`, `docs-updater`, `workflow-optimizer`, `lint`, `migrate`, `test`, `type-check`

## Current Priorities
1. CRM requirements and service-line workflows
2. Database integrity and Prisma migrations
3. API and billing/service logic
4. Authentication, authorization, and data separation
5. Portfolio + CRM integration touchpoints

## Success Criteria
- Multi-service CRM flows stay consistent and secure
- Clear public/private separation with B.E.C.K.Y. branding intact
- Scalable patterns for scheduling, billing, and communications
- Research artifacts saved before implementation
