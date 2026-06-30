# Glassmind Durable Adapter Design

## 1. Purpose

Defines the future durable persistence adapter for Glassmind Phase 1, ahead of implementing it. `apps/glassmind`'s committed `GlassmindStore` interface and `InMemoryGlassmindStore` implementation (tightened with lifecycle methods in `docs/engineering/Glassmind-Contract-Review.md`'s follow-up work) are the contract this adapter must satisfy exactly — this document does not change that contract, it specifies how to implement it durably. No code is written as part of this document.

## 2. Why `InMemoryGlassmindStore` Is Dev/Test Only

`InMemoryGlassmindStore` holds four private arrays (`conversationTurns`, `followUps`, `deferredDecisions`, `approvalWaitingStates`) entirely in process memory. It loses everything on process exit, supports exactly one process at a time (no concurrent access from multiple Jarvis/Nexus backend instances), and has no query plan beyond a linear `.filter()` scan — acceptable for a skeleton and for unit tests, structurally wrong for anything real. `Glassmind-Phase-1-Storage-Design.md` and `apps/glassmind/README.md` both already state this is intentional: the storage technology was deliberately left unselected (`Sprint-10-Implementation-Plan.md` §4) so this design could be done properly rather than backed into.

## 3. Expected Durable Adapter Responsibilities

A durable `GlassmindStore` implementation must:

- Implement every method of the interface in `apps/glassmind/src/store.ts` with identical external behavior to `InMemoryGlassmindStore` — same provenance gate, same empty-retrieval honesty, same id-not-found rejection, same provenance-preservation guarantee on lifecycle updates. Callers (the conversation engine, an ingestion adapter, tests) should not need to know which implementation they're talking to.
- Survive process restarts and serve concurrent readers/writers correctly.
- Reject a write whose `sourceReference` is entirely empty at the storage layer itself (§9), not only at a calling layer that might be bypassed.
- Never call out to CommandCore, Nexus, or any other system as a side effect of a read or write (§11).

## 4. Records It Must Persist

All four Phase 1 record kinds from `apps/glassmind/src/types.ts`, field-for-field:

- **`ConversationTurnRecord`** — `id`, `conversationId`, `threadId?`, `sender`, `intentKind`, `intentConfidence`, `evidence: EvidenceLink[]`, `responseSummary`, `approvalStatus`, plus the shared `RetrievalMetadata`/`SourceReference` fields (§6-7).
- **`FollowUpMemoryRecord`** — `id`, `followUpKind`, `text`, `status`, `evidence?`, plus shared fields, plus an optional `resolution: LifecycleResolution` once resolved.
- **`DeferredDecisionMemoryRecord`** — `id`, `title`, `detail`, `status`, `evidence?`, plus shared fields, plus an optional `resolution: LifecycleResolution`.
- **`ApprovalWaitingStateMemoryRecord`** — `id`, `title`, `detail`, `status`, `evidence?`, plus shared fields, plus an optional `update: LifecycleUpdate`.

No field on any of these four types is optional in the storage schema sense beyond what the TypeScript type already marks optional (`threadId?`, `evidence?`, `resolution?`/`update?`) — the adapter must not silently drop a populated field.

## 5. SourceReference / Provenance Metadata

`SourceReference` (`conversationId?`, `messageId?`, `recommendationId?`, `eventId?`) is stored exactly as shaped in `apps/glassmind/src/types.ts` — a small, sparse object, not a single denormalized "source id" column that loses which kind of source it was. Every record's `sourceReference` is written once at creation and is never overwritten by a lifecycle update (§8). Lifecycle updates carry their own, separate `resolutionSourceReference`/`updateSourceReference`, which the adapter persists as part of the `LifecycleResolution`/`LifecycleUpdate` sub-structure, never merged into or replacing the original.

## 6. RetrievalMetadata

`scope: { entityKind, entityId }`, `occurredAt`, `confidence` — stored as first-class, independently queryable fields (§10), not buried inside an opaque JSON blob the adapter can't index against. `confidence` remains a plain number in Phase 1, populated by simple, explainable derivation per `Glassmind-Phase-1-Storage-Design.md` §9 — the adapter does not compute or reinterpret it, only stores what it's given.

## 7. How Lifecycle Updates Persist

`resolveFollowUp`, `resolveDeferredDecision`, and `updateApprovalWaitingState` must each be implemented as an update-in-place against the existing record's row/document, not an insert of a new record:

