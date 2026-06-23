# Agent Domain

## Purpose

This document defines Agents as CommandCore workers.

Agents are future first-class execution actors that operate through CommandCore interfaces, permissions, memory, and work contracts.

## Responsibilities

- Execute scoped work on behalf of CommandCore.
- Consume context from structured records and approved knowledge.
- Use capabilities, tools, and models to produce outputs.
- Report changes, cite source records, and fail safely.
- Respect approval gates, permission boundaries, and no-secret rules.

## Ownership

CommandCore owns the agent architecture, data model, permissions, memory, capability library, company model, task contracts, and audit trail.

Agent engines are plugins or replaceable executors rather than owners of the domain.

## Lifecycle

Lifecycle pattern:
1. An agent identity and role are defined.
2. The agent is given scope, permissions, model access, and capabilities.
3. Work is assigned through a task or equivalent work contract.
4. The agent consumes approved context and executes within bounds.
5. The agent returns output, audit events, and status.
6. The result becomes part of operational memory.

Sprint 1 note:
- Autonomous agents are out of scope.
- Sprint 1 prepares stable IDs, linked records, decisions, next actions, search, and activity direction for future agent use.

## Relationships

- Agents belong below Teams in the future hierarchy.
- Agents may operate for a Company, Project, Capability, or Task scope.
- Agents are coordinated by Jarvis and the Executive Layer.
- Agents may use pluggable runtimes such as Codex, Aider, OpenHands, Claude Code, Ollama-backed flows, or future engines.
- Agents produce outputs that become knowledge, activity, or task results.

## Future Extensions

- First-class task contracts
- Capability certification for agents
- Multi-agent coordination
- Agent network views
- Agent performance and health signals
- Specialized executive-to-agent routing

## Examples

Example 1:
- A future engineering agent uses repository context, runbooks, and a task contract to prepare an implementation plan for a project.

Example 2:
- A research agent reviews a GitHub repository, records risk and usefulness, and promotes reusable findings toward capability review.

Example 3:
- An operations agent audits projects missing runbooks and returns a cited summary for Athena.

## Rules

- Agents are workers, not the architecture.
- Agent engines are pluggable and replaceable.
- Agents must be permission aware, auditable, runtime neutral, and scoped.
- Agents must cite source records and report changes.
- Agents must fail safely.
- Agents must not access secrets outside approved vault flows.
- Sprint 1 must not pretend autonomous agents already exist.

## Canonical Agent Facets

### Identity

Identity is the stable definition of the agent as a worker within CommandCore.

### Role

Role defines the operational function of the agent, such as engineering, research, operations, infrastructure, or communications support.

### Skills

Skills are the abilities the agent can apply directly or through capabilities.

### Memory

Memory is the approved context the agent can retrieve from workspace records, search, knowledge, and activity history.

### Tools

Tools are the external or internal instruments the agent may use through approved interfaces.

### Model

Model is the language or reasoning runtime assigned to the agent through the model abstraction layer.

### Permissions

Permissions define what the agent may access, modify, or recommend.

### Mission Queue

Mission Queue is the ordered set of assigned work, tasks, or delegated objectives available to the agent.

### State

State is the current operational condition of the agent, such as available, assigned, blocked, paused, or completed.

### Output

Output is the auditable result returned by the agent, including recommendations, summaries, artifacts, or change reports.

### Capabilities

Capabilities are the reusable enterprise skills the agent can invoke or embody while performing work.

### Relationship to Companies

Agents serve company worlds through projects, teams, capabilities, or tasks.

They are not company-independent abstractions in practice, even if their runtime is reusable.

### Relationship to Jarvis

Jarvis coordinates and routes work to agents.

Jarvis is the command layer; agents are worker layers beneath it.
