# Sprint 11 Implementation Plan

## 1. Purpose

Defines the next implementation sprint after Sprint 10, per `docs/engineering/Sprint-10-Final-Review.md`'s recommendation to close Sprint 10 and proceed. Sprint 10 built three standalone, decoupled skeletons (`apps/glassmind`'s type contracts/in-memory/durable-skeleton/ingestion-skeleton, `apps/jarvis-engine`'s engine contract) and a full set of governing architecture documents. Sprint 11 is where real implementation work — a real durable adapter, a real bridge design, the first real cross-package integration — begins, within the boundaries those documents already established.

## 2. Sprint 11 Goals

1. Give `apps/glassmind` a real, durable `GlassmindStore` implementation behind the existing interface.
2. Decide (and where feasible, begin implementing) how CommandCore's EventStore actually reaches Glassmind's ingestion adapter.
3. Make the first real, read-only connection between `apps/jarvis-engine` and `apps/glassmind` — not a hypothetical interface compatibility, an actual wiring.
4. Establish real persistence for conversation turns and for follow-up/decision/approval memory, per `Glassmind-Phase-1-Storage-Design.md`'s already-specified schema.
5. Plan (not yet build) how Nexus will eventually display Glassmind-backed evidence, read-only.
6. Harden the X10 workflow issues that have recurred throughout Sprint 10 (`.git/index` corruption, generated-artifact churn) so they stop costing time at the start of every session.

## 3. Recommended Sprint 11 Sequence

1. **Persistent Glassmind adapter implementation behind `GlassmindStore`.** Implement `GlassmindPersistenceDriver` (per `Glassmind-Durable-Adapter-Design.md`) against a real, chosen storage technology, and wire it into `DurableGlassmindStore`. This is the largest single item and should start first — everything else in this sequence either depends on it or is easier to design correctly once it exists.
2. **EventStore bridge design/implementation decision.** Per `Glassmind-Repository-Boundary-Decision.md` §5, decide whether the ingestion adapter lives in `core/` (Python, calling out across an explicit bridge) or as a TypeScript module consuming a CommandCore-exposed event feed. This is a decision-then-possibly-implement item — the decision itself should not be deferred past Sprint 11, even if full implementation is.
3. **Jarvis engine ↔ Glassmind read-only integration.** Wire a `JarvisMemoryStore` implementation that delegates to a real (by now durable, per item 1) `GlassmindStore`'s `retrieveBySourceReference`/`retrieveByScope`. Read-only, per `Glassmind-Package-Integration-Map.md` §5 — `DeterministicJarvisConversationEngine` gains real memory, not real writing.
4. **Conversation turn persistence path.** Once item 1 exists, `recordConversationTurn` writes through to real storage. Per `Glassmind-Package-Integration-Map.md` §9, this follows the narrower follow-up/decision/approval write path (item 5), not the other way around, since conversation turns are higher-volume.
5. **Follow-up / deferred-decision / approval memory persistence.** Per the same integration map's recommended first-safe-integration-point: wire `recordFollowUp`/`recordDeferredDecision`/`recordApprovalWaitingState` and their lifecycle counterparts to real storage before conversation turns, as the lowest-risk, smallest-surface-area real write path.
6. **Nexus read-only evidence display plan.** A planning document (not frontend code) specifying how `EntityEvidencePanel`/`EvidenceExplorer` and similar would read Glassmind-backed memory once a backend read API exists — what that API's shape is, which Nexus components would call it, and confirmation that no write affordance is introduced. Implementation stays out of scope for Sprint 11 per `Glassmind-Package-Integration-Map.md` §10's non-goal; the plan itself is in scope.
7. **Workflow hardening for X10 git/index/build-artifact issues.** Concrete process work: something stronger than "remember to run `rm .git/index && git reset`" if the corruption keeps recurring, and a check (pre-commit or otherwise) that catches `apps/nexus-console/dist`, `*.tsbuildinfo`, or a stray `main` file before they're committed. Lower technical risk than items 1-6, but real time has been lost to both issues across Sprint 10 and continuing to treat them as one-off inconveniences each session is itself a cost.

## 4. Explicit Non-Goals For Sprint 11

Repeated here because every Glassmind document in this repo repeats its own non-goals for the same reason — they are what schedule pressure erodes first:

- **No vector memory.** Still Phase 3 (`Glassmind-Version-Roadmap.md` v0.9) at the earliest; nothing in Sprint 11's sequence requires it.
- **No semantic memory.** Still Phase 3 (v0.10); company-memory pattern detection (Phase 2) hasn't started either, and semantic memory depends on it.
- **No embeddings**, including as an unused/placeholder field on any newly-persisted record — the durable adapter design's §10/§16 already rules this out for the schema; Sprint 11 implementing that design does not get to quietly relax it.
- **No direct Nexus writes to Glassmind.** Item 6 in §3 is a read-only display *plan*. Nothing in Sprint 11 adds a "pin this in Glassmind" button, an edit form, or any Nexus-originated write call into `GlassmindStore`, durable or otherwise.
- **No bypassing CommandCore approval/governance.** `ApprovalWaitingStateMemoryRecord` becoming durable (§3 item 5) does not make it authoritative — per `Glassmind-Durable-Adapter-Design.md` §13 and `Glassmind-Repository-Boundary-Decision.md` §9, it remains Glassmind's read-through memory of CommandCore's real approval state, never a parallel authority a process could act on instead of the real Approval Engine.
- **No external Hermes runtime adoption unless separately approved.** `Hermes-Scope-Decision.md`'s separation holds through Sprint 11 regardless of how much Glassmind/Jarvis integration progresses — the two are unrelated initiatives per that decision, and nothing in this plan changes that.

