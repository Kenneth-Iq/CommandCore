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

## What this is not (yet)

- Not connected to the Nexus frontend (`apps/nexus-console`) — no import in
  either direction.
- Not connected to CommandCore's kernel (`core/`) — no ingestion path is
  modeled in this skeleton. A real ingestion implementation (reading from the
  CommandCore EventStore) is later work per `Glassmind-Ingestion.md`.
- Not durable — `InMemoryGlassmindStore` loses everything on process exit.
  A persistent implementation of the same `GlassmindStore` interface is a
  separate, later task; the storage technology is deliberately unselected
  per `Sprint-10-Implementation-Plan.md` §4.
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

## Commands

```
npm install
npm test    # vitest run
npm run build  # tsc -b
```
