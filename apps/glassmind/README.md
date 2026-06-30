# @commandcore/glassmind

Glassmind Phase 1 type contracts and an in-memory store skeleton, implementing
`docs/architecture/Glassmind-Phase-1-Storage-Design.md` exactly.

## What this is

- Pure TypeScript, no framework, no database, no embeddings, no vector or
  semantic memory (Phase 1 excludes all of those per the storage design's
  non-goals section).
- A `GlassmindStore` interface (`src/store.ts`) and a development/testing-only
  `InMemoryGlassmindStore` implementation (`src/inMemoryStore.ts`) that enforces
  provenance as a hard gate: any write whose `sourceReference` has every field
  empty throws `InvalidSourceReferenceError`.
- Three lifecycle methods — `resolveFollowUp`, `resolveDeferredDecision`,
  `updateApprovalWaitingState` — that mutate an existing record's status and
  attach resolution/update metadata (`LifecycleResolution`/`LifecycleUpdate`
  in `src/types.ts`). They never touch a record's original `sourceReference`;
  they require and validate their own resolution/update source reference
  (also enforced via `InvalidSourceReferenceError`) and reject an unknown id
  via `RecordNotFoundError` rather than silently creating a new record.
  `FollowUpMemoryRecord`/`DeferredDecisionMemoryRecord`'s old `resolvedAt?`
  field was replaced by a structured `resolution?: LifecycleResolution`
  field; `ApprovalWaitingStateMemoryRecord`'s old `resolvedAt?` field was
  replaced by `update?: LifecycleUpdate`.
- A durable adapter **skeleton**, `DurableGlassmindStore` (`src/durableStore.ts`),
  implementing the same `GlassmindStore` interface behind an injected
  `GlassmindPersistenceDriver` (`insertRecord`/`updateRecord`/`findById`/
  `findBySourceReference`/`findByScope`). With no driver configured (the
  default), every method throws `GlassmindPersistenceNotConfiguredError`
  rather than connecting to a real database. Provenance and not-found
  rejection happen in this class, before the driver is ever called — see
  `docs/architecture/Glassmind-Durable-Adapter-Design.md`.
- An EventStore ingestion adapter **skeleton**, `EventStoreIngestionAdapter`
  (`src/eventStoreIngestion.ts`), accepting a structurally-typed
  `GlassmindIngestionEvent` (not imported from CommandCore), a caller-supplied
  eligibility predicate, and a caller-supplied record builder. Not connected
  to any real EventStore — no subscription loop, no default eligibility (so
  nothing is ingested unless the caller explicitly opts an event in). Never
  copies `event.payload` into a produced record.
- A **concrete** persistence driver, `InMemoryGlassmindPersistenceDriver`
  (`src/durableStore.ts`), implementing `GlassmindPersistenceDriver` as a
  dumb, business-logic-free CRUD store (no provenance checks — those stay in
  `DurableGlassmindStore`). Still not a real database; this is the first real
  realization of the driver interface, proving the architecture's split
  between rules and storage holds. `src/glassmindStoreParity.test.ts` runs
  the same contract scenarios against `InMemoryGlassmindStore` and
  `DurableGlassmindStore` + `InMemoryGlassmindPersistenceDriver` together,
  per `docs/architecture/Glassmind-Durable-Adapter-Design.md` §14's
  contract-parity requirement.
- A CommandCore EventStore bridge **skeleton**, `DefaultCommandCoreEventBridge`
  (`src/commandCoreEventBridge.ts`), converting a structurally-typed
  `CommandCoreEventEnvelope` (not imported from `core/`) into the
  `GlassmindIngestionEvent` shape `EventStoreIngestionAdapter` already
  consumes. Conversion only — no subscription, no polling, no write back
  toward CommandCore. Data flow stays one-directional: CommandCore/EventStore
  → Glassmind.
- A database-backed persistence driver **skeleton**, `DatabaseGlassmindPersistenceDriver`
  (`src/databaseDriver.ts`), adapting an injected `DatabaseClient`
  (`insert`/`update`/`findById`/`findBySourceReference`/`findByScope`) to the
  existing `GlassmindPersistenceDriver` contract. Pure delegation only — no
  provenance checks, no business logic, no enrichment of any record; those
  stay in `DurableGlassmindStore`, exactly as for `InMemoryGlassmindPersistenceDriver`.
  Ships with **no concrete `DatabaseClient` implementation** and **no real
  database connection** — tests use a fake client only, per
  `docs/architecture/Glassmind-Persistence-Runtime-Decision.md` and
  `docs/architecture/Glassmind-Schema-Migration-Plan.md`, which defer the
  actual database technology choice. `glassmindStoreParity.test.ts`'s
  contract-parity suite includes this driver (behind a fake client) as a
  third implementation, alongside `InMemoryGlassmindStore` and
  `InMemoryGlassmindPersistenceDriver`.
