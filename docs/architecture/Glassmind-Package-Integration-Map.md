# Glassmind Package Integration Map

## 1. Purpose

`apps/glassmind` exists today as a standalone, unconnected TypeScript package — confirmed in `docs/engineering/Glassmind-Contract-Review.md` to have zero dependency on `apps/nexus-console` or `core/` in either direction. This document defines how it should eventually connect to the rest of CommandCore without breaking the boundaries `Glassmind-Architecture.md` and its companion documents already established. It is a map, not an implementation — no integration happens as part of this document.

## 2. Current Status

`apps/glassmind` is a standalone TypeScript package with:

- Type contracts for four Phase 1 record kinds (`Glassmind-Phase-1-Storage-Design.md` §4-7).
- A `GlassmindStore` interface and one implementation, `InMemoryGlassmindStore` — development/testing only, no persistence.
- No import from or to `apps/nexus-console`, no import from or to `core/`.
- No ingestion path, no real conversation engine wired to it, no Nexus UI reading from it.

It is, functionally, a library sitting on the shelf. Nothing in CommandCore, Jarvis, or Nexus currently calls it.

## 3. What May Import Glassmind Later

Once the gaps in `Glassmind-Contract-Review.md` §13 are closed and a durable `GlassmindStore` implementation exists (not in scope here — see `Sprint-10-Backend-Implementation-Backlog.md`):

- **The Jarvis conversation engine** (§5) — the primary, intended consumer. Calls `GlassmindStore`'s record/retrieve methods as part of turn resolution.
- **A future CommandCore ingestion adapter** (§6) — writes into `GlassmindStore` based on EventStore activity. This adapter may live inside `core/` (Python) calling out to a Glassmind service boundary, or inside a new service wrapping `apps/glassmind` — the exact shape is an implementation decision for the backlog, not fixed here.
- **Nexus, read-only** (§5) — once a real backend exists behind `GlassmindStore`, Nexus's evidence-layer components (`EvidenceExplorer`, `EntityEvidencePanel`, and similar) may read Glassmind-backed records the same way they read CommandCore dashboard data today: via a read API, never by importing `apps/glassmind`'s TypeScript directly into the browser bundle.

## 4. What Must Not Import Glassmind Yet

- **`apps/nexus-console` must not import `apps/glassmind` today.** No frontend component, hook, or page should add a dependency on this package until a real backend-hosted `GlassmindStore` implementation exists and a deliberate integration decision is made. Importing the in-memory store into the browser today would silently violate "Glassmind is memory and retrieval, not live operational state" by giving the frontend a second, disconnected, per-tab copy of memory that looks real but isn't.
- **`core/` must not import `apps/glassmind` today**, for the same reason in the other direction — CommandCore's Python kernel has no TypeScript runtime to import this package into in the first place, and any cross-language bridge is itself an integration decision not yet made.
- **No write path from Glassmind back into CommandCore**, ever, regardless of how integration eventually happens. This is not a "not yet" — it is permanent, per the architecture rules this document reaffirms in §10.

## 5. How Jarvis Should Use Glassmind

Per `Jarvis-Conversation-Engine-Boundary.md` §3 and §6: the conversation engine calls `GlassmindStore.retrieveBySourceReference`/`retrieveByScope` during turn resolution's retrieval stage, and calls `recordConversationTurn` (plus, once added per the Contract Review, the appropriate status-mutation method) after a turn resolves. The engine never queries Glassmind for *current* state — missions, agents, tools, approvals stay live CommandCore queries. Glassmind only answers "what do we remember about this," never "what is true about this right now." If a retrieval call returns an empty result, the engine must say so plainly ("I don't recall discussing this") rather than treating the empty result as license to guess.

## 6. How Nexus May Display Glassmind Evidence

