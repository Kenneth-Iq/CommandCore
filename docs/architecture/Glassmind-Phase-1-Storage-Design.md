# Glassmind Phase 1 Storage Design

## 1. Purpose

`docs/architecture/Glassmind-Version-Roadmap.md` names v0.5 ("Phase 1 Foundation") as real durable storage for follow-ups, deferred decisions, waiting approvals, and indexed conversation memory. `docs/architecture/Glassmind-Memory-Model.md` specifies the general seven-kind memory schema. `docs/architecture/Jarvis-Conversation-Engine-Boundary.md` specifies which of today's frontend behaviors graduate into which Glassmind categories. This document is the missing piece between those three: the actual storage design for Phase 1, concrete enough to implement against, before any implementation begins. It is documentation only — no backend code is written as part of it, and no frontend file changes.

## 2. Phase 1 Storage Scope

Phase 1 stores exactly four record categories, no more:

1. Conversation turn records (§4).
2. Follow-up records (§5).
3. Deferred decision records (§6).
4. Approval waiting-state records (§7).

Every record in every category carries source-reference/provenance fields (§8) and a small set of retrieval metadata fields (§9). Nothing else is in scope. Company memory, knowledge memory, vector memory, and semantic memory are explicitly Phase 2/3 (`Glassmind-Version-Roadmap.md` v0.7-v0.10) and are non-goals here (§10).

## 3. What Glassmind Owns Versus What CommandCore Owns

This is the same boundary `Jarvis-Conversation-Engine-Boundary.md` §4 already drew for conversation data specifically; restated here as the general Phase 1 rule:

| Glassmind owns | CommandCore owns |
| --- | --- |
| That a follow-up/decision/approval/turn was observed, when, and with what it was about | The live status of whatever the record refers to (a mission's current state, an approval's current disposition) |
| The durable record of a conversation turn's resolved intent, evidence, and response | The actual Conversation/Thread/Message content itself — Glassmind indexes it, per `Glassmind-Memory-Model.md` §3, it does not copy it |
| Retrieval over its own four record categories | The EventStore, registries, and runtimes Glassmind's ingestion reads from but never writes to |
| Confidence/provenance metadata about its own records | The AuditTrail — a record of actions taken, a different thing from Glassmind's record of conversation/decision history that preceded those actions |

Glassmind reads from CommandCore. CommandCore never reads from Glassmind to determine current state. This asymmetry is deliberate and is the mechanism that keeps the "not the source of truth for live operational state" rule enforceable rather than aspirational.

## 4. Conversation Turn Records

```text
ConversationTurnRecord {
  id
  kind: "conversation_turn"
  scope: { entityKind, entityId }            // the entity the turn was about, if any
  conversationId                              // the real CommandCore Conversation this turn belongs to
  threadId?
  sender: "jarvis" | "user"
  intentKind                                  // IntentClassification.kind, persisted verbatim
  intentConfidence
  evidence: EvidenceLink[]                    // the existing, already-shared shape — never a new evidence type
  responseSummary                             // what was said, not the full transcript text (see §3 — Glassmind indexes, CommandCore's Conversation model holds the literal content)
  approvalStatus: "not_required" | "would_require_approval" | "pending_approval" | "approved" | "rejected"
  sourceReference: { conversationId, messageId? }   // required, see §8
  occurredAt
  confidence                                  // record-level confidence, per Glassmind-Memory-Model §2
}
```

`responseSummary` is deliberately not the full message text — the full text lives in CommandCore's Conversation/Thread/Message records, which `sourceReference.messageId` points at. This keeps Glassmind from becoming a second, drifting copy of conversation content, consistent with §3's ownership table and with the "Glassmind indexes, it does not duplicate" rule from `Glassmind-Memory-Model.md` §3.

`approvalStatus` carries `IntentClassification`/`ApprovalPlaceholder` values through from today's simulation (`not_required`, `would_require_approval`) plus the real Approval Engine's states (`pending_approval`, `approved`, `rejected`) once those exist — both sets of values are listed now so the schema doesn't need a breaking change when real approvals land.

## 5. Follow-Up Records

```text
FollowUpRecord {
  id
  kind: "follow_up"
  scope: { entityKind, entityId }
  followUpKind: "question" | "waiting" | "postponed" | "review"   // matches FollowUpKind today
  text
  status: "open" | "resolved" | "deferred" | "expired"             // per Memory-Strategy.md §4
  evidence?: EvidenceLink
  sourceReference: { conversationId?, recommendationId?, eventId? }
  createdAt
  resolvedAt?
  confidence
}
```

This is the durable replacement for `buildFollowUps`'s recomputed-every-render output and `PendingFollowUpsPanel`'s local, non-persistent "Mark Resolved" toggle. The `status` field is what makes resolution durable instead of a UI-only `Set` that resets on reload.

