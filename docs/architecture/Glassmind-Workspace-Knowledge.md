# Glassmind Workspace Knowledge

## 1. Purpose

Defines how Glassmind's company memory and knowledge memory (per `docs/architecture/Glassmind-Architecture.md` §3) respect the Enterprise World Model's existing Portfolio → Company → Workspace → Project boundaries, and how they integrate with the Knowledge Centre's existing scope-tagging (`KnowledgeAssetRecord.scopes`) rather than inventing a parallel scoping system.

## 2. The Isolation Principle

A memory scoped to one company must never silently surface when reasoning about a different company, even if the underlying pattern looks similar. This is not a performance optimization — it is a trust boundary. An executive at Company A should never have Jarvis say "this happened before" about something that actually happened at Company B. Company memory's `scope` field (per `Glassmind-Memory-Model.md` §3) is the enforcement point: retrieval (`Glassmind-Retrieval.md`) must filter by scope before ranking, not after.

## 3. Reuse Of Existing Scope Tags

The Knowledge Centre already tags assets with `scopes: ScopeBadgeRecord[]` (company/workspace/project/mission kinds), and `worldModel.ts`'s `resolveContext()` already resolves any selection to its company/workspace/project/mission ancestry. Glassmind's knowledge memory should key directly off these existing scope tags rather than re-deriving its own company/workspace mapping — this is the same "don't duplicate state" principle that motivated `Sprint 9`'s Runtime Context consolidation, applied to the memory layer.

## 4. Cross-Scope Patterns

Some patterns genuinely are general across companies (e.g., "agents with capability X tend to succeed at missions of type Y" might hold portfolio-wide). These belong in semantic memory, not company memory, and semantic memory's `supportingRecordIds` (per the Memory Model) must show which companies' company-memory records contributed — so a cross-scope generalization is still auditable down to its sources, never an unexplained portfolio-wide claim.

## 5. Workspace-Level Knowledge Capture

Per `docs/architecture/Notification-Orchestration.md` and `Opportunity-Detection.md`'s "conversation-to-knowledge conversion" pattern, a conversation thread that surfaces a reusable insight should be capturable as workspace-scoped knowledge memory — but only through the explicit-action ingestion path (`Glassmind-Ingestion.md` §2), never automatically promoted from passive conversation observation. A user (or a future, more capable Jarvis) should decide that something is worth capturing as workspace knowledge; Glassmind should not infer that decision silently.

## 6. Multi-User Implications

Per `docs/roadmap/Version-1.0-Master-Checklist.md`'s Multi-user row (still unscoped as of this writing), workspace-scoped memory raises a question that document does not yet answer: should company memory be shared across all users with access to that company, or per-user within a company? This document takes no position beyond flagging it — it should be resolved explicitly when Multi-user is scoped, not left to default behavior that's hard to change later once memory has accumulated under one assumption.

## 7. Cross-References

- `docs/architecture/Glassmind-Architecture.md` §3, §6 — company/knowledge memory and Glassmind's relationship to CommandCore/Nexus.
- `docs/architecture/Glassmind-Memory-Model.md` §4 — the shared entity-ID space this scoping relies on.
- `docs/roadmap/Version-1.0-Master-Checklist.md` — Multi-user, the open dependency flagged in §6.

## 8. Risks

- The single largest risk in this document is §2's isolation principle being treated as a "nice to have" rather than enforced at the query layer — a cross-company memory leak would be a serious trust failure, not a minor bug, given how central "every claim is evidence-backed and explainable" is to this product's identity.
- Building company-memory scoping before Multi-user is resolved (§6) risks baking in a single-tenant assumption that becomes expensive to unwind — this should be a known, tracked risk, not a forgotten one.
