# Hermes Architecture Review: Agent Architecture

## Overview

Hermes is strongest as an agent engine. It already contains mature runtime behavior that overlaps with CommandCore's need for pluggable agent engines. CommandCore should evaluate Hermes through an engine-adapter lens.

## Module: `AIAgent`

### Purpose

Executes tool-using model conversations.

### Responsibilities

- Maintain conversation flow.
- Build context and prompts.
- Call provider APIs.
- Execute function/tool calls.
- Manage iteration budgets.
- Support callbacks for status, streaming, tool events, reasoning, clarification, and progress.
- Support platform/session identifiers.

### Dependencies

- `run_agent.py`
- Provider clients
- `model_tools.py`
- `toolsets.py`
- `agent/prompt_builder.py`
- `agent/memory_manager.py`
- `hermes_state.py`

### Strengths

- Feature-rich and battle-tested.
- Supports long-running tool work.
- Supports many integration surfaces through callbacks.

### Weaknesses

- Central class has high responsibility density.
- Hermes-specific identity and session assumptions must be isolated.

### Should Keep

- Tool loop behavior.
- Callback surface.
- Provider fallback concepts.
- Iteration budget model.

### Should Improve

- Wrap behind a CommandCore `AgentEngine` interface.
- Supply CommandCore context externally instead of letting Hermes own system identity.

### Should Replace

Do not replace Jarvis or CommandCore executive architecture. Replace only direct use of `AIAgent` with an adapter if integrated.

## Module: Provider and Model Routing

### Purpose

Supports multiple model providers and API modes.

### Responsibilities

- Detect providers.
- Parse model inputs.
- Route provider calls.
- Normalize responses.
- Support fallback model behavior.
- Support reasoning and service-tier settings.

### Dependencies

- `agent/transports/`
- `hermes_cli/models`
- Provider SDKs
- API keys and config

### Strengths

- Strong no-vendor-lock-in posture.
- Multiple providers are supported.
- Provider transport boundary is explicit.

### Weaknesses

- Provider selection is configured for Hermes users, not enterprise policy.
- CommandCore needs governance over model routing.

### Should Keep

- Provider abstraction.
- Model catalog concepts.
- Fallback model behavior.

### Should Improve

- Add CommandCore policy controls for provider use.
- Attach model routing to executive role, task type, risk, and company context.

### Should Replace

Do not replace CommandCore model governance. Hermes routing can be a lower-level implementation option.

## Module: Tools and Toolsets

### Purpose

Expose model-callable capabilities to agents.

### Responsibilities

- Group tools into toolsets.
- Enable/disable tools.
- Discover and register tools.
- Execute tool handlers.
- Return structured results.

### Dependencies

- `toolsets.py`
- `tools/registry.py`
- `model_tools.py`
- Tool modules

### Strengths

- Broad tool coverage.
- Good modularity at the registry level.
- Tool availability is checked dynamically.

### Weaknesses

- Toolset names are runtime-oriented, not CommandCore capability products.
- Security and review model must be elevated for enterprise use.

### Should Keep

- Registry and metadata patterns.
- Toolset grouping.
- Dynamic availability checks.

### Should Improve

- Promote reusable tools through Capability Reviews.
- Add CommandCore-level capability contracts, ownership, permissions, and audit.

### Should Replace

Do not replace CommandCore capabilities with Hermes toolsets. Wrap selected toolsets as capability implementations.

## Module: Memory Architecture

### Purpose

Coordinates built-in memory and one optional external memory provider.

### Responsibilities

- Register memory providers.
- Build memory system prompt blocks.
- Prefetch memory context.
- Queue background prefetch.
- Sync completed turns.
- Route memory tool calls to providers.

### Dependencies

- `agent/memory_manager.py`
- Memory provider plugins
- Built-in memory provider

### Strengths

- Failure in one provider does not block others.
- External provider limit reduces ambiguity.
- Memory tools are discoverable and routable.

### Weaknesses

- Single external provider may be too narrow for CommandCore enterprise memory.
- Memory semantics are not tied to companies, divisions, departments, projects, or agents.

### Should Keep

- Provider manager pattern.
- Failure isolation.
- Prompt block and prefetch flow.

### Should Improve

- Add CommandCore scopes: user, agent, team, project, company, capability, and executive memory.
- Define retention and governance rules.

### Should Replace

Do not replace CommandCore knowledge architecture. Hermes memory can provide engine-level memory services.

## Module: Skills

### Purpose

Provides reusable behavioral packages and self-improvement artifacts.

### Responsibilities

- Discover and manage skills.
- Add skill context to prompts.
- Support skill installation, inspection, browsing, curation, and maintenance.
- Enable self-improving behavior from agent experience.

### Dependencies

- `skills/`
- `optional-skills/`
- Skill management tools
- Prompt builder
- CLI command registry

### Strengths

- Directly overlaps with CommandCore's Living Capability Library vision.
- Large catalog of reusable behaviors.
- Skill curation workflow is valuable.

### Weaknesses

- Skills are not yet CommandCore-governed capabilities.
- Quality, provenance, and risk metadata need normalization.

### Should Keep

- Skill artifact model.
- Skill discovery and curation patterns.
- Self-improvement loop as a research candidate.

### Should Improve

- Convert selected skills into CommandCore capabilities.
- Require Capability Reviews before enterprise use.

### Should Replace

Do not replace the Living Capability Library. Hermes skills are candidate inputs to it.

## Module: Delegation and Subagents

### Purpose

Allows Hermes to delegate tasks or run isolated agent work.

### Responsibilities

- Spawn subagent work.
- Parallelize work where supported.
- Preserve isolation between delegated tasks.
- Return outputs to the parent agent.

### Dependencies

- Delegate tools
- Agent runtime
- Toolsets
- Terminal/sandbox environments

### Strengths

- Valuable for future CommandCore agent orchestration.
- Supports parallel work patterns.

### Weaknesses

- Delegation is Hermes-agent-centric rather than CommandCore organization-centric.

### Should Keep

- Delegation model as an engine capability.

### Should Improve

- Map delegated agents to CommandCore agents, tasks, teams, and executive oversight.

### Should Replace

Do not replace CommandCore's future agent hierarchy. Hermes delegation can implement selected task execution.