## 6. Deferred Decision Records

```text
DeferredDecisionRecord {
  id
  kind: "deferred_decision"
  scope: { entityKind, entityId }
  title
  detail
  status: "waiting" | "deferred" | "completed" | "info"   // matches DecisionStatus today
  evidence?: EvidenceLink
  sourceReference: { recommendationId?, conversationId?, eventId? }
  occurredAt
  resolvedAt?
  confidence
}
```

Durable replacement for `buildDecisionQueue`'s recomputed output. Note `status` deliberately keeps today's four-value `DecisionStatus` rather than inventing a new status model — Phase 1 is a storage upgrade for existing categories, not a redesign of what those categories mean.

## 7. Approval Waiting-State Records

```text
ApprovalWaitingStateRecord {
  id
  kind: "approval_waiting_state"
  scope: { entityKind, entityId }
  title
  detail
  status: "awaiting" | "approved" | "deferred" | "rejected"   // matches ApprovalStatus today
  evidence?: EvidenceLink
  sourceReference: { conversationId?, recommendationId? }
  requestedAt
  resolvedAt?
  confidence
}
```

**Important scope note:** this record is Glassmind's *memory* that an approval was requested and what its disposition was — it is explicitly not the Approval Engine's live state. Once a real Approval Engine exists, this record's `status` should be a read-through reflection of that engine's state at the time, not a second place where approval state can drift out of sync. Per §3's ownership table, CommandCore's Approval Engine remains authoritative; Glassmind remembers.

## 8. Source Reference / Provenance Records

There is no separate "provenance record" type — provenance is a required field embedded in every record above, per `Glassmind-Memory-Model.md` §2's non-negotiable rule. Restated precisely for Phase 1:

```text
sourceReference: {
  conversationId?: string
  messageId?: string
  recommendationId?: string
  eventId?: string
  // at least one field must be populated — never all-undefined
}
```

**Enforcement, not just convention:** a write to any of the four Phase 1 tables with an all-empty `sourceReference` must be rejected by the storage layer itself, not merely flagged by a linter or caught in code review. This is the single hard gate `Jarvis-Conversation-Engine-Boundary.md` §10 and §11 already named as the rule most likely to erode under schedule pressure; this document repeats it because Phase 1's storage layer is exactly where that enforcement either exists or doesn't.

`sourceReference` fields point at real CommandCore identifiers (conversation IDs, message IDs, event IDs) or at a recommendation ID from the existing Recommendation Engine — never at a Glassmind-internal ID belonging to another Glassmind record. Provenance always terminates at a real source-of-truth record, never at another piece of memory.

## 9. Retrieval Metadata

Each record carries the minimum metadata `Glassmind-Retrieval.md` §3-§4 needs for Phase 1's two supported retrieval stages (working-memory check and exact-reference lookup — no scoped expansion, no similarity search per §10):