## 5. Acceptance Criteria

- **All three packages test/build cleanly** — `apps/nexus-console`, `apps/glassmind`, `apps/jarvis-engine` each pass `tsc -b` and a full `vitest run`, verified via the established local-copy workaround immediately before any Sprint 11 item is considered done, not assumed from a prior session.
- **The durable/DB adapter has contract parity with `InMemoryGlassmindStore`.** Per `Glassmind-Durable-Adapter-Design.md` §14's recommendation, the existing 41-test `apps/glassmind` suite (or a shared, parameterized version of it) passes identically against the real persistence-backed `DurableGlassmindStore` as it does against `InMemoryGlassmindStore`.
- **Provenance rejection is enforced at the adapter level**, not only at the `DurableGlassmindStore`/`InMemoryGlassmindStore` application layer — per `Glassmind-Durable-Adapter-Design.md` §8, the chosen storage technology's own constraint mechanism (where available) backs the check, and a test proves a lower-level write bypassing the application layer is still rejected.
- **Empty retrieval remains valid.** `retrieveBySourceReference`/`retrieveByScope` against the real adapter return `[]` for no match, never throw, exactly as `InMemoryGlassmindStore` and the `DurableGlassmindStore` skeleton already do.
- **No raw EventStore payload duplication.** Whatever the EventStore bridge (§3 item 2) ends up being, the schema it writes through carries no `payload`/`eventData`-shaped field — confirmed against `Glassmind-Durable-Adapter-Design.md` §12's existing rule, not a new check invented this sprint.
- **No frontend write path.** `apps/nexus-console` gains no new dependency on `apps/glassmind` or `apps/jarvis-engine` as part of Sprint 11 — item 6 in §3 is a plan, not a wiring, and the read API it describes does not yet exist as deployed code at Sprint 11's close.

## 6. Risks And Sequencing

**Sequencing**, restating §3 with its dependencies explicit:

- Item 1 (durable adapter) blocks items 4 and 5 directly, and indirectly shapes item 3 (the read-only integration needs something durable to read from for the integration to mean anything beyond a compile-time check).
- Item 2 (EventStore bridge decision) can proceed in parallel with item 1 — they don't depend on each other — but item 2's *implementation* (as opposed to its decision) is blocked on item 1 existing, since there's nothing durable to ingest into otherwise.
- Item 5 should land before item 4, per the integration map's "narrowest first" recommendation, even though both depend on the same item 1.
- Item 6 (Nexus display plan) has no hard dependency on items 1-5 and could be drafted in parallel, but should be finalized after item 3 exists, since the plan is more concrete once there's a real read-only Jarvis↔Glassmind integration to model the eventual Nexus↔backend read API on.
- Item 7 (workflow hardening) is independent of everything else and can proceed at any point — it should not be deprioritized to the end of the sprint simply because it's unrelated to the Glassmind/Jarvis work, given the repeated real cost already documented in `Sprint-10-Final-Review.md` §4.

**Risks:**

- **Choosing a storage technology under schedule pressure without revisiting the Durable Adapter Design's indexing/schema requirements.** The design document (§10-11) specifies a logical shape independent of technology; Sprint 11's implementation should map onto that shape deliberately, not let the chosen technology's defaults silently redefine it.
- **The EventStore bridge decision (item 2) being skipped in favor of jumping straight to a quick, same-process shortcut.** `Glassmind-Repository-Boundary-Decision.md` §9 already names this exact risk ("mixing Python kernel concerns with TypeScript package concerns") — Sprint 11 is precisely where that temptation becomes concrete and real, since there will finally be a durable store worth ingesting into.
- **Conversation-turn persistence (item 4) being implemented before follow-up/decision/approval persistence (item 5) because it "seems more central."** The integration map's narrowest-first reasoning exists specifically to prevent this — conversation turns are higher-volume and user-visible sooner, which makes them a worse first real write path to debug against, not a better one.
- **The Nexus display plan (item 6) drifting into actual implementation mid-sprint** because the temptation to "just wire it up since the read API basically exists now" will be real once items 1-3 land. This should be resisted explicitly — Sprint 11's acceptance criteria (§5) require no new `apps/nexus-console` dependency on either package, and that should be checked at sprint close, not assumed.
- **Provenance enforcement (§5) regressing silently when moving from `InMemoryGlassmindStore` to a real adapter**, if the contract-parity test suite (§5 item 2) is treated as optional polish rather than a blocking requirement for calling the durable adapter done. This is the same risk every Glassmind document in this repo has flagged about the provenance rule specifically — it remains the single rule most likely to erode under pressure, and Sprint 11 is the sprint where it first has a real database to erode against.

## 7. Cross-References

- `docs/engineering/Sprint-10-Final-Review.md` — the review this plan follows from.
- `docs/architecture/Glassmind-Durable-Adapter-Design.md`, `docs/architecture/Glassmind-Repository-Boundary-Decision.md` — the design §3 items 1-2 implement.
- `docs/architecture/Glassmind-Package-Integration-Map.md` — the sequencing and read-only framing §3 items 3, 5, 6 follow.
- `docs/architecture/Jarvis-Conversation-Engine-Boundary.md` — the conversation-engine integration boundary §3 item 3 stays inside.
- `docs/architecture/Hermes-Scope-Decision.md` — the separation §4's external-Hermes non-goal restates.
- `docs/engineering/Package-Test-Build-Guide.md` — the workflow guidance §3 item 7 hardens further.
