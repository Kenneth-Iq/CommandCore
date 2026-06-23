# Hermes Architecture Review: Recommendations

## Guiding Recommendation

Hermes should be evaluated as a pluggable agent engine candidate for CommandCore. CommandCore remains the system architecture, enterprise operating model, executive layer, Nexus, company-world model, and capability governance authority.

## Module: Integration Strategy

### Purpose

Define the safest path for evaluating Hermes inside CommandCore.

### Responsibilities

- Preserve CommandCore architecture.
- Avoid engine lock-in.
- Identify reusable capabilities.
- Establish adapter contracts.

### Dependencies

- CommandCore Master Blueprint.
- CommandCore architecture documents.
- Hermes runtime and interfaces.

### Strengths

- Hermes can accelerate agent execution, tools, memory, gateway, and skills.

### Weaknesses

- Direct adoption would blur system architecture and engine implementation.

### Should Keep

- CommandCore as the primary architecture.
- Hermes as a candidate engine.
- No-vendor-lock-in and modular stance.

### Should Improve

- Create a CommandCore `AgentEngine` interface.
- Add a `HermesEngineAdapter` only after the contract is defined.
- Keep all CommandCore concepts outside Hermes internals.

### Should Replace

Do not replace CommandCore. Replace only any temptation to directly couple CommandCore to Hermes internals.

## Module: Capability Reuse

### Purpose

Identify which Hermes capabilities should be considered for CommandCore reuse.

### Responsibilities

- Evaluate candidate tools.
- Evaluate skills.
- Evaluate gateway adapters.
- Evaluate memory/session search.
- Evaluate provider transports.
- Evaluate scheduler and ACP bridge.

### Dependencies

- Hermes `tools/`, `skills/`, `plugins/`, `gateway/`, `cron/`, `acp_adapter/`, and `agent/`.
- CommandCore Living Capability Library.

### Strengths

- Large ready-made capability corpus.
- Strong overlap with local-first productivity wedge.

### Weaknesses

- Capabilities lack CommandCore review metadata.

### Should Keep

- Candidate list:
  - Tool registry.
  - Provider transport layer.
  - Memory manager.
  - Session search.
  - Cron scheduler.
  - Messaging adapters.
  - ACP adapter.
  - Skill artifacts.
  - Terminal backend abstraction.

### Should Improve

- Run Capability Reviews before promoting anything.
- Define capability ownership and product consumers.
- Add risk and audit metadata.

### Should Replace

Do not replace CommandCore capability governance. Reuse Hermes implementations only after review.

## Module: Sprint 1 Fit

### Purpose

Clarify how Hermes relates to Sprint 1.

### Responsibilities

- Support architecture-first work.
- Inform agent interface design.
- Seed capability library candidates.
- Validate local productivity engine needs.

### Dependencies

- Sprint 1 Master Blueprint.
- CommandCore local productivity MVP.
- Hermes architecture review.

### Strengths

- Hermes provides concrete examples for engine, tool, memory, scheduler, and interface design.

### Weaknesses

- Integrating too early could distract from CommandCore foundation work.

### Should Keep

- Hermes as a reference and candidate.
- Documentation-only analysis during early architecture work.

### Should Improve

- Defer runtime integration until CommandCore interfaces are written.
- Use Hermes review to shape `AgentEngine`, `Capability`, `Tool`, `Memory`, and `Session` contracts.

### Should Replace

Do not replace Sprint 1 CommandCore deliverables with Hermes adoption.

## Module: Unique Hermes Capabilities to Track

### Purpose

Capture Hermes features that CommandCore does not currently appear to have at comparable maturity.

### Responsibilities

- Maintain evaluation backlog.
- Prioritize capability review.
- Avoid losing useful discoveries.

### Dependencies

- Hermes repository.
- CommandCore capability library.

### Strengths

- Self-improving skills.
- Messaging gateway breadth.
- ACP adapter.
- FTS5 session search.
- Tool registry/toolset system.
- Multi-provider transport layer.
- Cron delivery model.
- Terminal backend abstraction.
- Batch trajectory tooling.
- TUI runtime bridge.

### Weaknesses

- Not all features are needed for CommandCore Sprint 1.

### Should Keep

- Track these as candidate reusable capabilities.

### Should Improve

- Prioritize by CommandCore wedge:
  - Local productivity.
  - Agent interface.
  - Capability library.
  - Nexus foundation.
  - Executive layer support.

### Should Replace

Do not replace CommandCore roadmap priorities with Hermes feature breadth.

## Module: Overlapping Capabilities

### Purpose

Prevent duplicated work while preserving CommandCore authority.

### Responsibilities

- Compare engine execution.
- Compare memory/session behavior.
- Compare scheduler behavior.
- Compare messaging behavior.
- Compare capability/tool behavior.

### Dependencies

- CommandCore current codebase.
- Hermes current codebase.

### Strengths

- Overlap creates reuse opportunities.

### Weaknesses

- Overlap can create confusion if ownership is not defined.

### Should Keep

- CommandCore concepts as canonical.
- Hermes implementation as optional.

### Should Improve

- For each overlap, define:
  - CommandCore concept.
  - Hermes implementation candidate.
  - Adapter required.
  - Review status.
  - Acceptance criteria.

### Should Replace

Never replace CommandCore ownership of overlapping concepts.

## Module: Recommended Next Steps

### Purpose

Provide actionable architecture work after this review.

### Responsibilities

- Convert findings into architecture tasks.
- Keep implementation deferred until contracts exist.

### Dependencies

- CommandCore blueprint and architecture docs.
- Hermes review docs.

### Strengths

- Low-risk path preserves flexibility.

### Weaknesses

- Requires discipline to avoid premature integration.

### Should Keep

- Documentation-first approach.

### Should Improve

- Add a future CommandCore document for `AgentEngine` contract design.
- Add a Capability Review template.
- Create a Hermes capability inventory with review status.
- Define a proof-of-concept boundary before running Hermes inside CommandCore.

### Should Replace

Do not replace CommandCore with Hermes. Hermes remains an engine candidate under CommandCore.