- `scope.entityKind` / `scope.entityId` — the exact-reference lookup key, using the same identifier space `RouteSelection`/`EvidenceLink` already use throughout Nexus, per `Glassmind-Workspace-Knowledge.md` §3's reuse principle.
- `occurredAt`/`createdAt`/`requestedAt` — the recency bound `Glassmind-Retrieval.md` §2 requires every query to respect.
- `confidence` — populated per `Glassmind-Memory-Model.md` §2; in Phase 1 this should be a simple, explainable derivation (e.g., "approval-required intents score lower confidence than informational ones," matching `conversationOrchestrator.ts`'s existing `IntentClassification.confidence` logic) rather than anything resembling a learned score.

No ranking-by-corroboration metadata is needed in Phase 1 — corroboration counting belongs to company memory (`Glassmind-Memory-Model.md` §3), which is Phase 2.

## 10. Storage Boundaries And Non-Goals

Explicit non-goals for Phase 1, each restated from the architecture rules governing this document:

- **No vector memory.** No `embedding` field on any Phase 1 record. Phase 1's `EvidenceLink`-based exact-reference retrieval is the only lookup mechanism.
- **No semantic memory.** No generalized "pattern" records, no cross-record summarization. Every Phase 1 record stands on its own provenance.
- **No opaque embeddings of any kind**, including as an unused/future-proofing field — if a field isn't used by Phase 1's two retrieval stages, it does not exist in the Phase 1 schema.
- **No raw event payload duplication.** `sourceReference.eventId` points at the EventStore; Phase 1 records never copy a payload's contents.
- **No write path into CommandCore.** Glassmind's storage layer has no API that mutates a Mission, Agent, Tool, or Conversation record, an Approval Engine entry, or anything else CommandCore owns. It only ever reads from CommandCore (for ingestion, per `Glassmind-Ingestion.md` §2) and is read by Jarvis/Nexus (for retrieval).
- **Nexus dashboards stay read-only.** Nothing in this design adds a write button, a mutation endpoint, or any UI affordance that changes state through Nexus. `EvidenceExplorer`, `EntityEvidencePanel`, and friends would, once migrated (§11), read from Glassmind the same way they read from in-memory state today — strictly a read-path change.
- **Empty retrieval is a valid, honest result.** No Phase 1 interface synthesizes a plausible-sounding answer when a query misses; per `Glassmind-Retrieval.md` §3 step 5, the correct response is "no memory of this," surfaced as such all the way up to Jarvis's conversation output.
- **No company, knowledge, working, or long-term-promotion memory in Phase 1.** Promotion (`Glassmind-Architecture.md` §5) is referenced only insofar as a pinned conversation is an explicit-action ingestion signal (§11); the broader promotion/long-term-memory machinery is not built yet.

## 11. Migration Path From Current Nexus/localStorage Simulation

Per category, mapping today's frontend state to the Phase 1 schema:

- **`useConversationLog`'s `ConversationLogEntry[]`** → `ConversationTurnRecord`s, one per logged entry. `ConversationLogEntry.badge` maps to retrieval-filterable metadata (§9); `ConversationLogEntry.summary` maps to `responseSummary`. The 20-entry cap is replaced by Phase 1's real retention (no fixed cap, subject to a retention policy to be defined alongside implementation, not in this document).
- **`usePinnedConversations`'s pinned-ID `Set`** → not a separate table. A pin sets a promotion-intent flag on the corresponding `ConversationTurnRecord`, consistent with `Glassmind-Ingestion.md` §2's "explicit user action" ingestion source and `Jarvis-Conversation-Engine-Boundary.md` §7's "a pin becomes a promotion signal, not a separate storage mechanism."
- **`buildFollowUps`'s output** → `FollowUpRecord`s. Recomputation-on-every-render is replaced by real reads against this table; the function's *logic* for deciding what counts as a follow-up does not need to change in Phase 1, only where its output lives.
- **`buildDecisionQueue`'s output** → `DeferredDecisionRecord`s, same migration shape as follow-ups.
- **`buildApprovalCards`'s output** → `ApprovalWaitingStateRecord`s, same shape, with the explicit caveat from §7 that once a real Approval Engine exists, this table's `status` becomes a reflection of that engine rather than an independent simulation.
- **`JarvisPresence`'s "already alerted" `useRef<Set<string>>`** → not migrated in Phase 1. Per `Jarvis-Conversation-Engine-Boundary.md` §9 item 4, this fix depends on conversation-turn ingestion (Phase 1 v0.6, conversation-turn ingestion specifically — not v0.5's storage-only scope), so it is sequenced after this document's scope, not within it.

**Migration discipline:** each category above should migrate with a before/after parity test (existing UI behavior unchanged immediately post-migration), per the same approach already specified in `Sprint-10-Implementation-Plan.md` §9 and `Jarvis-Conversation-Engine-Boundary.md` §10.

## 12. Minimum Backend Interfaces Needed Later

Not implemented in this document; specified here so the later coding sprint has an agreed starting contract rather than inventing one ad hoc:

```text
GlassmindStore {
  writeConversationTurn(record: ConversationTurnRecord): Result
  writeFollowUp(record: FollowUpRecord): Result
  writeDeferredDecision(record: DeferredDecisionRecord): Result
  writeApprovalWaitingState(record: ApprovalWaitingStateRecord): Result

  getByExactReference(scope: { entityKind, entityId }, kind?: RecordKind): Record[]
  getWorkingMemory(turnId: string): Record[]   // current-turn scope only, per Glassmind-Retrieval.md §3 step 1

  resolveFollowUp(id, status): Result
  resolveDeferredDecision(id, status): Result
  updateApprovalWaitingState(id, status): Result
}
```

Every `write*` method must reject a record whose `sourceReference` is all-undefined (§8) — this is a contract-level requirement, not an implementation detail left to whoever builds it first. `getByExactReference` and `getWorkingMemory` are the only two read methods Phase 1 needs, matching §10's "no scoped expansion, no similarity search" boundary; additional read methods (scoped expansion, similarity) are explicitly Phase 1B/Phase 3 additions, not part of this contract.

## 13. Required Tests And Acceptance Criteria

