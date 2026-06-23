# Hermes Architecture Review: System Overview

## Positioning

Hermes is a mature, self-improving AI agent runtime and multi-interface execution engine. It is not the CommandCore system architecture. In the CommandCore roadmap, Hermes should be treated as an engine candidate that can be wrapped behind CommandCore's future agent interface.

CommandCore remains the AI Enterprise Operating System. Hermes may provide reusable execution, tool, session, gateway, memory, and skill capabilities inside that operating system.

## Repository Reviewed

Source repository:

`/data/commandcore/development/agent-engines/hermes`

Representative files reviewed:

- `README.md`
- `AGENTS.md`
- `pyproject.toml`
- `package.json`
- `run_agent.py`
- `model_tools.py`
- `toolsets.py`
- `tools/registry.py`
- `hermes_state.py`
- `agent/memory_manager.py`
- `agent/transports/base.py`
- `gateway/run.py`
- `cron/scheduler.py`
- `acp_adapter/server.py`
- `hermes_cli/commands.py`

## Executive Summary

Hermes is an agent runtime with a large built-in ecosystem:

- Core `AIAgent` conversation loop
- Provider transport abstraction
- Tool registry and toolset layer
- CLI, TUI, messaging gateway, ACP adapter, and cron interfaces
- SQLite session state with FTS5 search
- Memory provider orchestration
- Skills and optional skill packs
- Plugin ecosystem
- Multiple terminal and sandbox backends
- Messaging platform adapters
- Batch trajectory and compression tooling

This makes Hermes most useful to CommandCore as a candidate engine beneath Jarvis, Hermes-as-CTO, or other future executive agents. It should not become the system architecture or replace the Nexus, company model, capability library, or CommandCore operating model.

## Module: Hermes Agent Runtime

### Purpose

Provides the central agent execution loop through `AIAgent` in `run_agent.py`.

### Responsibilities

- Manage conversation turns.
- Call models through provider APIs.
- Build prompts and context.
- Execute tools.
- Track iteration budgets.
- Handle callbacks for CLI, gateway, TUI, ACP, and other surfaces.
- Support sessions, platform context, model overrides, fallbacks, memory, context files, and checkpoints.

### Dependencies

- `model_tools.py`
- `toolsets.py`
- `tools/registry.py`
- `agent/`
- Provider credentials and API endpoints
- Optional session database
- Optional memory providers

### Strengths

- Broad runtime maturity.
- Rich callback model for many interfaces.
- Multi-provider model support.
- Large existing tool and skill ecosystem.
- Built for long-running, tool-using agents.

### Weaknesses

- Very large central files concentrate responsibility.
- The runtime is optimized around Hermes' own operating assumptions.
- Direct adoption would risk coupling CommandCore to an engine implementation.

### Should Keep

- The runtime as a candidate pluggable engine.
- Its model-provider flexibility.
- Its tool-calling and callback patterns.
- Its support for long-running agent work.

### Should Improve

- Define a CommandCore engine adapter boundary before any integration.
- Map Hermes sessions, tools, and memory into CommandCore concepts explicitly.
- Keep engine lifecycle separate from Nexus, companies, capabilities, and executive roles.

### Should Replace

Nothing in CommandCore should be replaced by Hermes. If adopted, only direct engine coupling should be replaced with a CommandCore-owned adapter.

## Module: Interfaces

### Purpose

Expose Hermes through CLI, TUI, messaging platforms, IDE ACP clients, cron jobs, and batch runners.

### Responsibilities

- Interactive terminal operation.
- Rich terminal UI operation.
- Messaging gateway operation.
- IDE agent protocol integration.
- Scheduled automation.
- Batch trajectory generation.

### Dependencies

- `cli.py`
- `hermes_cli/`
- `ui-tui/`
- `tui_gateway/`
- `gateway/`
- `acp_adapter/`
- `cron/`
- `batch_runner.py`

### Strengths

- Multiple mature surfaces.
- Shared slash command registry.
- Messaging continuity across platforms.
- Practical automation entry points.

### Weaknesses

- Interface logic is spread across several large subsystems.
- Some surfaces appear tightly bound to Hermes runtime details.
- Operational behavior depends heavily on local configuration.

### Should Keep

- Gateway adapters as reusable platform integrations.
- ACP adapter as a possible IDE bridge.
- Cron delivery model as a reusable automation capability.
- CLI/TUI ideas as reference implementations.

### Should Improve

- Separate reusable interface adapters from Hermes-specific command behavior.
- Define which surfaces CommandCore needs for Sprint 1 and which remain future candidates.

### Should Replace

Do not replace CommandCore interfaces with Hermes interfaces. Wrap or harvest reusable parts where they fit CommandCore's operating model.

## Module: CommandCore Comparison

### Purpose

Clarifies how Hermes relates to CommandCore.

### Responsibilities

- Identify unique Hermes capabilities.
- Identify overlapping capabilities.
- Identify reusable capabilities.
- Preserve CommandCore as the governing architecture.

### Dependencies

- CommandCore architecture documents.
- CommandCore blueprint.
- Hermes repository inspection.

### Strengths

- Hermes fills many engine-level gaps that CommandCore has not yet implemented.
- Hermes demonstrates mature patterns for tools, skills, memory, gateways, and provider routing.

### Weaknesses

- Hermes is an agent product/runtime, not an enterprise operating system.
- It does not natively model CommandCore's Universe, Nexus, companies, divisions, departments, products, or executive headquarters.

### Should Keep

- CommandCore's system identity.
- Hermes as a candidate execution engine.
- A strict adapter boundary between the two.

### Should Improve

- Create a formal CommandCore engine interface before any runtime adoption.
- Evaluate Hermes features as reusable capabilities, not as architectural authority.

### Should Replace

No CommandCore system concepts should be replaced by Hermes concepts.

