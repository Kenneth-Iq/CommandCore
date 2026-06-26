# Persistence Architecture (Beta-2)

## 1. Purpose

Defines how CommandCore moves from in-memory-first to durable state without compromising EventStore/AuditTrail as the source of truth. This directly expands Beta-2 Backlog item 3.3 and the persistence requirements already stated in the Write Capability Architecture (§8).

## 2. Current State (Beta-1)

CommandCore kernel is fully in-memory. All state (missions, agents, tools, conversations, knowledge assets, events, audit entries) is lost on process restart and reseeded from the demo seed script. This is acceptable for Beta-1 specifically because nothing in Beta-1 is operator-created.

## 3. Proposed Architecture

- **EventStore-as-source-of-truth**: the database is a projection rebuilt from EventStore, never an independently-written second source of truth. Every write to the database happens as a direct consequence of processing a domain event, not as a parallel write path from command handlers.
- **SQLite as the first persistence target**: per the Engineering Bible's remaining roadmap, SQLite is the most likely first step — sufficient for a single-instance deployment, no separate database server to operate, and a reasonable upgrade path to a networked database later if needed.
- **Two persisted layers, not one**: (a) an append-only events table mirroring EventStore exactly, and (b) one or more read-optimized projection tables mirroring today's in-memory registries (missions, agents, tools, etc.), rebuilt by replaying (a). Projection tables can be dropped and rebuilt from the event log at any time without data loss.
- **Replay-on-boot**: on startup, CommandCore rebuilds in-memory state by replaying persisted events, exactly as it does today from the seed script, except the events come from the database instead of a seed function. This keeps the in-memory kernel's read path completely unchanged.

## 4. Migration / Versioning

- Stored contract shapes (Mission, Agent, Tool, Conversation, KnowledgeAsset) need explicit schema versioning before any write path persists them, so a future contract change does not break replay of older events.
- Event payloads, once written, are never mutated in place — a contract change is handled by versioning the event type or payload shape going forward, with replay logic that understands both old and new shapes during any transition period.

## 5. Key Decisions / Open Questions

- Whether projection tables are written synchronously (within the same transaction as the event append) or asynchronously (eventually consistent) — synchronous is simpler to reason about and is the recommended starting point; asynchronous projection is an optimization to revisit only if write throughput becomes a real bottleneck.
- At what point (if ever) SQLite needs to be replaced with a networked database — explicitly deferred until a real multi-instance or high-availability requirement exists.

## 6. Dependencies

- Depends on: nothing within Stream D directly, but must land before Mission/Agent/Tool Commands ship to any environment where losing state on restart is unacceptable.
- Depended on by: Recovery Architecture (replay requires this), Workflow Engine Architecture (workflow instance state must survive restarts to be meaningful).

## 7. Risks

- This is explicitly flagged in the Beta-2 Backlog as a top risk: persistence added without clear replay/rebuild semantics lets the database and EventStore/AuditTrail drift out of sync. The architecture in §3 exists specifically to prevent that by construction.
- Introducing persistence at the same time as the first write commands compounds risk; the Write Capability Architecture's phased plan assumes a persistence decision lands before or alongside Phase 1, not after real write traffic already exists.
