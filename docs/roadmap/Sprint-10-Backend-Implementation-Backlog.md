# Sprint 10 Backend Implementation Backlog

## 1. Purpose

Converts the Sprint 10 architecture work (`Glassmind-Phase-1-Storage-Design.md`, `Jarvis-Conversation-Engine-Boundary.md`, `Hermes-Scope-Decision.md`, `Glassmind-Contract-Review.md`, `Glassmind-Package-Integration-Map.md`) into a practical, groupable coding backlog. Each item below is grouped by whether it can start now, is blocked on a decision, or is explicitly later-phase work — so the next coding sprint can pick up "Ready Next" without re-deriving sequencing from six architecture documents first.

## 2. Completed Already

- **`apps/glassmind` package skeleton** — types (`SourceReference`, `RetrievalMetadata`, all four Phase 1 records), `GlassmindStore` interface, `InMemoryGlassmindStore` implementation, 10 passing tests. See `Glassmind-Contract-Review.md` for what's solid versus what needs follow-up.
- **Retrieval by `sourceReference`** — implemented (`retrieveBySourceReference`) and tested.
- **Retrieval by scope** — implemented (`retrieveByScope`) and tested.
- **Empty retrieval tests** — both retrieval methods confirmed to return `[]`, never throw, on no match.
- **Provenance rejection tests** — implemented and passing for `FollowUpMemoryRecord` and `DeferredDecisionMemoryRecord`; **not yet implemented for `ConversationTurnRecord`** (tracked under Ready Next, not re-listed here as fully done).
- **`OperationalHealthRibbon`/`OperationalPulse` consolidation** — `OperationalPulse` retired, its tick indicator folded into `OperationalHealthRibbon`, dead CSS removed, tests updated. Fully shipped, no follow-up needed.
- **Hermes-Claw boundary** — `Hermes-Scope-Decision.md` disambiguates Hermes-Claw (CommandCore's tool-execution gateway) from the separately-reviewed Hermes Agent Runtime Candidate. No code change required by that decision; it is a naming/scope clarification only.
- **This document set** — `Glassmind-Contract-Review.md`, `Glassmind-Package-Integration-Map.md`, and this backlog.

## 3. Ready Next

Work that can start immediately, with no blocking decision, building directly on what already exists.

1. **Glassmind package contract tightening** — close the four gaps from `Glassmind-Contract-Review.md` §13:
   - Add status-mutation methods to `GlassmindStore` (`resolveFollowUp`, `resolveDeferredDecision`, `updateApprovalWaitingState`, or equivalently-named methods).
   - Reconcile the `record*`/`retrieve*` naming in code against `Glassmind-Phase-1-Storage-Design.md` §12's `write*`/`get*` naming — update whichever side is not authoritative (the Contract Review recommends updating the doc to match the shipped code).
   - Decide and document whether working-memory retrieval (`Glassmind-Retrieval.md` §3 step 1) is in or out of Phase 1 scope.
2. **Provenance rejection tests for `ConversationTurnRecord`** — currently zero test coverage of any kind for this record type; add both a successful-write and a rejected-write test, mirroring the existing `FollowUpMemoryRecord` tests.
3. **`DeferredDecisionMemoryRecord` success-path test** — only the rejection path is currently tested.
4. **Evidence-link validation** — a small utility (in `apps/glassmind` or alongside it) that validates an `EvidenceLink`'s `page`/`selection` shape before a record carrying it is written, catching malformed evidence at write time rather than at display time. Not currently implemented anywhere.
5. **Jarvis conversation engine skeleton** — a contract-only package (or module) mirroring the same pattern `apps/glassmind` itself just established: type contracts for turn resolution (`IntentClassification`, evidence lookup, response composition, approval disposition — already rehearsed in `apps/nexus-console/src/conversationOrchestrator.ts`, but that module is frontend-coupled and simulation-only) plus an interface a real engine implementation would satisfy. No real NLU, no Glassmind wiring, no CommandCore wiring — a skeleton in the same spirit as Sprint 10E's Glassmind skeleton, not a working engine.
6. **Index corruption mitigation / Git workflow hardening** — the single-session git-command rule is already documented in `docs/engineering/Package-Test-Build-Guide.md` §7; "hardening" here means making it harder to violate by accident (for example, a short pre-flight check or a documented convention for signaling an active session) rather than only relying on every session reading the guide. Scoped as a small, standalone task — does not block or depend on anything else in this backlog.

## 4. Blocked Until Integration Decision

Work that should not start until a specific, named decision is made — listed with what each is blocked on.

1. **Durable database adapter design** — blocked on selecting a storage technology, explicitly deferred by `Sprint-10-Implementation-Plan.md` §4 ("this plan only sequences the work; it does not select infrastructure"). No further design should proceed without that selection.
2. **EventStore ingestion adapter** — blocked on (a) the durable database adapter existing, since there is nothing durable to ingest into yet, and (b) a decision on where the adapter lives (inside `core/`'s Python kernel calling out to a Glassmind service, or inside a new TypeScript service) — see `Glassmind-Package-Integration-Map.md` §7.
3. **`ConversationTurn` persistence path (durable)** — the in-memory write path exists and works; durable persistence is blocked on item 1.
4. **Follow-up memory persistence (durable)** — same blocker as item 3.
5. **Deferred decision memory persistence (durable)** — same blocker as item 3.
6. **Approval waiting-state memory persistence (durable)** — blocked on item 1, and additionally blocked on a real Approval Engine existing in CommandCore, per `Glassmind-Package-Integration-Map.md` §8's read-through framing — persisting Glassmind's memory of approvals durably before there's a real Approval Engine to reflect risks the record becoming a second, independently-drifting approval-state authority.
7. **Nexus read-only evidence display (Glassmind-backed)** — blocked on a durable backend existing and a read API being exposed; per `Glassmind-Package-Integration-Map.md` §4, no frontend import of `apps/glassmind` should happen before then.
8. **`localStorage` migration plan execution** — the *plan* already exists (`Glassmind-Phase-1-Storage-Design.md` §11, `Jarvis-Conversation-Engine-Boundary.md` §7), so this item is specifically about *executing* that plan, which is blocked on a durable backend existing per `Glassmind-Package-Integration-Map.md` §10's explicit non-goal.

## 5. Later Phase

Explicitly not next-sprint work, listed so it isn't accidentally pulled forward.

- **Hermes-Claw future integration (real execution)** — blocked on Hermes-Claw's own architecture being designed past today's preview, and separately on any Hermes Agent Runtime Candidate adoption decision per `Hermes-Scope-Decision.md` §8 — neither has happened.
- **Vector memory / semantic memory** — explicitly Phase 3 per `Glassmind-Version-Roadmap.md` (v0.9-v0.10), not to start before Phases 1-2 are real and proven.
- **Company memory / knowledge memory** — Phase 2 (v0.7-v0.8), depends on Phase 1's storage and ingestion being real first.
- **Multi-user-aware memory scoping** — depends on Authentication/Permissions existing in some form, per `Glassmind-Workspace-Knowledge.md` §6, neither of which is scoped yet.

## 6. Sequencing Notes

- Section 3's six items have no dependency on each other and can proceed in any order, or in parallel across different people/sessions — none blocks another.
- Section 4's items have an internal order: item 1 (database adapter) unblocks items 3-6; item 1 plus a location decision unblocks item 2; items 1+2 unblock items 7-8.
- Closing Section 3 item 1 (contract tightening) before starting any Section 4 work is strongly recommended even though it isn't a hard technical blocker — building a durable adapter against a `GlassmindStore` interface that's about to gain new status-mutation methods means redoing that adapter's surface area once those methods land.

## 7. Cross-References

- `docs/engineering/Glassmind-Contract-Review.md` — source of every Section 3 item 1-3 gap.
- `docs/architecture/Glassmind-Package-Integration-Map.md` — source of Section 4's blocking decisions and Section 5's later-phase boundary.
- `docs/roadmap/Sprint-10-Implementation-Plan.md` — the original Sprint 10 sequencing this backlog operationalizes.
- `docs/architecture/Glassmind-Phase-1-Storage-Design.md`, `Glassmind-Version-Roadmap.md` — the phase boundaries Section 4-5 respect.
- `docs/architecture/Hermes-Scope-Decision.md` — the Hermes-Claw item's basis.
- `docs/engineering/Package-Test-Build-Guide.md` — the existing git-workflow guidance Section 3 item 6 hardens.