1. Look up the record by `id` within its category. If not found, reject cleanly (`RecordNotFoundError`, matching `InMemoryGlassmindStore`'s behavior) — no upsert, ever.
2. Validate the lifecycle input's own source reference (`resolutionSourceReference`/`updateSourceReference`) against the same provenance gate as record creation (§9). Reject before any write if invalid.
3. Update only `status` and the `resolution`/`update` sub-structure. The record's original `sourceReference`, `id`, `scope`, `occurredAt`, and every other creation-time field are left untouched — the adapter must not provide, and must actively guard against, any code path that lets a lifecycle update overwrite them.
4. Return the full updated record, matching `InMemoryGlassmindStore`'s return shape.

Whatever storage technology is chosen, this update must be atomic with respect to the provenance check — a concurrent reader must never observe a record whose status changed but whose `resolution`/`update` metadata hasn't been written yet, or vice versa.

## 8. Provenance As A Hard Database/Storage Gate

This is the single most important requirement carried over from `Glassmind-Phase-1-Storage-Design.md` §8 and repeated in every Glassmind document since: **the provenance check must be enforced by the storage layer itself, not only by application code that calls it.** Concretely, whichever technology is chosen should express this as a real constraint where the technology allows it — for example, a `CHECK` constraint or equivalent guaranteeing at least one of the four `sourceReference` sub-fields is non-null, not merely a TypeScript-level `assertValidSourceReference` call that a future, different caller could bypass. If the chosen technology cannot express this as a native constraint, the adapter's write path must perform the check as the unconditional first step of every write/update method, with a test (§14) proving a direct, lower-level write that skips the adapter cannot also skip the check (i.e., the constraint lives as close to the data as the technology allows).

## 9. Empty Retrieval Returns `[]`

`retrieveBySourceReference` and `retrieveByScope` must return an empty array — never throw, never return `null`/`undefined` — when no record matches, exactly matching `InMemoryGlassmindStore`'s current behavior and `Glassmind-Retrieval.md` §3 step 5's "empty retrieval is a valid, honest result" rule. A durable adapter's query layer (an empty result set from a `SELECT`/`find`) maps naturally onto this; the adapter must not introduce a "not found" exception path the in-memory implementation doesn't have.

## 10. Suggested Storage Shape

Deliberately technology-agnostic — this section describes the logical shape, not a chosen database:

- **One table/collection per record kind** (`conversation_turns`, `follow_ups`, `deferred_decisions`, `approval_waiting_states`), mirroring `InMemoryGlassmindStore`'s four separate arrays rather than one polymorphic table — this keeps each kind's schema explicit and avoids a sparse, hard-to-index "one big table with nullable columns for every kind" design.
- Each table carries the record's own fields as first-class columns/properties (§4), a nested `source_reference` structure (§5), the shared retrieval-metadata columns (§6), and a nested `resolution`/`update` structure (§7) that is null until the record is resolved/updated.
- `evidence` (an array of `EvidenceLink` on `ConversationTurnRecord`, a single optional one on the other three) can reasonably be stored as a JSON/array column rather than a separate join table in Phase 1 — it's small, it's never queried by its own fields (only ever read back wholesale alongside its parent record), and normalizing it would add complexity Phase 1 doesn't need.
- A single logical `GlassmindMemoryRecord` view/union across all four tables is useful for implementing `retrieveBySourceReference`/`retrieveByScope` (which today scan all four categories via `InMemoryGlassmindStore.allRecords()`) but should be a read-side concern (a union query or application-level fan-out), not a forced single physical table.

## 11. Indexing Requirements

Each of the four tables needs indexes supporting exactly the two Phase 1 retrieval patterns plus the lookups lifecycle methods need:

- **`sourceReference` fields** (`conversation_id`, `message_id`, `recommendation_id`, `event_id`) — indexed individually (or as a composite, depending on the technology's query patterns), since `retrieveBySourceReference` matches on any one populated field per `InMemoryGlassmindStore`'s `matchesSourceReference` logic.
- **`scope` (`entity_kind`, `entity_id`)** — indexed as a composite, since `retrieveByScope` always queries both together.
- **Record type/category** — implicit if using one table per kind (§10); if a unified table is ever chosen instead, this must be an indexed discriminant column.
- **`status`** — indexed per table, anticipating the most likely future query this Phase 1 contract doesn't yet expose ("all open follow-ups," "all awaiting approvals") even though no such method exists on `GlassmindStore` today — the index costs little to add now and avoids a painful migration later if/when such a method is added.
- **`createdAt`/`updatedAt`** — `occurredAt` (creation) and the lifecycle `resolvedAt`/`updatedAt` (resolution/update) should both be indexed to support the recency bound `Glassmind-Retrieval.md` §2 requires every query to respect, even though Phase 1's two retrieval methods don't yet filter by it explicitly.

## 12. Avoiding Duplication Of Raw EventStore Payloads

Per `Glassmind-Architecture.md` §5 and the architecture rules repeated across every Glassmind document: a record's `sourceReference.eventId` points at the real CommandCore EventStore event. The durable adapter must never store the event's payload contents — only the id. If a future ingestion adapter (not in scope here) needs to denormalize some small piece of an event for query convenience, that is a deliberate, separate, reviewed decision, not something this storage design pre-authorizes. The adapter's schema (§10) has no `payload`/`eventData`/similar column anywhere.

## 13. Avoiding Becoming CommandCore's Current-State Authority

The durable adapter persists what Glassmind was told and when — never queries CommandCore for current state, never caches a mission's live status, an agent's live runtime status, or an approval's live disposition into its own tables for the purpose of answering "what is true right now." `ApprovalWaitingStateMemoryRecord`'s `status` field, once durable, remains Glassmind's *memory* of an approval's disposition at the time it was recorded/updated — not a live mirror that auto-refreshes from a real Approval Engine. If CommandCore's real approval state changes, that change reaches Glassmind only through an explicit `updateApprovalWaitingState` call (presumably from whatever process is told the real status changed), never through the adapter polling or subscribing to CommandCore on its own initiative. This keeps the read-through framing from `Glassmind-Phase-1-Storage-Design.md` §7 intact at the storage layer, not just at the API layer.

## 14. Test Requirements For The Durable Adapter

- **Contract parity** — every test currently in `apps/glassmind/src/inMemoryStore.test.ts` (25 tests as of `docs/engineering/Glassmind-Contract-Review.md`'s follow-up work) should pass unmodified against the durable adapter, ideally via a shared test suite parameterized over both implementations rather than a duplicated copy — this is the single best guarantee that the durable adapter is a drop-in replacement, not a parallel, subtly-different implementation.
- **Provenance gate at the storage layer** — a test that attempts to bypass the adapter's application-level check (e.g., a lower-level insert that skips `assertValidSourceReference`-equivalent logic) and confirms the storage layer itself still rejects it, per §8.
- **Persistence across restarts** — write a record, simulate a process restart (reconnect a fresh adapter instance to the same underlying store), and confirm the record and its lifecycle metadata are both still present and unchanged.
- **Concurrent lifecycle update** — two near-simultaneous `resolveFollowUp` calls against the same id should not corrupt the record or silently lose one update; the adapter should either serialize them correctly or surface a clear conflict, never produce a record with partially-applied fields from both calls.
- **Index correctness, not just presence** — a retrieval test against a dataset large enough that an unindexed scan would be the obvious wrong implementation, confirming the adapter actually uses the indexes from §11 rather than just having them declared.
- **No fragile tests** — consistent with `Nexus-Frontend-Testing-Strategy.md` §4's guidance applied here too: assert on `GlassmindStore` contract behavior, never on the chosen database technology's query syntax or internals, so the technology choice itself stays swappable.

## 15. Migration Path From InMemoryGlassmindStore To Durable Adapter

1. Implement the durable adapter against the existing `GlassmindStore` interface with zero interface changes — if the interface needs to change to accommodate the durable implementation, that is itself a sign the interface was under-specified and should be fixed first, not worked around in the adapter.
2. Run the shared contract test suite (§14) against the new adapter until it passes identically to `InMemoryGlassmindStore`.
3. Introduce the durable adapter as an additional, separately-instantiable implementation — `InMemoryGlassmindStore` is not deleted at this point; it remains useful for fast unit tests that don't need real persistence.
4. Per `Glassmind-Package-Integration-Map.md` §9, the first real caller to switch from in-memory to durable should be the narrowest one (follow-up/decision/approval lifecycle writes), not conversation turns and not any Nexus-facing read path — this document does not change that sequencing, only enables it once the adapter exists.
5. `InMemoryGlassmindStore` remains the default for `apps/glassmind`'s own unit tests indefinitely — the durable adapter is what a real backend process instantiates, not what the package's own test suite depends on day to day.

## 16. Non-Goals

Repeated explicitly, as every Glassmind document does, because non-goals are exactly what schedule pressure erodes first:

- **No vector memory.** No embedding column, no similarity index, on any table in §10.
- **No semantic memory.** No generalized "pattern" table, no cross-record summarization logic in the adapter.
- **No embeddings**, including as an unused/future-proofing column — if Phase 1's two retrieval methods don't use a field, it does not belong in the Phase 1 schema, per `Glassmind-Phase-1-Storage-Design.md` §10's identical rule.
- **No Nexus writes.** The durable adapter is reachable only from whatever process hosts `GlassmindStore` (the conversation engine, a future ingestion adapter) — Nexus never gets a direct connection to it, durable or otherwise, per `Glassmind-Package-Integration-Map.md` §4 and §6.
- **No frontend `localStorage` migration yet.** Building the durable adapter does not, by itself, authorize starting the `useConversationLog`/`usePinnedConversations` migration — that remains its own deliberate, separate step per `Glassmind-Package-Integration-Map.md` §10.

## 17. Cross-References

- `docs/architecture/Glassmind-Phase-1-Storage-Design.md` — the original schema and non-goals this document implements durably.
- `docs/engineering/Glassmind-Contract-Review.md` — the lifecycle-method gap this document's §7 closes the design for.
- `docs/architecture/Glassmind-Package-Integration-Map.md` — the integration sequencing §15 defers to.
- `docs/architecture/Glassmind-Repository-Boundary-Decision.md` — where this adapter's code should physically live.
- `docs/roadmap/Sprint-10-Backend-Implementation-Backlog.md` — the backlog item ("durable database adapter design") this document delivers.
- `docs/testing/Nexus-Frontend-Testing-Strategy.md` — the testing conventions §14 follows.
