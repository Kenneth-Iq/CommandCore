# 05 - Agent Architecture

## Current Agent Model

The current system implements a Jarvis-era multi-agent mission model. Jarvis Prime plans and coordinates role agents through Python Core. The desktop app can also run a separate local agentic loop when Core is offline.

## Module: Engine Protocol

### Purpose

Define a runtime-neutral interface for agent engines.

### Responsibilities

- `run(...)` executes a mission for one role.
- `complete(...)` performs tool-light text completion for planning and sitrep synthesis.
- Return `EngineResult` with success, final text, and error.

### Dependencies

- `RoleConfig`, mission dictionaries, emit callback, approval gate callback.

### Strengths

- Clean seam for real and mock engines.
- Supports concurrent fleet tasks.
- Keeps Core orchestration independent from Hermes internals.

### Weaknesses

- Protocol is Python-only today.
- Mission shape is an untyped dictionary.
- Engine-specific behaviors leak through comments and callbacks.

### Should Keep

- Engine abstraction.
- Separate `run` and `complete` methods.
- Mock implementation.

### Should Improve

- Formalize mission payload type.
- Document engine callback contracts.

### Should Replace

- Replace untyped mission dictionaries with typed models while preserving engine semantics.

## Module: Hermes Engine Adapter

### Purpose

Embed the external Hermes AIAgent package as the real agent runtime.

### Responsibilities

- Configure Hermes with role model, base URL, API key, toolsets, and prompts.
- Register Odysseus tools.
- Register SearXNG search provider when configured.
- Register auxiliary LLM provider for context compression.
- Translate Hermes callbacks into Core events.
- Rescue known model/tool failure modes.

### Dependencies

- External `run_agent.AIAgent` package.
- Hermes tool registry and terminal approval callback.
- `odysseus_tools`.
- NVIDIA NIM-compatible model config.
- Optional SearXNG.

### Strengths

- Lazy import avoids requiring Hermes for mock tests.
- Handles known Nemotron/Hermes edge cases pragmatically.
- Emits tool and assistant events into the Core event stream.

### Weaknesses

- Changes process CWD to sandbox root.
- Heavily dependent on external Hermes package internals.
- Contains several runtime patches/rescue paths.

### Should Keep

- Adapter pattern.
- Callback-to-event mapping.
- Rescue behavior while models remain unreliable.

### Should Improve

- Document required Hermes package version/layout.
- Avoid global process CWD reliance if possible.

### Should Replace

- Replace direct internal Hermes imports with a stable adapter package/API when available.

## Module: Mock Engine

### Purpose

Deterministic engine for tests and no-key UI development.

### Responsibilities

- Simulate chat responses, tool calls, approvals, failures, slow tasks, bad plans, and fleet failures.
- Support planner and mission lifecycle tests.

### Dependencies

- None beyond Core engine types.

### Strengths

- Enables broad automated tests without LLM credentials.
- Encodes important lifecycle scenarios.

### Weaknesses

- Mock behavior is prompt-string-triggered.
- Does not model all real engine failure modes.

### Should Keep

- Mock engine as a first-class development tool.

### Should Improve

- Document trigger phrases and expected outputs.

### Should Replace

- Replace magic prompt triggers with structured test controls if test complexity grows.

## Module: Planner

### Purpose

Generate, parse, validate, sequence, and summarize multi-agent mission plans.

### Responsibilities

- Prompt Prime for a plan.
- Parse JSON or line-based plans.
- Clamp stage and task counts.
- Sequence roles by dependency order.
- Build sitrep prompts and findings blocks.

### Dependencies

- Engine completion, `RoleConfig`, regex parsing.

### Strengths

- Robust against noisy model output.
- Explicit role dependency ordering.
- Fallback plan prevents total planning failure.

### Weaknesses

- Planner depends on prompt conventions.
- Fallback plan can create a Prime task even though Prime is not in `DEPLOYABLE`.
- Limited task/stage configuration is hard-coded.

### Should Keep

- Fallback behavior.
- Sequencing of researcher -> analyst -> writer/operator.

### Should Improve

- Document plan text format.
- Make max stages/tasks configurable if needed.

### Should Replace

- Replace regex-only plan parsing with structured output when the model/runtime reliably supports it.

## Module: Role Roster

### Purpose

Configure standing agent roles, prompts, models, toolsets, and max permission tiers.

### Responsibilities

- Load YAML role definitions.
- Expand environment variables.
- Load prompt files.
- Provide role ceilings to mission execution.

### Dependencies

- `core/agents/roles.yaml`, prompt Markdown files, environment variables.

### Strengths

- Roles are data-driven.
- Permission ceilings are explicit per role.
- Prompts are externalized.

### Weaknesses

- Role names are legacy Jarvis/Fleet names.
- YAML schema is not validated beyond dataclass construction.

### Should Keep

- YAML role config.
- Per-role max tier.
- Prompt files.

### Should Improve

- Validate role config schema at startup.
- Document toolset names and required integrations.

### Should Replace

- Replace implicit YAML assumptions with explicit schema validation.

## Module: Desktop Local Agentic Loop

### Purpose

Offline fallback when Python Core is unavailable.

### Responsibilities

- Classify intent.
- Build memory context.
- Run OpenAI-compatible chat completions with tools.
- Execute registered desktop integration tools with tiered confirmations.
- Return assistant response to renderer.

### Dependencies

- Desktop LLM client, tools registry, memory integration, IPC confirmation, audit log.

### Strengths

- Preserves usefulness without Core.
- Uses same user-visible confirmation dialog.
- Supports integrations even when Core is offline.

### Weaknesses

- Duplicates Core concepts and permission tiers.
- Conversation history is process memory only.
- Tool calls are local desktop-only, not represented in Core ledger.

### Should Keep

- Offline fallback capability.
- Tiered confirmation in fallback path.

### Should Improve

- Clearly label fallback mode.
- Align audit and approval records with Core concepts.

### Should Replace

- Replace divergent fallback semantics with shared contracts while preserving offline operation.