Once a real backend exists, Nexus may *display* Glassmind-backed memory (e.g., `EntityEvidencePanel`'s "Related Evidence" section showing past conversation turns about an entity) through the same read-only pattern every other Nexus dashboard already follows: a read API call, rendered, never mutated from the UI. **Nexus must never write to Glassmind.** There is no "pin this in Glassmind" button, no "edit this memory" form, no Nexus-originated write call of any kind into `GlassmindStore`. The existing frontend's `usePinnedConversations`/`useConversationLog` hooks are a *local simulation* of what pinning will eventually mean (per `Glassmind-Conversations.md` §3) — when real, a pin becomes an *ingestion signal* the conversation engine or a dedicated explicit-action endpoint records, not a direct Nexus-to-Glassmind write.

## 7. How CommandCore EventStore Becomes The Source Of Ingestion

Per `Glassmind-Ingestion.md` §2, Phase 1 ingestion has exactly two sources: the CommandCore EventStore and explicit user action. Concretely for `apps/glassmind`'s eventual wiring:

- A future ingestion adapter subscribes to relevant CommandCore EventStore event types (not all events — per `Glassmind-Ingestion.md` §2's relevance filter) and calls the appropriate `GlassmindStore.record*` method with a `sourceReference.eventId` pointing at the real event.
- This adapter is a consumer of `GlassmindStore`'s write methods, architecturally identical in shape to how the conversation engine writes conversation turns — there is no second, special ingestion-only write path; both flow through the same `GlassmindStore` contract.
- This adapter never reads CommandCore state in order to write it *back* to CommandCore — it only ever reads CommandCore to write *into* Glassmind. The arrow points one way.

## 8. Approval/Follow-Up/Decision Data Stays Authoritative In CommandCore

Restating `Glassmind-Architecture.md` §2/§5 and `Glassmind-Phase-1-Storage-Design.md` §3's ownership table precisely for integration purposes: once a real Approval Engine, follow-up tracker, or decision tracker exists in CommandCore, that system remains the single source of truth for an item's *current* status. Glassmind's `ApprovalWaitingStateMemoryRecord`/`FollowUpMemoryRecord`/`DeferredDecisionMemoryRecord` are CommandCore's history as Glassmind remembers it — useful for "what was the status when this was discussed," not for "what is the status right now." Any future integration that lets Glassmind's copy of a status silently diverge from CommandCore's live status is a bug, not a feature; per the Contract Review §6, this is exactly why status-mutation methods need to exist and need to be called by whatever process is told the real status changed, not inferred independently inside Glassmind.

## 9. First Safe Integration Point

The lowest-risk, smallest-surface-area first integration step, once the Contract Review's four follow-up items are closed:

**Wire a durable `GlassmindStore` implementation behind the conversation engine's follow-up/decision/approval write paths only — not conversation turns, and not Nexus reads — as the first real integration.** This is deliberately narrower than "integrate Glassmind": it tests the write path, the provenance gate, and the status-mutation methods against real (if still simulated-adjacent) data, without yet exposing any new read surface to Nexus or changing how Jarvis composes a response. Conversation-turn recording and Nexus evidence display both have higher blast radius (turns are higher-volume; Nexus changes are user-visible) and should follow only once this narrower first step is proven.

## 10. Explicit Non-Goals

Repeated here because they are exactly the kind of scope this document's own existence could otherwise be read as inviting:

- **No vector search.** Not part of any integration step this document describes. Per `Glassmind-Version-Roadmap.md`, this is Phase 3 (v0.9) at the earliest.
- **No semantic memory.** Same — Phase 3 (v0.10).
- **No frontend `localStorage` migration yet.** `useConversationLog`/`usePinnedConversations` stay exactly as they are until a durable backend exists and a deliberate migration step is planned and executed — see `Sprint-10-Backend-Implementation-Backlog.md`'s migration-plan item. This document does not authorize starting that migration.
- **No production database adapter yet.** `InMemoryGlassmindStore` remains the only implementation until a separate, deliberate piece of work selects and builds a durable one. This document does not select a storage technology.

## 11. Cross-References

- `docs/engineering/Glassmind-Contract-Review.md` — the gaps this map's §9 first-integration-point recommendation depends on being closed first.
- `docs/architecture/Glassmind-Architecture.md`, `Glassmind-Ingestion.md`, `Glassmind-Memory-Model.md` — the ownership and ingestion rules §6-§8 restate for integration purposes.
- `docs/architecture/Jarvis-Conversation-Engine-Boundary.md` — the conversation-engine usage pattern §5 follows.
- `docs/architecture/Hermes-Scope-Decision.md` — the most recent prior example of this repo's discipline around explicit non-adoption/non-integration statements, which §10 follows the same spirit of.
- `docs/roadmap/Sprint-10-Backend-Implementation-Backlog.md` — where this map's integration sequencing becomes concrete backlog items.
