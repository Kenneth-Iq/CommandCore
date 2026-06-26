# Agent Commands Architecture (Beta-2)

## 1. Purpose

Defines the command surface for agent assignment and runtime control from Nexus. Specializes the general Command model from the Write Capability Architecture for the Agent entity.

## 2. Current State (Beta-1)

Agent Centre is read-only: agent profiles, active/idle/failed sections, assignment history, and execution history are all derived from `/dashboard/agents`. Agent `runtime_status` (available/busy/offline) is observed, never set, by Nexus today.

## 3. Proposed Command Set

- **AssignAgent** — assigns a specific agent to a mission (and optionally a task within it), validated against the agent's current `runtime_status` (must be `available`) and capability match against the mission's `capability_ids`.
- **UnassignAgent** — the compensating action for `AssignAgent`; returns the agent to `available` and clears the mission's `assigned_agent_id` if the assignment had not yet started executing.
- **SetAgentAvailability** — a narrower command allowing an operator to manually mark an agent `offline` (e.g., for maintenance) or back to `available`; does not allow setting `busy`, which remains a runtime-derived state from actual execution, never operator-set.

## 4. Validation and Policy

- `AssignAgent` must reject assignment to an agent that is not `available`, or whose `capability_ids` do not cover the mission's required `capability_ids` — these are validation failures, not policy warnings, because they represent an impossible assignment rather than a risky one.
- Double-assignment (a mission already having an `assigned_agent_id`, or an agent already committed elsewhere) is a validation failure unless the command explicitly requests reassignment, which should be a distinct, more visible action than a plain `AssignAgent` retry.
- `SetAgentAvailability` going to `offline` should be checked against any in-flight executions for that agent; the command either fails if executions are in-flight or requires an explicit "force" flag that is itself a higher-risk, more-confirmed action per the UI confirmation pattern.

## 5. UI Surface

- `AssignAgent` is surfaced from both directions: from a mission's detail view ("Assign an agent to this mission") and from an agent's detail view ("Assign this agent to a mission"), but both submit the identical command — the UI entry point differs, the command does not.
- The existing Agent Capability Graph (Enterprise Relationships work) should drive the candidate-agent list in the `AssignAgent` form, so the picker only ever shows agents whose capabilities actually match, rather than a flat list of all agents.
- `UnassignAgent` and `SetAgentAvailability` appear as contextual actions on the agent detail view only.

## 6. Dependencies

- Depends on: Authentication Architecture, Permissions Architecture, Write API Architecture.
- Related: Mission Commands Architecture (assignment is symmetric with mission state), Workflow Engine Architecture (if multi-agent orchestration changes what "assignment" means).

## 7. Risks

- If Odysseus-style multi-agent orchestration lands later, a single `assigned_agent_id`-per-mission command model may need to be extended to multiple concurrent assignments per mission — this document's schema should be revisited at that point, not assumed to be final.
- Manual `SetAgentAvailability` changes must be clearly distinguished in the UI from runtime-derived status, or operators will be confused about which states are "real" and which are operator-asserted.
