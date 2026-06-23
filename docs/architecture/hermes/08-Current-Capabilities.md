# Hermes Architecture Review: Current Capabilities

## Overview

Hermes contains a wide capability surface. Many items overlap with CommandCore's future Living Capability Library and agent engine needs. The capabilities below should be considered candidates for review, wrapping, or reference implementation.

## Unique Hermes Capabilities

- Self-improving skill loop.
- Large skills and optional-skills catalog.
- Central tool registry with AST-assisted discovery.
- Multi-surface command registry.
- Messaging gateway across many platforms.
- ACP editor adapter.
- TUI with JSON-RPC runtime bridge.
- Multiple terminal backends.
- SQLite session database with FTS5 search and WAL contention handling.
- Model provider transport layer and curated provider/model switching.
- Batch trajectory generation and trajectory compression.
- Cron jobs with script-only and agent-backed modes.
- Gateway agent cache and session continuity.
- OpenClaw migration support.
- Skill curator and skill hub concepts.

## Overlapping CommandCore Capabilities

- Agent execution.
- Tool calling.
- Local-first productivity.
- Model abstraction.
- Memory and session history.
- Search and retrieval.
- Messaging/notification integrations.
- Scheduled tasks.
- Docker/self-hosting support.
- Capability packaging concepts.
- Research and coding workflows.
- Terminal/file/browser automation.

## Reusable CommandCore Capability Candidates

- Engine adapter around `AIAgent`.
- Tool registry metadata.
- Toolset grouping.
- Provider transport abstraction.
- Memory provider orchestration.
- Session search.
- Gateway platform adapters.
- Cron scheduler delivery model.
- ACP IDE bridge.
- Skills as candidate Living Capability Library artifacts.
- Terminal backend abstraction.
- Safety/approval patterns.

## Module: Tool Capabilities

### Purpose

Provide the active functions an agent can call.

### Responsibilities

- File operations.
- Terminal/process operations.
- Browser automation.
- Web search and extraction.
- Memory operations.
- Todo and kanban operations.
- Cron job operations.
- Messaging operations.
- Code execution.
- Image/video/TTS capabilities.
- Computer use.
- Home Assistant integration.

### Dependencies

- `tools/`
- `toolsets.py`
- Optional provider plugins
- External binaries and APIs

### Strengths

- Extensive practical coverage.
- Many capabilities directly support local productivity.

### Weaknesses

- Broad access requires strong governance.
- Not all capabilities are equally relevant to Sprint 1.

### Should Keep

- File, terminal, search, memory, todo, browser, scheduler, and messaging tools as high-value candidates.

### Should Improve

- Prioritize capabilities for CommandCore Sprint 1.
- Add review status, risk level, and ownership.

### Should Replace

Do not replace CommandCore capabilities. Promote reviewed Hermes tools as reusable implementations.

## Module: Skill Capabilities

### Purpose

Package reusable agent behaviors and domain workflows.

### Responsibilities

- Provide instructions and workflows.
- Extend agent behavior without changing core runtime.
- Support installation, curation, and maintenance.

### Dependencies

- `skills/`
- `optional-skills/`
- Skill management commands and tools

### Strengths

- Closely aligned with Living Capability Library.
- Large seed corpus.

### Weaknesses

- Needs provenance, testing, versioning, and enterprise review metadata.

### Should Keep

- Skill artifact format as inspiration.
- Skill curator workflow.

### Should Improve

- Convert selected skills into CommandCore capability records.
- Establish Capability Reviews.

### Should Replace

Do not replace the Living Capability Library. Hermes skills should feed it.

## Module: Interface Capabilities

### Purpose

Expose the engine to humans and systems.

### Responsibilities

- CLI.
- TUI.
- Messaging gateway.
- ACP.
- Cron.
- Batch runs.

### Dependencies

- `cli.py`
- `hermes_cli/`
- `ui-tui/`
- `gateway/`
- `acp_adapter/`
- `cron/`
- `batch_runner.py`

### Strengths

- Multiple operational surfaces.
- Useful examples for CommandCore productivity wedge.

### Weaknesses

- Interfaces are not organized around CommandCore Nexus or company worlds.

### Should Keep

- CLI as developer reference.
- Gateway and ACP as reusable integrations.
- Cron as automation reference.

### Should Improve

- Align reused interfaces to CommandCore task, company, agent, and executive context.

### Should Replace

Do not replace Nexus or CommandCore desktop workflows.

## Module: Infrastructure Capabilities

### Purpose

Support local, containerized, remote, and optional service-backed execution.

### Responsibilities

- Docker operation.
- Local process execution.
- SSH execution.
- Sandbox integrations.
- Provider API routing.
- Optional services and plugins.

### Dependencies

- `Dockerfile`
- `docker-compose.yml`
- `tools/environments/`
- Provider plugins
- Optional extras

### Strengths

- Strong local-first orientation.
- Flexible execution backends.

### Weaknesses

- Infrastructure is engine-oriented, not X10 platform-oriented.

### Should Keep

- Local-first and sandbox backend ideas.
- Docker packaging.

### Should Improve

- Fit Hermes runtime into CommandCore/X10 infrastructure under Portainer, Traefik, LiteLLM, Ollama, Qdrant, and future data services where appropriate.

### Should Replace

Do not replace CommandCore X10 architecture.

