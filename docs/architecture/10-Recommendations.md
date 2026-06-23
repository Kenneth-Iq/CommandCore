# 10 - Recommendations

## Recommendation Principles

These recommendations document next engineering moves without redesigning the architecture and without deleting functionality.

## Module: Documentation and Naming

### Purpose

Help future engineers understand the Jarvis-to-CommandCore transition.

### Responsibilities

- Clarify current reality.
- Preserve legacy history.
- Explain future naming direction.

### Dependencies

- README, legacy docs, blueprint docs, architecture docs.

### Strengths

- Strong phase documentation already exists.

### Weaknesses

- README paths and product naming are stale relative to current docs.

### Should Keep

- Legacy docs as historical record.

### Should Improve

- Add a documentation index.
- Add a naming compatibility map.
- Update references only in a documentation task.

### Should Replace

- Replace stale doc links with current paths while preserving old docs.

## Module: Core Stability

### Purpose

Make the existing Core easier to maintain.

### Responsibilities

- Protect current API behavior.
- Make schema and event contracts clearer.

### Dependencies

- FastAPI app, Ledger, EventHub, tests.

### Strengths

- Core behavior is already testable.

### Weaknesses

- Schema and event contracts are implicit.

### Should Keep

- Current REST routes and WebSocket protocol.

### Should Improve

- Add event catalog and database schema docs.
- Add versioned migrations.
- Add authentication before any remote exposure.

### Should Replace

- Replace inline migrations with migration files or a migration module.

## Module: Desktop Maintainability

### Purpose

Reduce maintenance risk in the Electron app.

### Responsibilities

- Keep UI, IPC, integrations, and fallback loop understandable.

### Dependencies

- Main process modules, preload bridge, renderer components.

### Strengths

- Existing UI surfaces are functional and broad.

### Weaknesses

- IPC and state ownership are too concentrated.

### Should Keep

- Overlay, expanded panel, Command Bridge, Core fallback.

### Should Improve

- Document IPC channels by domain.
- Centralize renderer mission state.
- Add smoke tests for app startup and Core connection.

### Should Replace

- Replace monolithic IPC registration with domain registration modules when editing this area.

## Module: Capability Preservation

### Purpose

Ensure future CommandCore work preserves current capabilities.

### Responsibilities

- Carry forward mission orchestration, voice, integrations, local memory, research, approvals, audit, schedules, and desktop UX.

### Dependencies

- All current modules.

### Strengths

- Current system already has many useful capabilities.

### Weaknesses

- Capabilities are scattered across Core and desktop fallback.

### Should Keep

- All existing capabilities.

### Should Improve

- Inventory capabilities in a machine-readable registry later.

### Should Replace

- Replace scattered capability discovery with documented module ownership.

## Module: Safety and Operations

### Purpose

Preserve operator safety as the system grows.

### Responsibilities

- Maintain approvals, audit, sandbox, credentials, and local-first behavior.

### Dependencies

- Core tiers, desktop tool registry, credentials, Docker defaults.

### Strengths

- Safety was designed into both Core and desktop fallback.

### Weaknesses

- Safety semantics are duplicated and not fully unified.

### Should Keep

- Tiered approvals.
- Localhost service defaults.
- Credential encryption.

### Should Improve

- Define one canonical permission-tier table.
- Document production versus local trust boundaries.

### Should Replace

- Replace duplicated tier definitions with a shared specification before adding more runtimes.

## Module: Future Work Guardrails

### Purpose

Guide future contributors without redesigning now.

### Responsibilities

- Measure changes against documented reality.
- Preserve existing behavior until intentionally migrated.

### Dependencies

- Architecture docs, tests, PRD, blueprint.

### Strengths

- The repo has a clear working spine.

### Weaknesses

- New CommandCore direction is broader than current Jarvis implementation.

### Should Keep

- Current system as the operational foundation.

### Should Improve

- Introduce CommandCore concepts through adapters and docs before large rewrites.
- Expand tests around behavior before refactoring.

### Should Replace

- Replace assumptions, not functionality: hard-coded names, paths, duplicated contracts, and implicit setup should become explicit contracts over time.
