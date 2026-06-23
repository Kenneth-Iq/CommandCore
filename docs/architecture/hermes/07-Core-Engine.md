# Hermes Architecture Review: Core Engine

## Overview

Hermes' core engine combines conversation orchestration, provider transports, tool routing, memory, session persistence, prompt building, and optional skills. This is the strongest area for CommandCore reuse, provided it is placed behind a CommandCore-owned engine interface.

## Module: Conversation Loop

### Purpose

Runs iterative model and tool interactions until a final response or budget limit.

### Responsibilities

- Build request messages.
- Submit model calls.
- Parse tool calls.
- Execute tools.
- Append results.
- Track budgets and graceful exits.

### Dependencies

- `AIAgent`
- Provider transport
- Tool definitions
- Runtime callbacks

### Strengths

- Mature handling of tool workflows.
- Supports callback-driven UI and gateway integration.
- Built for practical autonomous work.

### Weaknesses

- Core loop is embedded in a large class.
- Needs interface extraction for CommandCore use.

### Should Keep

- Iterative tool-call execution model.
- Budget and callback mechanisms.
- Graceful degradation patterns.

### Should Improve

- Add a CommandCore wrapper that exposes stable `run`, `stream`, `cancel`, `resume`, and `inspect` operations.

### Should Replace

Do not replace CommandCore's executive orchestration. Use Hermes only as a lower-level execution engine.

## Module: Prompt and Context Engine

### Purpose

Builds system prompts, context files, memory blocks, environment hints, and skill prompts.

### Responsibilities

- Load identity and instruction files.
- Add tool and skill context.
- Add memory context.
- Add environment and subscription hints.
- Support compression.

### Dependencies

- `agent/prompt_builder.py`
- `agent/context_engine.py`
- Memory manager
- Skills
- Context files such as `SOUL.md`, `HERMES.md`, `AGENTS.md`, `CLAUDE.md`, and `.cursorrules`

### Strengths

- Flexible context composition.
- Useful support for repository-specific instructions.

### Weaknesses

- Hermes identity files are not CommandCore executive identity.
- Prompt loading needs strict boundary control in an enterprise OS.

### Should Keep

- Context file ingestion pattern.
- Prompt composition utilities.
- Compression hooks.

### Should Improve

- Replace Hermes identity context with CommandCore executive, company, capability, and task context when running under CommandCore.

### Should Replace

Replace only Hermes-specific identity injection in CommandCore runs. Do not replace CommandCore identity architecture.

## Module: Session Database

### Purpose

Persists sessions in SQLite with FTS5 search and schema reconciliation.

### Responsibilities

- Store session data.
- Support search.
- Handle WAL mode.
- Retry writes with jitter.
- Reconcile schema columns on startup.
- Support pruning and maintenance.

### Dependencies

- `hermes_state.py`
- SQLite
- Local Hermes home directory

### Strengths

- Local-first persistence.
- Thoughtful handling of write contention.
- FTS5 search is valuable.
- Schema reconciliation is pragmatic.

### Weaknesses

- Storage scope is Hermes sessions, not CommandCore enterprise objects.
- SQLite may need augmentation for multi-user enterprise deployments.

### Should Keep

- Local SQLite session store pattern.
- FTS5 session search.
- WAL and retry behavior.

### Should Improve

- Map session records to CommandCore agents, tasks, projects, and companies.
- Plan migration or synchronization paths to PostgreSQL/Neo4j where enterprise graph data is needed.

### Should Replace

Do not replace CommandCore persistence architecture. Hermes session storage can be reused for local engine state.

## Module: Tool Engine

### Purpose

Discovers, exposes, and executes tools.

### Responsibilities

- Register tools.
- Build model tool definitions.
- Coerce tool args.
- Handle function calls.
- Sanitize errors.
- Enforce availability checks.

### Dependencies

- `tools/registry.py`
- `model_tools.py`
- `toolsets.py`
- Tool modules

### Strengths

- Robust registry and discovery.
- Availability check caching.
- Toolsets simplify configuration.

### Weaknesses

- Tool execution policy is engine-local.
- Needs enterprise controls before direct exposure.

### Should Keep

- Registry and toolset mechanics.
- Error sanitization.
- Availability metadata.

### Should Improve

- Add CommandCore capability governance, approval tiers, audit trails, and product ownership.

### Should Replace

Do not replace CommandCore capability system. Use tool engine as implementation substrate.

## Module: Runtime Safety

### Purpose

Reduces operational risk across dependencies, commands, prompts, and sessions.

### Responsibilities

- Exact-pin many dependencies.
- Detect destructive commands.
- Support approval flows.
- Sanitize tool errors.
- Scan scheduled prompts.
- Keep optional dependencies out of core installs.

### Dependencies

- `pyproject.toml`
- Tool guards
- Gateway approvals
- Cron prompt-injection checks
- Optional security scanner integrations

### Strengths

- Security-conscious dependency posture.
- Practical command approval behavior.
- Optional extras reduce baseline attack surface.

### Weaknesses

- Enterprise-grade policy still belongs above the engine.
- Safety behavior is distributed across modules.

### Should Keep

- Exact-pinning posture as a reference.
- Approval and scanning ideas.
- Optional dependency design.

### Should Improve

- Centralize policy under CommandCore.
- Add capability risk metadata and audit logs.

### Should Replace

Do not replace CommandCore security architecture. Hermes safety mechanisms should be subordinate controls.