- A first safe ingestion path **skeleton**, `SafeIngestionPath`
  (`src/safeIngestionPath.ts`), composing `CommandCoreEventBridge.convert`
  and `EventStoreIngestionAdapter.ingest` and nothing else — no new
  eligibility rule, no new provenance handling, no payload access of its
  own. Per `docs/architecture/CommandCore-EventStore-Bridge-Runtime-Decision.md`
  §5, this is what a future runtime would call per envelope; it has no
  subscription, polling loop, or production wiring (verified by a dedicated
  structural test asserting its only methods are `process`/`processBatch`).
- A real, **dev/test-scoped** persistence driver, `SqliteGlassmindPersistenceDriver`
  (`src/sqliteDriver.ts`), backed by `sql.js` (pure WASM SQLite, no native
  compilation — matching the existing precedent in `app/package.json`), per
  `docs/architecture/Glassmind-DB-Technology-Decision.md`. This is real,
  working SQL against a real SQLite database — real tables, real indexes,
  real `CHECK` constraints (`migrations/001_glassmind_phase_1.sql`) — not a
  fake or simulation. Like the other drivers, it performs no provenance
  validation of its own; `DurableGlassmindStore` remains the sole business
  gate. `createSqliteDriver()` creates a fresh, **in-memory** database with
  the migration already applied — no file is created or touched on disk, so
  every test is fully isolated with no cleanup step. `glassmindStoreParity.test.ts`'s
  contract-parity suite includes this driver as a fourth implementation.
  See "Running the SQLite-backed tests locally" below.
- A Jarvis-read **dev/test harness**, `src/jarvisSqliteReadHarness.test.ts`,
  proving the full chain — fake `CommandCoreEventEnvelope` through
  `SafeIngestionPath` into a real, SQLite-backed `DurableGlassmindStore` —
  is then readable by a Jarvis-shaped consumer. Does not import
  `apps/jarvis-engine` (the two packages have no shared workspace tooling
  and incompatible `tsconfig.json` `rootDir` settings); instead it mirrors
  `apps/jarvis-engine`'s real `retrieveMemory`/`GlassmindReadOnlyMemoryAdapter`
  contract locally, per the same "declare structurally independent rather
  than cross-package import" precedent used throughout this repo.

## What this is not (yet)

- Not connected to the Nexus frontend (`apps/nexus-console`) — no import in
  either direction.
- Not connected to CommandCore's kernel (`core/`) — no import of `core/`
  exists anywhere in this package (verified by a dedicated test in
  `commandCoreEventBridge.test.ts`), and nothing subscribes
  `EventStoreIngestionAdapter`/`DefaultCommandCoreEventBridge` to a real
  EventStore. Both are conversion/ingestion skeletons only.
- Not durable in production — `InMemoryGlassmindStore` and
  `InMemoryGlassmindPersistenceDriver` both lose everything on process exit,
  and `SqliteGlassmindPersistenceDriver` defaults to an **in-memory** SQLite
  database that is also lost on process exit (a test-file-backed instance is
  possible but not the default — see `createSqliteDriver`'s `seed`
  parameter). SQLite here is a deliberate **dev/test** technology choice,
  per `docs/architecture/Glassmind-DB-Technology-Decision.md` §4 — it is
  explicitly not the production database decision, which remains
  deliberately deferred until a production runtime owner is selected, per
  `docs/architecture/Glassmind-Persistence-Runtime-Decision.md`.
- Not authoritative for current operational state — the lifecycle methods
  update Glassmind's own remembered copy of a follow-up/decision/approval's
  status. They never call out to anything outside this package, and in
  particular never write back into CommandCore. Once a real Approval Engine
  exists, CommandCore's live state remains the source of truth; Glassmind
  only remembers what it was told.

## Why this lives under `apps/`

This repo's `services/` directory is used for gitignored runtime sandboxes of
other deployed services (`core-data`, `odysseus`), not tracked TypeScript
source. `core/` is CommandCore's Python kernel. `apps/nexus-console` is the
only other buildable TypeScript package in this repo. This package sits
alongside it as a sibling app — backend-safe domain code, not frontend UI —
rather than inside either of those, so it stays both tracked and clearly
separate from the frontend it is not yet wired into.

## Running the SQLite-backed tests locally

No setup is required — `createSqliteDriver()` (`src/sqliteDriver.ts`) creates
a fresh, in-memory `sql.js` database per call and applies
`migrations/001_glassmind_phase_1.sql` automatically. There is no database
server to start, no connection string to configure, and no file left behind
on disk after a test run. `npm test` exercises `sqliteDriver.test.ts` and
`glassmindStoreParity.test.ts`'s SQLite-backed implementation entry exactly
like every other test in this package — no separate command or environment
variable is needed.

If a test ever needs to seed from a known starting database state, pass an
existing database's exported bytes (`db.export()`) as `createSqliteDriver`'s
optional `seed` parameter — not used by any current test, but supported for
that future case.

## Commands

```
npm install
npm test    # vitest run
npm run build  # tsc -b
```
