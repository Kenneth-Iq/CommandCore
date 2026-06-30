# Glassmind Phase 1 Persistence Path

## 1. Purpose

Defines how each of the four Phase 1 memory record kinds moves from today's simulations and skeletons into durable Glassmind storage, without Glassmind ever becoming CommandCore's current-state authority. This document sits between `docs/architecture/Glassmind-Durable-Adapter-Design.md` (the storage design) and an actual database-backed implementation — it specifies the path, not the technology, and no database connectivity is added by this document.

## 2. Current State Of `apps/glassmind`

As of Sprint 11A/B/C (commit `5f436e7`):

- **`InMemoryGlassmindStore`** (`src/inMemoryStore.ts`) — the original Phase 1 reference implementation of `GlassmindStore`. Process-memory only, fully provenance-gated, all four record kinds plus their three lifecycle methods implemented and tested (25 tests).
- **`DurableGlassmindStore`** (`src/durableStore.ts`) — implements the same `GlassmindStore` interface, delegating to an injected `GlassmindPersistenceDriver`. Throws `GlassmindPersistenceNotConfiguredError` with no driver configured. Provenance and not-found checks live here, before the driver is ever called.
- **`InMemoryGlassmindPersistenceDriver`** (`src/durableStore.ts`) — the first concrete, fully-working `GlassmindPersistenceDriver` implementation: a dumb, business-logic-free CRUD store. `DurableGlassmindStore` + this driver pass the same contract-parity suite (`src/glassmindStoreParity.test.ts`, 18 tests) as `InMemoryGlassmindStore` alone.
- **`EventStoreIngestionAdapter`** (`src/eventStoreIngestion.ts`) — converts a structurally-typed `GlassmindIngestionEvent` into a `GlassmindMemoryRecord` and writes it through a `GlassmindStore`, given a caller-supplied eligibility predicate and record builder. No default eligibility; nothing is ingested unless explicitly opted in.
- **`DefaultCommandCoreEventBridge`** (`src/commandCoreEventBridge.ts`) — converts a structurally-typed `CommandCoreEventEnvelope` into the `GlassmindIngestionEvent` shape the ingestion adapter consumes. No `core/` import anywhere (enforced by a dedicated test).

None of these is connected to a real database, a real EventStore, or a real conversation engine output yet. This document describes the path each record kind will take once those connections exist — the connections themselves remain future work.

## 3. Persistence Path Per Record Kind

### 3.1 `ConversationTurnRecord`

- **Initiator (later):** the Jarvis conversation engine (`apps/jarvis-engine`), specifically whatever real implementation eventually replaces `DeterministicJarvisConversationEngine`, after a turn resolves. Today, `DeterministicJarvisConversationEngine.processTurn` only *reads* through `JarvisMemoryStore`/`GlassmindReadOnlyMemoryAdapter` — it has no write path, by design, per `Jarvis-Conversation-Engine-Boundary.md`.
- **Required `sourceReference`:** at minimum `conversationId`; `messageId` when the turn is tied to a specific message in CommandCore's Conversation/Thread/Message model. `eventId` only if the turn itself was triggered by an ingested CommandCore event rather than a user message.
- **Path:** engine resolves a turn → engine (or a thin persistence-call wrapper around it) calls `store.recordConversationTurn(record)` → `DurableGlassmindStore` validates provenance → driver inserts.
- **Lifecycle:** none. Conversation turns are write-once in Phase 1 — there is no `resolveConversationTurn` method on `GlassmindStore`, and none is proposed here. A turn's `approvalStatus` field can carry forward-looking state (`would_require_approval`, `pending_approval`, etc.) but the record itself is not mutated after creation; a *new* turn records what happened next.
- **Sequencing note:** per `Sprint-11-Implementation-Plan.md` §3, this is the higher-volume, later write path — it follows §3.2-§3.4 below into real storage, not the other way around.

### 3.2 `FollowUpMemoryRecord`

- **Initiator (later):** whatever process decides a follow-up is worth remembering — today simulated by `apps/nexus-console/src/executiveAssistant.ts`'s `buildFollowUps`; later, the conversation engine itself (when a turn implies an open question) or the EventStore ingestion adapter (when a CommandCore event implies one).
- **Required `sourceReference`:** `conversationId` (the conversation that raised it) or `recommendationId` (if raised by the Recommendation Engine) or `eventId` (if raised by an ingested event) — at least one, per the standard provenance gate.
- **Path:** `store.recordFollowUp(record)`.
- **Lifecycle:** `resolveFollowUp(id, input)`. The resolving party (a user action surfaced through Jarvis, or a future automated resolution) supplies `status`, `resolvedAt`, `resolvedBy`, and its own `resolutionSourceReference` — distinct from, and never overwriting, the record's original `sourceReference`. `resolveFollowUp` is the durable replacement for `PendingFollowUpsPanel`'s current local-only "Mark Resolved" toggle (`apps/nexus-console`), per `Glassmind-Phase-1-Storage-Design.md` §5 and §11 — that frontend behavior is not wired to this path yet (§9).

