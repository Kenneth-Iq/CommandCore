# Recovery Architecture (Beta-2)

## 1. Purpose

Defines how operators diagnose and recover from incidents once write capability exists, building on the Audit Trail and Event Store requirements already specified in the Write Capability Architecture. This is the "recovery" half of Beta-2 Backlog item 3.11; the read-only audit/replay viewer is its prerequisite, not part of this document.

## 2. Current State (Beta-1)

EventStore and AuditTrail exist as backend concepts with no dedicated recovery UI. Activity feeds across Nexus show recent events but offer no replay, no "what changed since X," and no compensating-action tooling.

## 3. Proposed Architecture

- **Incident framing, not just event browsing**: recovery tooling is scoped around a question an operator actually asks ("why did this mission fail," "what did this approval authorize," "what changed in the last hour") rather than a raw event log browser. The audit/replay viewer (Beta-2 Backlog 3.11) is the browsing layer; this document is the guided-diagnosis layer built on top of it.
- **Replay for understanding, not for re-execution**: replaying a stream of events reconstructs a point-in-time view of state for diagnosis. It never re-submits the underlying commands — replay is strictly read-only, even though the events it replays originated from writes.
- **Compensating action surfacing**: when an operator is looking at a failed or blocked entity, the recovery view should surface the relevant compensating commands already defined per entity (`CancelMission`, `UnassignAgent`, `CancelInvocation`, `UnlinkKnowledge`) rather than requiring the operator to know where to find them.
- **Blast-radius framing**: recovery views should lean on the same relationship/impact-analysis data already built in the Enterprise Relationships work (dependents, dependencies, related items) to show what else might be affected by a given incident, before an operator decides on a compensating action.

## 4. Key Decisions / Open Questions

- Whether recovery tooling is a dedicated Nexus page or a contextual panel that appears on existing entity detail views — likely contextual first (lower lift, reuses existing detail-view real estate), promoted to a dedicated page only if usage shows operators need a cross-entity incident view.
- How far "replay" goes — full event-sourced state reconstruction is the ideal, but a simpler "show me the ordered event timeline for this entity" may be sufficient for the first version and far cheaper to build.

## 5. Dependencies

- Depends on: Audit Trail and Event Store requirements (Write Capability Architecture §7–§8), the read-only audit/replay viewer (Beta-2 Backlog 3.11).
- Related: every Command architecture (Mission/Agent/Tool), since their defined compensating actions are what recovery tooling surfaces.

## 6. Risks

- Building recovery tooling before enough real write history exists makes design speculative; per the Write Capability Architecture's phased plan, this should be scoped only once Phases 1–5 have produced real incidents to design against.
- If recovery tooling allows anything beyond read-only replay plus explicitly-defined compensating commands, it risks becoming an unaudited backdoor mutation path, which would violate the no-write-without-audit principle everywhere else in this architecture.
