# Glassmind Schema Migration Plan

## 1. Purpose

Defines the concrete logical schema for Glassmind Phase 1's four record categories — table/collection names, required fields, required indexes, and provenance constraints — building directly on `docs/architecture/Glassmind-Durable-Adapter-Design.md` §10-11's already-specified logical shape and `apps/glassmind/src/types.ts`'s exact field set. Still technology-agnostic, per `docs/architecture/Glassmind-Persistence-Runtime-Decision.md`'s deferral of the actual database choice — this document specifies what the schema must contain, not which engine stores it.

## 2. Phase 1 Record Categories

The same four kinds `apps/glassmind/src/types.ts` already defines, with no new categories introduced here:

- `ConversationTurnRecord`
- `FollowUpMemoryRecord`
- `DeferredDecisionMemoryRecord`
- `ApprovalWaitingStateMemoryRecord`

## 3. Proposed Table/Collection Names

One table/collection per record kind, per `Glassmind-Durable-Adapter-Design.md` §10's recommendation against a single polymorphic table — prefixed `glassmind_` so they read unambiguously if this schema ever shares a database with other CommandCore-adjacent data:

| Record kind | Proposed name |
| --- | --- |
| `ConversationTurnRecord` | `glassmind_conversation_turns` |
| `FollowUpMemoryRecord` | `glassmind_follow_ups` |
| `DeferredDecisionMemoryRecord` | `glassmind_deferred_decisions` |
| `ApprovalWaitingStateMemoryRecord` | `glassmind_approval_waiting_states` |

## 4. Required Fields

Every table carries the shared `RetrievalMetadata` fields (`scope.entityKind`, `scope.entityId`, `occurredAt`, `confidence`) and the shared `SourceReference` fields (`source_reference.conversation_id`, `source_reference.message_id`, `source_reference.recommendation_id`, `source_reference.event_id`), plus its own kind-specific fields below. Column names are written `snake_case` as a representative convention; the actual naming convention is technology-dependent and unresolved (§9).

### 4.1 `glassmind_conversation_turns`

`id`, `conversation_id`, `thread_id` (nullable), `sender` (`jarvis`/`user`), `intent_kind`, `intent_confidence`, `evidence` (array — see §4.5), `response_summary`, `approval_status` (`not_required`/`would_require_approval`/`pending_approval`/`approved`/`rejected`), plus shared fields. No lifecycle sub-structure — conversation turns are write-once (`Glassmind-Phase-1-Persistence-Path.md` §3.1).

### 4.2 `glassmind_follow_ups`

`id`, `follow_up_kind` (`question`/`waiting`/`postponed`/`review`), `text`, `status` (`open`/`resolved`/`deferred`/`expired`), `evidence` (nullable, single item), plus shared fields, plus a nullable `resolution` sub-structure: `resolved_at`, `resolved_by`, `resolution_source_reference` (its own `conversation_id`/`message_id`/`recommendation_id`/`event_id` sub-fields), `resolution_note` (nullable).

### 4.3 `glassmind_deferred_decisions`

`id`, `title`, `detail`, `status` (`waiting`/`deferred`/`completed`/`info`), `evidence` (nullable, single item), plus shared fields, plus the same nullable `resolution` sub-structure as §4.2.

### 4.4 `glassmind_approval_waiting_states`

`id`, `title`, `detail`, `status` (`awaiting`/`approved`/`deferred`/`rejected`), `evidence` (nullable, single item), plus shared fields, plus a nullable `update` sub-structure: `updated_at`, `update_source_reference` (same shape as `resolution_source_reference`), `resolution_note` (nullable). Named `update`, not `resolution`, matching `types.ts`'s `LifecycleUpdate` — approvals can change status more than once, per the existing type's own documentation comment.

### 4.5 Evidence Storage

Per `Glassmind-Durable-Adapter-Design.md` §10: `evidence` is small, never independently queried, and read back wholesale alongside its parent record — store it as a JSON/array column, not a normalized join table. `ConversationTurnRecord.evidence` is an array (`EvidenceLink[]`); the other three kinds carry at most one (`EvidenceLink | undefined`). Each `EvidenceLink` is `{ label, page, selection? }` — `selection` itself a small string-keyed record, also stored as JSON.

## 5. Required Indexes

Per the six dimensions named in this sprint's task, applied to each of the four tables:

