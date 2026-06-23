# Hermes Architecture Review: Folder Structure

## Overview

Hermes is organized as a large Python-first agent runtime with supplemental Node/TypeScript components for browser tooling and terminal UI. The repository contains core runtime code, tools, interfaces, plugins, skills, providers, tests, documentation, and adapters.

## Module: Repository Root

### Purpose

Houses top-level runtime entry points, packaging, documentation, and orchestration files.

### Responsibilities

- Provide agent entry points.
- Define Python and Node dependencies.
- Document developer workflows.
- Support Docker and compose-based operation.

### Dependencies

- `run_agent.py`
- `cli.py`
- `model_tools.py`
- `toolsets.py`
- `batch_runner.py`
- `trajectory_compressor.py`
- `mcp_serve.py`
- `pyproject.toml`
- `package.json`
- `Dockerfile`
- `docker-compose.yml`
- `README.md`
- `AGENTS.md`

### Strengths

- Clear entry points are visible at the root.
- Packaging metadata exposes supported scripts.
- Developer guide documents architecture and conventions.

### Weaknesses

- Several root files are very large and carry broad responsibility.
- Root-level modules make the system approachable but also increase coupling.

### Should Keep

- Root-level executable clarity.
- `AGENTS.md` as an operational map.
- Packaging metadata and Docker support.

### Should Improve

- Treat root files as adapter candidates rather than direct CommandCore imports.
- Document which root entry points are stable enough for engine wrapping.

### Should Replace

No CommandCore folder layout should be replaced. Hermes root structure should remain external engine structure unless intentionally vendored or adapted.

## Module: `agent/`

### Purpose

Contains provider adapters, prompt construction, memory orchestration, caching, compression, and transport abstractions.

### Responsibilities

- Convert provider request and response formats.
- Build prompts and context.
- Manage memory provider integration.
- Support context compression and model metadata.

### Dependencies

- `agent/transports/`
- `agent/memory_manager.py`
- `agent/prompt_builder.py`
- `agent/context_engine.py`
- Provider SDKs and model metadata.

### Strengths

- Strong separation for provider transport conversion.
- Memory and prompt systems are reusable candidates.
- Context files and session data are integrated into prompts.

### Weaknesses

- Some prompt behavior is Hermes identity-specific.
- Memory behavior needs mapping before CommandCore can use it safely.

### Should Keep

- Provider transport abstraction.
- Memory provider manager pattern.
- Context compression and prompt construction ideas.

### Should Improve

- Split Hermes identity prompts from engine-neutral prompt services.
- Add CommandCore-owned adapters for executive context and company context.

### Should Replace

Do not replace CommandCore executive context. Replace only Hermes-specific identity injection when running under CommandCore.

## Module: `tools/`

### Purpose

Provides auto-discovered tool implementations, tool metadata, sandbox environments, and utility capabilities.

### Responsibilities

- Register tools through `tools/registry.py`.
- Expose terminal, file, browser, memory, cron, messaging, code execution, computer use, image/video, search, and other capabilities.
- Check tool availability.
- Route tool calls from agent runtime.

### Dependencies

- `tools/registry.py`
- `model_tools.py`
- External binaries and services.
- Optional extras such as browser automation, Docker, Modal, Daytona, MCP, and Home Assistant.

### Strengths

- Rich capability surface.
- Registry captures metadata and availability.
- Toolsets allow configurable capability bundles.

### Weaknesses

- Capability breadth can blur product boundaries.
- Tool semantics are Hermes-native and need CommandCore capability mapping.

### Should Keep

- Tool registry design.
- Tool availability checks.
- Toolset grouping.
- Environment backend abstractions.

### Should Improve

- Convert useful tools into CommandCore Living Capability Library entries.
- Apply CommandCore governance, review, and security rules before reuse.

### Should Replace

Do not replace CommandCore capabilities wholesale. Replace ad hoc CommandCore tool definitions only if a reviewed Hermes capability is wrapped and promoted.

## Module: `hermes_cli/`, `ui-tui/`, and `tui_gateway/`

### Purpose

