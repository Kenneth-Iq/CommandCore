# Hermes Architecture Review: Technical Debt

## Overview

Hermes is capable and mature, but its size and breadth create integration risk. The debt below should be understood as integration considerations, not reasons to discard functionality.

## Module: Large Central Runtime Files

### Purpose

`run_agent.py`, `cli.py`, and `gateway/run.py` concentrate major runtime behavior.

### Responsibilities

- Agent execution.
- CLI orchestration.
- Gateway lifecycle.
- Session handling.
- Tool dispatch.
- Platform behavior.

### Dependencies

- Most Hermes subsystems.

### Strengths

- Behavior is discoverable in central files.
- Mature operational logic exists in one place.

### Weaknesses

- High cognitive load.
- Hard to integrate safely without adapter boundaries.
- Changes can have broad blast radius.

### Should Keep

- Existing functionality and operational behavior.

### Should Improve

- Treat central files as black-box engine internals.
- Build integration contracts outside them.

### Should Replace

Do not replace CommandCore with these central files. Replace direct imports with a CommandCore engine adapter.

## Module: Hermes-Specific Identity and Context

### Purpose

Loads Hermes identity, instruction files, and user context.

### Responsibilities

- Load SOUL/HERMES/AGENTS/CLAUDE/cursor instruction files.
- Build identity and behavior prompts.
- Inject memory and skill context.

### Dependencies

- `agent/prompt_builder.py`
- Context files
- Skills
- Memory providers

### Strengths

- Flexible and local-first.
- Supports project-specific instructions.

### Weaknesses

- Identity assumptions conflict with CommandCore executive hierarchy if used directly.
- Enterprise context requires stricter scoping.

### Should Keep

- Context ingestion pattern.

### Should Improve

- Make CommandCore the owner of executive identity, company context, task context, and capability policy.

### Should Replace

Replace Hermes identity injection when Hermes runs as a CommandCore engine. Do not replace CommandCore identity.

## Module: Governance Gap

### Purpose

Describes the difference between Hermes tools/skills and CommandCore capabilities.

### Responsibilities

- Tools and skills provide capability-like behavior.
- CommandCore must govern capability review, ownership, security, and reuse.

### Dependencies

- `tools/`
- `skills/`
- `plugins/`
- CommandCore Living Capability Library

### Strengths

- Hermes has many reusable candidates.

### Weaknesses

- Missing CommandCore metadata: owner, status, version, risk, audit, company scope, product consumers, and review outcome.

### Should Keep

- Existing tool and skill functionality.

### Should Improve

- Establish import/review workflow into CommandCore Capability Reviews.

### Should Replace

Do not replace CommandCore governance with Hermes discovery.

## Module: Configuration Complexity

### Purpose

Hermes supports many providers, extras, platforms, and runtime options.

### Responsibilities

- Load config and environment variables.
- Manage provider choices.
- Enable optional integrations.
- Support profiles and home directories.

### Dependencies

- `hermes_cli/config`
- `.env`
- `~/.hermes/config.yaml`
- Optional extras and platform SDKs

### Strengths

- Flexible and user-configurable.
- Supports many deployment styles.

### Weaknesses

- Large configuration surface increases integration and support complexity.
- Config ownership must not conflict with CommandCore settings.

### Should Keep

- Profile-aware config ideas.
- Optional integration model.

### Should Improve

- Define which config is engine-local versus CommandCore-owned.
- Centralize secrets and provider policy in CommandCore.

### Should Replace

Do not replace CommandCore configuration. Hermes config should become nested engine config.

## Module: Optional Dependency Surface

### Purpose

Allows many features to be installed only when needed.

### Responsibilities

- Define extras for messaging, cron, MCP, home assistant, SMS, computer use, ACP, cloud providers, web, TTS, and more.

### Dependencies

- `pyproject.toml`
- Optional provider SDKs

### Strengths

- Lean core install.
- Reduced unnecessary dependency exposure.

### Weaknesses

- Feature availability can vary between environments.
- Enterprise deployment needs predictable capability manifests.

### Should Keep

- Optional extras model.

### Should Improve

- Publish CommandCore capability manifests per deployed engine profile.

### Should Replace

Do not replace CommandCore deployment definitions. Use Hermes extras inside controlled profiles.

## Module: Test Boundary

### Purpose

Hermes tests validate Hermes behavior.

### Responsibilities

- Protect runtime behavior.
- Validate tools, providers, and interfaces.

### Dependencies

- `tests/`
- `pytest`
- Optional integration environments

### Strengths

- Broad existing coverage.

### Weaknesses

- No CommandCore adapter tests yet.
- Hermes tests cannot prove CommandCore architectural fit.

### Should Keep

- Hermes tests as upstream confidence.

### Should Improve

- Add CommandCore adapter contract tests before integration.

### Should Replace

Do not replace CommandCore tests with Hermes tests.

