# Authentication Architecture (Beta-2)

## 1. Purpose

Defines how Nexus and CommandCore establish operator identity. This is a prerequisite for every other Stream D document — none of Permissions, the command architectures, the Write API, the Workflow Engine, or the Approval Engine can attach a real actor to an action without this landing first.

## 2. Current State (Beta-1)

No authentication exists. Nexus is fully read-only and unauthenticated; the CommandCore API has no session, token, or identity concept. Every Beta-1 page is visible to anyone who can reach the Vite dev server or built bundle.

## 3. Proposed Architecture

- **Identity source**: CommandCore does not become its own identity provider. It either delegates to an existing organizational identity provider (OIDC/SAML) or, for self-hosted/demo deployments, supports a minimal local credential store as a fallback — never both treated as equally trusted without a clear precedence rule.
- **Session model**: Nexus holds a short-lived session token (not a long-lived API key) issued after successful authentication, attached to every API request as a bearer token or signed cookie.
- **Kernel-side verification**: CommandCore's API layer verifies the session/token on every request before it reaches a dashboard or command handler. Read-only dashboard routes may run under a relaxed verification mode during a transition period, but write/command routes (see Write API Architecture) must never accept an unauthenticated request.
- **Actor resolution**: A verified session resolves to a stable `actor_id` plus the role/permission claims defined in the Permissions Architecture doc. This `actor_id` is what every Command (see Mission/Agent/Tool Commands docs) attaches as its `actor` field.

## 4. Key Decisions / Open Questions

- Session-based vs. token-based: session-based (server-issued, revocable) is preferred over long-lived API keys for interactive Nexus usage, because revocation and audit correlation are simpler.
- Whether CommandCore trusts an upstream identity provider's claims directly or re-issues its own session token after a one-time exchange — re-issuing is preferred so CommandCore controls session lifetime independent of the upstream provider's token lifetime.
- Multi-tenancy is out of scope unless explicitly requested; this architecture assumes one CommandCore instance serves one organization's operators.

## 5. Dependencies

- Blocks: Permissions Architecture, all three Command architectures, Write API, Workflow Engine, Approval Engine.
- Depends on: nothing within Stream D; this is the foundational document.

## 6. Risks

- Shipping any write surface before this lands means writes have no real actor — every later document's audit/approval model assumes this exists.
- A local-credential fallback that is treated as equally secure as a real identity provider in production deployments would undermine the entire permission model built on top of it.
