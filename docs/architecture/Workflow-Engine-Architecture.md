# Workflow Engine Architecture (Beta-2)

## 1. Purpose

Defines how multi-step or multi-agent operational sequences are represented and executed, extending beyond the single-command model defined in the Write Capability Architecture. This is the architectural seed for Odysseus-style multi-agent planning referenced in the Beta-2 Backlog, scoped here only as the engine/data-model question, not the planning intelligence itself.

## 2. Current State (Beta-1)

There is no workflow concept. A mission has at most one `assigned_agent_id` and an implicit task list (`task_count`); there is no representation of ordering, dependency, or parallelism between tasks or between missions today.

## 3. Proposed Architecture

- **Workflow as a graph, not a queue**: a workflow is a directed graph of steps, where each step is either a single Command (Mission/Agent/Tool Commands) or a reference to a sub-workflow. Steps declare their dependencies explicitly (which prior steps must complete first), rather than relying on submission order.
- **Workflow instance vs. definition**: a workflow *definition* is a reusable template (e.g., "standard recovery sequence"); a workflow *instance* is a specific run of that template against specific entities (a specific mission, specific agents). Definitions are versioned; instances reference the definition version they were started from.
- **Execution is event-driven**: each step's completion is observed as a domain event (the same EventBus/EventStore already used everywhere else), which triggers evaluation of whether the next step(s) are now eligible to run. The Workflow Engine does not poll; it reacts.
- **Parallelism is explicit, not implicit**: steps with no dependency relationship between them may execute in parallel, but this is a property of the graph the workflow author defined, not an engine optimization applied automatically.

## 4. Relationship to Mission/Agent/Tool Commands

- The Workflow Engine does not introduce new low-level commands. It orchestrates submission of the existing Mission/Agent/Tool commands as workflow steps, in the order and under the conditions the workflow graph specifies.
- A workflow step that fails does not automatically retry or compensate; failure handling (retry, skip, abort the whole workflow) is itself part of the workflow definition, not a hidden engine default.

## 5. Key Decisions / Open Questions

- Whether workflow definitions are authored as data (a declarative graph format) or as code — declarative is strongly preferred so workflows can be reviewed, versioned, and audited the same way other CommandCore contracts are, rather than requiring a deployment to change.
- How far this engine needs to go before Odysseus-style autonomous planning (an agent or model proposing a workflow graph rather than a human authoring one) is layered on top — this document only covers the execution engine; planning intelligence is explicitly out of scope here.

## 6. Dependencies

- Depends on: Write API Architecture, Mission Commands, Agent Commands, Tool Commands (the engine orchestrates these, so their schemas must be stable first).
- Related: Approval Engine Architecture (a workflow step that requires approval pauses the whole workflow at that point, not just that step in isolation, unless the workflow explicitly allows continuing other parallel branches).

## 7. Non-Goals

- This document does not specify Odysseus's planning intelligence (how a workflow graph gets proposed). It specifies only how an already-defined graph gets executed, tracked, and audited.

## 8. Risks

- Building a fully general workflow engine before any real multi-step operational sequence exists in CommandCore risks over-engineering against speculative requirements; the first version should be scoped to the smallest graph shape that covers one real recovery or mission-orchestration scenario, not a maximally general DAG engine.
- Workflow state must be reconstructable from EventStore exactly like every other piece of kernel state — a workflow engine with its own separate persistence would violate the single-source-of-truth principle established in the Write Capability Architecture.