### 3.3 `DeferredDecisionMemoryRecord`

- **Initiator (later):** symmetric to follow-ups — simulated today by `buildDecisionQueue`; later, the Recommendation Engine (for `deferred`/`waiting` items) or the conversation engine (for a decision explicitly raised in conversation).
- **Required `sourceReference`:** `recommendationId` (most common — decisions usually originate from a recommendation) or `conversationId`.
- **Path:** `store.recordDeferredDecision(record)`.
- **Lifecycle:** `resolveDeferredDecision(id, input)`, same shape and same provenance-preservation guarantee as `resolveFollowUp`. This is the durable replacement for `DecisionQueuePanel`'s currently-recomputed-every-render decision list.

### 3.4 `ApprovalWaitingStateMemoryRecord`

- **Initiator (later):** whatever process first observes that an approval is being waited on — today simulated by `buildApprovalCards`; later, the real Approval Engine itself (per `Jarvis-Conversation-Architecture.md` §6) notifying Glassmind that an approval was requested, or the conversation engine when a turn's `approvalNeeded` marker fires.
- **Required `sourceReference`:** `recommendationId` or `conversationId` — whichever raised the need for approval.
- **Path:** `store.recordApprovalWaitingState(record)`.
- **Lifecycle:** `updateApprovalWaitingState(id, input)`. Per `Glassmind-Durable-Adapter-Design.md` §13 and `Glassmind-Repository-Boundary-Decision.md` §9, this update must be a **read-through reflection** of the real Approval Engine's state change — the call should be initiated by whatever process is told the real status changed (the Approval Engine itself, or a bridge listening to it), never inferred independently inside Glassmind. This is the one record kind where "who initiates the write" is itself a governance-relevant detail, not just a wiring detail: an unauthorized or speculative `updateApprovalWaitingState` call would let Glassmind's memory of an approval diverge from CommandCore's real approval state, which §7 below treats as a hard non-goal.

## 4. How Lifecycle Methods Are Used, Concretely

All three lifecycle methods follow one shape, already implemented and contract-tested:

1. Caller supplies the record's `id` and an input object containing the new `status`, a timestamp (`resolvedAt`/`updatedAt`), an identity for who/what resolved it (`resolvedBy`, follow-up/decision only), and its own source reference (`resolutionSourceReference`/`updateSourceReference`).
2. `assertValidSourceReference` validates that resolution-specific source reference — independently of the record's original one.
3. The store looks up the existing record by id; an unknown id throws `RecordNotFoundError` (no upsert, ever).
4. The store returns a new record value with `status` and the lifecycle metadata (`resolution`/`update`) updated, and `sourceReference` copied forward unchanged from the existing record.

This shape is already fully implemented in both `InMemoryGlassmindStore` and `DurableGlassmindStore`+`InMemoryGlassmindPersistenceDriver`, and proven identical between them by `glassmindStoreParity.test.ts`. Nothing about this shape changes when a real database adapter replaces the in-memory driver — the contract-parity suite exists specifically so that swap is verifiable.

## 5. What Remains Authoritative In CommandCore

Restated precisely for this document's scope, per `Glassmind-Durable-Adapter-Design.md` §13:

- The real-time status of a mission, agent, tool, or conversation — never queried from or cached into any Glassmind record.
- The real Approval Engine's current disposition for any approval — Glassmind's `ApprovalWaitingStateMemoryRecord.status` is a memory of that disposition at the time it was last told, never the live value itself.
- The CommandCore Conversation/Thread/Message model's actual message content — `ConversationTurnRecord.responseSummary` is a short, derived summary, never a copy of the full message.
- The CommandCore EventStore's raw event payloads — never copied into any Glassmind record, per §8 below.

## 6. What Glassmind Remembers Only As Memory/Retrieval

- That a conversation turn happened, what it concluded, and what evidence backed it.
- That a follow-up, decision, or approval was raised, what its status was at each point it changed, and who/what changed it.
- The provenance chain (`sourceReference`) connecting every one of the above back to a real CommandCore record.

Glassmind's copy of any of this can be stale relative to CommandCore at any given moment — that is expected and acceptable, because Glassmind is never queried as if it were live state (§5). What it cannot be is *wrong about its own history* — the provenance gate (§9) is what prevents that.

## 7. How Retrieval Works After Persistence