1. **`sourceReference`** — index on each of `source_reference.conversation_id`, `source_reference.message_id`, `source_reference.recommendation_id`, `source_reference.event_id` individually (or a composite, depending on the eventual technology's query planner), since `retrieveBySourceReference` matches on any one populated field, per `InMemoryGlassmindStore`'s/`recordMatchers.ts`'s existing `matchesSourceReference` logic.
2. **`scope`** — composite index on `(scope.entity_kind, scope.entity_id)`, since `retrieveByScope` always queries both together.
3. **Record type/category** — implicit, since each kind has its own table (§3); not a column to index. If a future schema revision ever unifies these into one table, this becomes a required indexed discriminant column at that point, not before.
4. **`status`** — indexed per table. No current `GlassmindStore` method queries by status alone, but per `Glassmind-Durable-Adapter-Design.md` §11's own reasoning, this index costs little to add now and avoids a painful migration if/when a status-scoped query method is added later.
5. **`createdAt`** — `occurred_at` indexed per table, supporting the recency bound `Glassmind-Retrieval.md` §2 requires every query to respect, even though no current method filters by it explicitly.
6. **`updatedAt`** — the lifecycle timestamp (`resolution.resolved_at` for follow-ups/decisions, `update.updated_at` for approvals) indexed per table, for the same forward-looking reason as `status`.

## 6. Provenance Constraints

Restating `Glassmind-Durable-Adapter-Design.md` §8 at the schema level, precisely: every row in every one of the four tables must have at least one of its four `source_reference` sub-fields non-null. Wherever the eventual technology supports it natively (a `CHECK` constraint, a document-validation rule, an equivalent), this should be expressed as a real, enforced constraint — not only as the existing `assertValidSourceReference` application-level check in `DurableGlassmindStore`. This is the single requirement every Glassmind document in this repo has repeated without exception; this schema plan repeats it once more because it is precisely the kind of requirement that's easy to specify and easy to silently drop during actual schema/migration authoring.

Lifecycle sub-structures (`resolution`/`update`) carry their own, separately-validated source reference (`resolution_source_reference`/`update_source_reference`) — when populated, that sub-structure's reference must also satisfy the same non-null-of-four-fields rule, independent of the row's primary `source_reference`. A constraint covering only the primary `source_reference` and not the lifecycle one would leave a real gap.

## 7. Why Raw EventStore Payloads Are Not Stored

No table in §3 has a `payload`/`event_data`/similarly-shaped column anywhere. Per `Glassmind-Architecture.md` §5 and `Glassmind-Durable-Adapter-Design.md` §12: a record's `source_reference.event_id` is a pointer to the real CommandCore EventStore event — Glassmind indexes that event's existence and relevance, it never copies its contents. This is not a storage-efficiency choice; it is the boundary that keeps Glassmind from quietly becoming a second copy of CommandCore's event history, which would blur exactly the "Glassmind remembers, CommandCore is the source of truth" line every governing document in this repo draws. If a future, separate, reviewed decision ever needs to denormalize some small derived fact from a payload for query convenience, that fact becomes its own named, intentional column — never a generic payload blob.

## 8. Where Migrations Should Live For Now

Inside `apps/glassmind`, consistent with `Glassmind-Persistence-Runtime-Decision.md` §6's recommendation that the driver skeleton (and by extension its schema) stays in this package until a production runtime owner is decided. A `apps/glassmind/migrations/` directory (not created by this document) is the proposed convention-level location; the specific migration tool/format (raw SQL files, an ORM's migration generator, a schema-as-code tool) is unresolved per §9, since it depends on the still-undecided database technology.

## 9. What Remains Unresolved Until DB/Runtime Is Chosen

- **Exact column types** — string length limits, timestamp precision/timezone handling, JSON column type versus a normalized sub-table for `evidence`/`source_reference`/`resolution`/`update` (this plan recommends nested-JSON per §4.5 and §6, but a relational technology might make a different tradeoff reasonable).
- **Exact index implementation** — a composite index, a partial index, a covering index — technology-specific, and only decidable once §1 of `Glassmind-Persistence-Runtime-Decision.md`'s referenced runtime/technology decision exists.
- **Migration tooling** — which tool generates/applies migrations, and in what format (§8).
- **Connection pooling and concurrency behavior** — relevant to `Glassmind-Durable-Adapter-Design.md` §14's "concurrent lifecycle update" test requirement, which cannot be implemented meaningfully until a real technology with real concurrency semantics is chosen.
- **Whether this schema lives in a database shared with other CommandCore-adjacent data, or its own dedicated database** — affects naming conventions (the `glassmind_` prefix in §3 anticipates a shared database, but a dedicated one might not need it) and is itself downstream of the runtime-ownership question `Glassmind-Persistence-Runtime-Decision.md` §4 explicitly defers.

## 10. Test Database Strategy

Also unresolved in its specifics, but the requirements are clear regardless of technology:

- **Isolated.** Tests must not share state with each other or with any real/shared environment — each test (or test file) starts from a known-empty state.
- **Fast.** Contract-parity testing (`glassmindStoreParity.test.ts`'s existing pattern) already runs in milliseconds against the in-memory driver; a real-database test run should not become the slow part of this package's test suite, ruling out, for example, spinning up a fresh container per individual test case rather than per test run.
- **Reset-capable.** Whatever isolation mechanism is chosen (transaction-per-test rollback, a containerized instance wiped between runs, an in-memory mode the real technology itself offers) must make `glassmindStoreParity.test.ts`'s existing assumption — that each test starts clean — hold true for the real driver exactly as it already holds for `InMemoryGlassmindPersistenceDriver`.
- **CI-compatible.** Whatever local development requires (a running database process) must also be reproducible in whatever CI environment eventually runs this package's tests — not specified further here since no CI pipeline exists yet for this repo's TypeScript packages.

Selecting the actual mechanism (a specific test-containers library, an in-memory mode of the chosen database, a hosted ephemeral instance) is deferred to whichever Sprint 12 item implements the real `DatabaseGlassmindPersistenceDriver`'s real-database test coverage — this section specifies the requirements that selection must satisfy, not the selection itself.

## 11. Cross-References

- `docs/architecture/Glassmind-Durable-Adapter-Design.md` §10-11 — the logical shape and indexing rationale this plan makes concrete.
- `docs/architecture/Glassmind-Persistence-Runtime-Decision.md` — the runtime-ownership deferral this plan's §8 migration-location recommendation depends on.
- `apps/glassmind/src/types.ts` — the authoritative field source for every table in §4.
- `docs/architecture/Glassmind-Architecture.md` §5 — the no-payload-duplication rule §7 restates.
- `docs/roadmap/Sprint-12-Implementation-Plan.md` §3 items 2, 5 — the schema/migration-location and storage-layer-provenance-test items this plan informs.