- **Provenance enforcement (§8):** a write to any of the four `write*` methods with an all-empty `sourceReference` must fail. This is the highest-priority test in this entire design and should exist before any other Phase 1 test, per the same priority `Jarvis-Conversation-Engine-Boundary.md` §10 already assigned it.
- **No write-back to CommandCore (§10):** a test (or, more durably, a static/architectural check) confirming `GlassmindStore` has no method that mutates a Mission, Agent, Tool, Conversation, or Approval Engine record. This boundary should be checked mechanically, not left to review discipline alone.
- **Empty retrieval honesty (§10):** `getByExactReference` against a scope with no records returns an explicit empty result, distinguishable from an error, and the caller-facing behavior (ultimately, what Jarvis says) must not synthesize a recollection from that empty result.
- **Migration parity (§11):** for each of the four categories, a before/after test that existing frontend-visible behavior (what `JarvisPresence`'s Recent/Pinned tabs, `PendingFollowUpsPanel`, `DecisionQueuePanel`, and `ApprovalCardsPanel` show) is unchanged immediately after that category's storage backend swaps from in-memory/`localStorage` to `GlassmindStore`.
- **Schema field completeness:** each record type (§4-§7) round-trips through a write/read cycle with all required fields intact, particularly `scope`, `sourceReference`, and `confidence` — these three are the fields every other requirement in this document (ownership boundary, provenance, retrieval) depends on being present and correct.
- **No fragile tests:** consistent with `Nexus-Frontend-Testing-Strategy.md` §4, none of the above should assert on storage technology internals (which database, which query syntax) — assert on the `GlassmindStore` contract's behavior, so the storage technology choice (deferred per `Sprint-10-Implementation-Plan.md` §4's own deliverable note) can change without invalidating these tests.

## 14. Risks And Sequencing

**Sequencing** within Phase 1 itself, in order:

1. Schema and `sourceReference` enforcement (§4-§8) — must exist before any write path, since every other guarantee in this document depends on it.
2. `GlassmindStore` contract (§12) with provenance enforcement and the two read methods — the minimum viable interface.
3. Follow-up, deferred decision, and approval-waiting-state migration (§11) — these three can proceed in parallel once item 2 exists, since they don't depend on each other.
4. Conversation turn record migration (§11) — sequenced after items 1-3 are proven, since it is the highest-volume category and benefits from the storage layer having already been exercised by the simpler categories first.

**Risks**, beyond those already named in `Jarvis-Conversation-Engine-Boundary.md` §11:

- **Schema scope creep toward Phase 2/3 fields.** The temptation to add an `embedding` placeholder field "for later" or a `corroborationCount` field "since it's easy" should be resisted per §10 — if Phase 1 doesn't use a field, it does not belong in the Phase 1 schema, full stop. Speculative fields are exactly the kind of premature design this document's non-goals section exists to block.
- **`ApprovalWaitingStateRecord` drifting into a second approval-state authority.** §7's read-through framing must be enforced in the eventual implementation, not just stated here — if Glassmind's record of approval status and the real Approval Engine's status can ever disagree, something has gone wrong, and that disagreement should be detectable (e.g., a reconciliation check), not silently tolerated.
- **Migration parity tests being skipped under time pressure.** Per §11's migration discipline and §13, these are not optional polish — without them, a storage migration that subtly changes what `JarvisPresence`'s Recent tab shows could ship unnoticed.
- **Environment/tooling risk**, carried forward from prior sprint documents: the working environment's network-mounted drive has shown repeated git-index corruption during this documentation sprint. Unrelated to this design's content, but worth tracking separately as a logistics risk to whichever sprint implements it.

## 15. Cross-References

- `docs/architecture/Glassmind-Architecture.md` — the seven-kind memory model and ownership rules this design implements a Phase 1 slice of.
- `docs/architecture/Glassmind-Memory-Model.md` — the shared-fields and per-kind schema convention §4-§9 follow.
- `docs/architecture/Glassmind-Ingestion.md` — the explicit-action ingestion source §11's pinning migration relies on.
- `docs/architecture/Glassmind-Retrieval.md` — the two-stage retrieval model §9 and §12 implement.
- `docs/architecture/Glassmind-Workspace-Knowledge.md` — the identifier-space reuse principle §9 follows.
- `docs/architecture/Glassmind-Version-Roadmap.md` — the v0.5 Phase 1 milestone this document fully specifies.
- `docs/architecture/Jarvis-Conversation-Engine-Boundary.md` — the conversation-specific graduation table §4, §7, and §11 are grounded in.
- `docs/architecture/Conversation-Evidence.md`, `docs/architecture/Memory-Strategy.md` — the evidence and memory-category rules referenced throughout.
- `docs/roadmap/Sprint-10-Implementation-Plan.md` — the broader Sprint 10 plan this document delivers against §4's "follow-up architecture note" deliverable.
- `docs/testing/Nexus-Frontend-Testing-Strategy.md` — the testing conventions §13 follows.