Provide terminal-first human interfaces.

### Responsibilities

- Slash command registry and routing.
- Setup wizard and configuration.
- Rich interactive CLI behavior.
- Ink-based TUI frontend.
- Python JSON-RPC gateway between TUI and runtime.

### Dependencies

- `prompt_toolkit`
- `rich`
- Node/TypeScript TUI dependencies
- Hermes runtime and command registry

### Strengths

- Mature interactive UX.
- Single slash command source of truth.
- TUI separates TypeScript rendering from Python runtime ownership.

### Weaknesses

- UI behavior is Hermes-branded and agent-runtime-specific.
- Command registry is broad and may not match CommandCore executive workflows.

### Should Keep

- Central command registry concept.
- JSON-RPC split between UI and runtime.
- Setup and doctor command patterns.

### Should Improve

- Translate commands into CommandCore operations instead of importing them directly.
- Reuse only interface concepts that support the Nexus and local productivity wedge.

### Should Replace

Do not replace the Nexus with Hermes CLI or TUI. Use these as references or optional engine-facing surfaces.

## Module: `gateway/`

### Purpose

Supports long-running messaging platform operation.

### Responsibilities

- Manage platform adapters.
- Route inbound messages to agent sessions.
- Deliver outbound messages.
- Preserve session continuity.
- Handle interrupts, queues, approvals, model overrides, and platform-specific behavior.

### Dependencies

- Platform adapter packages.
- `SessionStore`
- `DeliveryRouter`
- `AIAgent`
- `SessionDB`
- Gateway config and environment variables.

### Strengths

- Broad platform coverage.
- Real operational concerns are handled, including queues, cached agents, restart behavior, approvals, and delivery routing.

### Weaknesses

- Large controller surface.
- Complex lifecycle behavior would require careful isolation before reuse.

### Should Keep

- Platform adapter concepts.
- Delivery routing.
- Session continuity model.
- Busy/queue/interrupt behavior as workflow references.

### Should Improve

- Expose a smaller adapter layer for CommandCore.
- Avoid importing Hermes gateway lifecycle as CommandCore system lifecycle.

### Should Replace

No CommandCore communication architecture should be replaced. Hermes adapters may become reusable communication capabilities.

## Module: `plugins/`, `skills/`, and `optional-skills/`

### Purpose

Extend Hermes with provider integrations, tools, memory, observability, and domain behaviors.

### Responsibilities

- Package optional functionality.
- Provide skill definitions and reusable behavior.
- Add providers and integrations.

### Dependencies

- Hermes plugin loader.
- Skill prompt system.
- Optional third-party services.

### Strengths

- Large reusable corpus.
- Strong alignment with CommandCore's Living Capability Library direction.
- Demonstrates capability packaging at scale.

### Weaknesses

- Skill quality and governance likely vary.
- Skill semantics are not yet CommandCore capability contracts.

### Should Keep

- Skill packaging ideas.
- Optional capability model.
- Provider/plugin extensibility.

### Should Improve

- Review skills through CommandCore Capability Reviews.
- Promote only stable, governed capabilities into the CommandCore library.

### Should Replace

Do not replace CommandCore's Living Capability Library. Use Hermes skills as candidate source material.

## Module: `tests/`

### Purpose

Validates Hermes runtime, tools, gateways, plugins, and interfaces.

### Responsibilities

- Unit and integration coverage.
- Regression protection.
- Optional dependency behavior.
- Runtime safety behavior.

### Dependencies

- `pytest`
- Optional extras depending on test markers.
- Hermes modules and plugins.

### Strengths

- Large test suite indicates production maturity.
- Test markers distinguish integration work.

### Weaknesses

- Tests validate Hermes behavior, not CommandCore integration behavior.

### Should Keep

- Tests as evidence during capability evaluation.
- Patterns for tool and gateway validation.

### Should Improve

- Add CommandCore adapter tests if Hermes is integrated.
- Create contract tests around the future CommandCore agent interface.

### Should Replace

Do not replace CommandCore tests with Hermes tests. Reuse patterns and add integration-specific coverage.