No change from the already-implemented behavior: `retrieveBySourceReference`/`retrieveByScope` query across all four record kinds and return whatever matches, regardless of which kind of persistence backend (`InMemoryGlassmindStore`, or `DurableGlassmindStore` with any `GlassmindPersistenceDriver`) is in use. Once a real driver exists, retrieval becomes a real query against durable storage instead of an in-process array scan — the `GlassmindStore` interface callers (the conversation engine, and later Nexus's read path per `Nexus-Glassmind-Read-Only-Evidence-Plan.md`) do not need to know or care which.

## 8. Empty Retrieval Semantics

Unchanged and non-negotiable: both retrieval methods return `[]` for no match, never throw, regardless of backend. This is already verified identically across `InMemoryGlassmindStore` and `DurableGlassmindStore`+`InMemoryGlassmindPersistenceDriver` in `glassmindStoreParity.test.ts`, and must remain true of any future real database driver — per `Glassmind-Retrieval.md` §3 step 5, an empty result is a valid, honest answer the caller (ultimately, Jarvis) must be able to act on without inventing a recollection.

## 9. Failure Handling

- **Provenance failure** (`InvalidSourceReferenceError`) — a write or lifecycle-update call with no populated source reference field is rejected before anything is persisted. This is a caller bug, not a transient failure, and should not be retried with the same input; the caller must supply real provenance.
- **Not-found failure** (`RecordNotFoundError`) — a lifecycle-update call against an unknown id is rejected. Possible causes once real persistence exists: the id genuinely doesn't exist, or a read-replica/cache lag means a recently-written record isn't visible yet. This document does not resolve that ambiguity — a real database adapter's design should specify its own consistency guarantees, and that specification is out of scope here (tracked as durable-adapter implementation work, not persistence-path work).
- **Storage-layer failure** (a real database being unreachable, a write timing out) — not modeled by any current type in this package. A real `GlassmindPersistenceDriver` implementation will need its own error type(s) for this category, distinct from `InvalidSourceReferenceError`/`RecordNotFoundError`, so callers can tell "you gave me bad input" apart from "the store is having a bad day." Specifying that error type is durable-adapter implementation work, flagged here as a known gap this document does not close.
- **No silent partial writes.** Whatever a real adapter's failure handling looks like, a write must either fully succeed (record and, where relevant, lifecycle metadata both persisted) or fully fail — never leave a record with a changed `status` but stale `resolution`/`update` metadata, restating `Glassmind-Durable-Adapter-Design.md` §7's atomicity requirement.

## 10. Test Requirements

- **Per-record-kind persistence path tests**, once a real driver exists: a write through each of the four `record*` methods followed by a retrieval (by scope and by source reference) confirming the record round-trips intact — extending the existing `glassmindStoreParity.test.ts` pattern to the real driver as a third `implementations` entry, per `Glassmind-Durable-Adapter-Design.md` §14's recommendation.
- **Lifecycle round-trip tests** for all three methods against the real driver, confirming `sourceReference` preservation and lifecycle-metadata population — the existing in-memory contract-parity tests already specify the exact assertions to reuse.
- **Initiator-boundary tests**, once a real conversation engine or Approval Engine bridge exists: a test confirming `updateApprovalWaitingState` is only ever called from the process that owns the real Approval Engine relationship (or its designated bridge) — not from Nexus, not from an arbitrary caller. This is process/integration-boundary testing, not a `GlassmindStore`-level unit test, and is flagged here as a requirement for whichever sprint wires the real Approval Engine, not built now.
- **No fragile tests** — consistent with every prior Glassmind test-requirements section in this repo, assert on `GlassmindStore`/lifecycle-method contract behavior, never on a chosen database technology's internals.

## 11. What Must Not Be Built Yet

- **No real database connection.** This document describes a path; `InMemoryGlassmindPersistenceDriver` remains the only working driver.
- **No wiring of `apps/jarvis-engine`'s write path to `apps/glassmind`.** The conversation engine remains read-only toward Glassmind, per `Jarvis-Conversation-Engine-Boundary.md` and `Glassmind-Package-Integration-Map.md` §5 — nothing in this document authorizes adding a write method to `JarvisConversationEngine` or `GlassmindReadOnlyMemoryAdapter`.
- **No wiring of the EventStore ingestion adapter or bridge to a real EventStore.** Both remain skeletons; §3's "later" initiators describe an eventual design, not a current connection.
- **No Approval Engine integration.** `updateApprovalWaitingState`'s real caller does not exist yet — §3.4's governance note is a requirement for that future integration, not something implemented here.
- **No Nexus wiring of any kind.** Covered fully by `docs/architecture/Nexus-Glassmind-Read-Only-Evidence-Plan.md`.

## 12. Cross-References

- `docs/architecture/Glassmind-Durable-Adapter-Design.md` — the storage design this document's persistence paths assume.
- `docs/architecture/Glassmind-Repository-Boundary-Decision.md` §9 — the approval-authority risk §3.4 restates.
- `docs/architecture/Jarvis-Conversation-Engine-Boundary.md` — the read-only conversation-engine boundary §11 reaffirms.
- `docs/architecture/Glassmind-Package-Integration-Map.md` — the integration sequencing this document's "later" initiators follow.
- `docs/roadmap/Sprint-11-Implementation-Plan.md` §3 — items 4-5, which this document specifies in detail.
- `docs/architecture/Nexus-Glassmind-Read-Only-Evidence-Plan.md` — the companion document for the read side of this same data.
