# Nexus Beta-2 Backlog

## 1. Purpose

This document captures the orchestration and write-capability work that is deliberately deferred out of Beta-1.

Beta-1 is a read-only, frontend-first operational visibility milestone. Nothing in this backlog should be pulled forward into Beta-1 without an explicit, separately scoped decision. The goal here is to record intent so Beta-1 can stay focused without losing track of what comes next.

## 2. Beta-1 Boundary Recap

Beta-1 deliberately excluded:

- auth
- database persistence
- write actions from the UI
- AI model calls
- real Hermes-Claw execution
- Odysseus planning
- production deployment

This backlog exists so that boundary can stay intact. Every item below assumes Beta-1's read-only, mock/live-fallback, frontend-first posture remains the baseline until Beta-2 is explicitly scoped.

## 3. Backlog Items

### 3.1 Write Actions From The UI

- Mission, agent, tool, and conversation pages currently only read and route. Beta-2 should introduce explicit write affordances (create, update, cancel) once the read-only surfaces are trusted.
- Every write affordance needs a corresponding read-only confirmation/preview step before commit, consistent with the UX review's "avoid premature control surfaces" guidance.
- Optimistic UI vs. server-confirmed UI needs a decision per write action; do not assume optimistic updates by default.

### 3.2 Auth And Role Permissions

- No authentication exists today. Beta-2 needs an identity layer before any write action is exposed.
- Role/permission model should map onto the existing `PermissionLevel` concept already present in agent and capability contracts, rather than inventing a parallel system.
- Decide whether auth is session-based, token-based, or delegated to an external identity provider before UI work starts.
- Settings page (currently a placeholder) is the natural home for session and role visibility.

### 3.3 Persistence / Database

