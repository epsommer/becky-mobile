# ChatGPT Codex Agents for B.E.C.K.Y.

Codex agent pack that mirrors the existing Claude lineup so ChatGPT can work effectively on the B.E.C.K.Y. (Business Engagement & Client Knowledge Yield) multi-service CRM/portfolio project. Agents inherit the same responsibilities as their Claude counterparts and default to `gpt-4.1`.

## How to use
- Agents are defined in `.codex/agents/` and indexed via `.codex/agents.json`.
- Start each session by skimming `doc/task/context.md` plus any in-flight research in `doc/research/`.
- Keep priorities aligned with the CRM-first roadmap: client/service management, scheduling, billing, and portfolio/CRM integration.
- When implementing, respect service-line separation (Woodgreen Landscaping vs White Knight Snow) and B.E.C.K.Y. security/branding cues from the UI.

## Agent lineup (mirrors Claude)
- `api-route-implementer` – secure, well-structured API work
- `code-reviewer` – focused code and security review
- `config-updater` – environment/config changes
- `crm-research-architect` – CRM pattern research
- `docs-updater` – documentation maintenance
- `prisma-schema-implementer` – Prisma schema changes
- `dual-site-architecture-researcher` – portfolio + CRM integration research
- `tech-stack-researcher` – tool/stack recommendations
- `ui-threejs-implementer` – UI/Three.js builds
- `workflow-optimizer` – business process optimization
- `lint`, `migrate`, `test`, `type-check` – operational helpers

These agents are drop-in equivalents to the Claude set; use them to keep Codex work consistent with existing Anthropic-driven workflows.
