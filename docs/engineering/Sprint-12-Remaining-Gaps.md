# Sprint 12 Remaining Gaps

## 1. Purpose

Lists what remains before real production persistence and integration exist for Glassmind, Jarvis, and Nexus — the companion document to `docs/engineering/Sprint-12-Implementation-Review.md`'s closure recommendation. None of these gaps is new; each was already named by the Sprint 12 document that introduced the relevant skeleton or decision. This document consolidates them into one list so Sprint 13 starts from a fully-mapped position.

## 2. Gaps

- **No production database selected.** `docs/architecture/Glassmind-Persistence-Runtime-Decision.md` and `docs/architecture/Glassmind-Database-Adapter-Decision.md` both deliberately deferred this choice. `DatabaseGlassmindPersistenceDriver` exists; no concrete `DatabaseClient` implementation does.
- **No real DB schema migration.** `docs/architecture/Glassmind-Schema-Migration-Plan.md` specifies table names, fields, and indexes, but explicitly leaves column types, index implementation, and migration tooling unresolved until a technology is chosen. No migration file or directory has been created.
- **No real DB test environment.** `Glassmind-Schema-Migration-Plan.md` §10 names the requirements (isolated, fast, reset-capable, CI-compatible) but selects no specific mechanism — no test-container library, no CI pipeline configuration exists for any TypeScript package in this repo.
- **No production CommandCore EventStore bridge.** `docs/architecture/CommandCore-EventStore-Bridge-Runtime-Decision.md` names a future backend service as the eventual host but that service does not exist. `SafeIngestionPath` is tested only against fakes; nothing subscribes to a real event feed.
- **No auth/permissions model.** Unchanged since `docs/engineering/Sprint-10-Final-Review.md` §4 first flagged it and `docs/engineering/Sprint-11-Implementation-Review.md` §5 reconfirmed it: neither `apps/glassmind` nor `apps/jarvis-engine` has any concept of a user, session, or permission scope. `Glassmind-Persistence-Runtime-Decision.md` §4 also flags this as schema-relevant and still unresolved.
- **No real Jarvis runtime service.** `DeterministicJarvisConversationEngine` remains deterministic keyword matching with no process of its own; `devGlassmindHarness.ts` is dev/test tooling, not a deployed service. No production LLM integration exists, per this sprint's own explicit constraint.
- **No Nexus backend read API.** `docs/architecture/Nexus-Glassmind-Read-Api-Plan.md` specifies endpoint shapes, response envelopes, and required tests, but no route, no host process, and no `apps/nexus-console` consumption code exists yet.
- **No `localStorage` migration.** `apps/nexus-console`'s `useConversationLog`/`usePinnedConversations`/`buildFollowUps`/`buildDecisionQueue`/`buildApprovalCards` remain exactly as before Sprint 11-12 — still explicitly gated on a durable backend and a read API existing first, per `docs/architecture/Glassmind-Phase-1-Persistence-Path.md` §3 and `Nexus-Glassmind-Read-Api-Plan.md` §8.
- **No vector memory.** Still Phase 3 per `docs/architecture/Glassmind-Version-Roadmap.md`; nothing in Sprint 12's database or schema work introduced an embedding-shaped field, confirmed by inspection in `Sprint-12-Implementation-Review.md` §4.
- **No semantic memory.** Still Phase 3; company memory (Phase 2) has not started either.
- **No embeddings.** No embedding column, field, or dependency exists anywhere added or modified in Sprint 12.
- **X10 git/index and build-artifact churn still needs workflow hardening.** `.git/index` corruption and `tsconfig.app.tsbuildinfo`/similar generated-file churn remain a recurring, real cost across this entire project — most recently, `apps/jarvis-engine`'s `npm install` intermittently hit transient EPERM failures on this mount during Sprint 12's closing verification, succeeding only on a later attempt with no code change. This is still an environment-workflow gap, not a code defect, and still has no automated mitigation (a pre-commit check, a retry wrapper, or equivalent) despite being named as a real, repeating cost across Sprint 10, 11, and now 12's reviews.

## 3. Cross-References

- `docs/engineering/Sprint-12-Implementation-Review.md` — the review this gap list accompanies.
- `docs/architecture/Glassmind-Persistence-Runtime-Decision.md`, `docs/architecture/Glassmind-Database-Adapter-Decision.md`, `docs/architecture/Glassmind-Schema-Migration-Plan.md` — the source documents for the database-related gaps.
- `docs/architecture/CommandCore-EventStore-Bridge-Runtime-Decision.md` — the source document for the EventStore bridge gap.
- `docs/architecture/Nexus-Glassmind-Read-Api-Plan.md` — the source document for the Nexus read API gap.
- `docs/roadmap/Sprint-13-Implementation-Plan.md` — where these gaps are sequenced into concrete work.