- CommandCore kernel is in-memory first by design. Beta-2 needs a persistence decision (SQLite was previously flagged as the likely first step in the engineering bible's remaining roadmap).
- Event sourcing replay/rebuild semantics must be defined before persistence lands, so EventStore and AuditTrail remain authoritative rather than the database becoming a second source of truth.
- Migration/versioning strategy for stored contracts (Mission, Agent, Tool, Conversation, KnowledgeAsset) needs to exist before write paths can safely persist them.

### 3.4 Jarvis Command Execution

- Beta-1 shipped Jarvis as command routing and local search only (Locked Decision 7 from the UX review). Beta-2 is where actual command execution behavior would begin.
- Execution must stay deterministic and auditable before any AI-assisted interpretation is introduced; routing-first, intelligence-second.
- Needs a clear boundary between "Jarvis suggests" and "Jarvis executes" so operators are never surprised by a state change they didn't explicitly confirm.

### 3.5 Hermes-Claw Tool Execution

- Tool Centre currently exposes registry, permissions, and invocation history as read-only telemetry. Beta-2 is where real invocation would be enabled.
- Permission tiers (safe / restricted / privileged) must gate execution, not just labeling, once this lands.
- Needs explicit per-invocation approval for restricted/privileged tools at minimum; safe tools may warrant a lighter flow, but that should be a deliberate decision, not a default.

### 3.6 Odysseus Planning / Multi-Agent Orchestration

- No multi-agent planning exists yet; today's "agent assignment" is a single `assigned_agent_id` per mission.
- Beta-2 scoping should define how multi-agent plans are represented (task graphs, dependency ordering, parallelism) before any UI is built to visualize or control them.
- Mission Centre's existing timeline/outcomes-first structure should extend rather than be replaced when orchestration state is introduced.

### 3.7 Approval Workflows

- Executive Dashboard already surfaces policy warnings and blocks as read-only signals. Beta-2 needs an actual approve/deny interaction layer.
- Approval state needs to be modeled as a first-class auditable event (who approved what, when, under what policy), not a UI-only toggle.
- Should be designed jointly with Hermes-Claw tool execution and mission creation, since most approval gates will sit in front of those two paths.

### 3.8 Mission Creation

- Missions are currently read-only entities (seeded or live). Beta-2 needs a creation flow: title, scope, capability requirements, required output.
- Creation should reuse the existing `Mission` contract fields rather than introducing a parallel "draft mission" shape.
- Needs a decision on whether mission creation requires approval before entering the mission engine, or only before execution begins.

### 3.9 Agent Assignment From UI

- Assignment today is visible (assignment history, execution telemetry) but not actionable.
- Beta-2 UI should let an operator assign an agent to a mission/task, respecting agent availability (`runtime_status`) and capability matching that already exists in the data model.
- Needs a conflict-handling story for reassignment or double-assignment attempts.

### 3.10 Tool Invocation From UI

- Tool Registry and invocation history are read-only in Beta-1. Beta-2 needs an actual "invoke this tool" affordance.
- Input schema validation (tools already carry `input_schema`/`output_schema`) should drive the invocation form rather than a hand-rolled one.
- Ties directly into 3.5 (Hermes-Claw execution) and 3.7 (approval workflows) — should not be scoped in isolation.

### 3.11 Audit / Replay / Recovery UX

- EventStore and AuditTrail already exist as backend concepts (Engineering Bible §4) but have no dedicated UI beyond activity feeds.
- Beta-2 should add a real audit/replay viewer: filter by event type, source, correlation id, and time range, distinguishing EventStore (canonical history) from AuditTrail (operational/human-readable trace) per the Bible's explicit non-interchangeability rule.
- Recovery UX (e.g., "replay this mission's events to reconstruct state," "show what changed since this incident") is a distinct feature from plain audit browsing and should be scoped separately once basic replay viewing exists.

### 3.12 Production Deployment

- No deployment target, environment config strategy, or secrets handling exists yet; Alpha/Beta runbooks assume local or single-host operation.
- Beta-2 needs a decision on hosting model (self-hosted, container, managed) before any of the write-capable features above can go live safely.
- Observability (logs/metrics/tracing) for a deployed instance is a prerequisite, not a nice-to-have, given how central event-driven observability is to the product's identity.

## 4. Risks

- **Scope creep into Beta-1.** The biggest risk is informal pressure to "just add one write action" before auth and approval workflows exist. This backlog exists specifically to make that tradeoff visible rather than silent.
- **Write paths without audit parity.** If write actions ship before the audit/replay UX (3.11) is solid, operators lose the ability to understand what changed and why — directly undermining the product's "observability first" identity.
- **Permission model fragmentation.** If auth/roles (3.2) are designed independently from the existing `PermissionLevel` and capability certification concepts, CommandCore ends up with two incompatible permission systems.
- **Orchestration complexity outpacing UI.** Odysseus-style multi-agent planning (3.6) can become arbitrarily complex; UI work should follow a locked data model, not be designed speculatively ahead of it.
- **Persistence as a silent second source of truth.** If database persistence (3.3) is added without clear replay/rebuild semantics, EventStore/AuditTrail and the database can drift out of sync, which is explicitly called out as a risk in the Engineering Bible's event rules.

## 5. Prerequisites Before Beta-2 Scoping Begins

- Beta-1 must be stable, documented, and demo-ready (Wave 10 lock) before Beta-2 scoping starts in earnest.
- A persistence decision (3.3) should land before mission creation, agent assignment, or tool invocation are built, since all three need durable state beyond the current in-memory kernel.
- An auth/role decision (3.2) must precede any write affordance; no write action should ship to an unauthenticated surface.
- Audit/replay viewing (3.11, read-only half) should exist before approval workflows (3.7) ship, so operators can verify what an approval actually authorized.
- Each backlog item above should get its own focused milestone definition (scope, files affected, test plan) at Beta-2 kickoff, following the same milestone discipline used throughout Beta-1 — this document is intentionally a backlog, not a set of milestone specs.
