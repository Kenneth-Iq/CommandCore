# Hermes Architecture Review: API Architecture

## Overview

Hermes exposes several API-like boundaries: model provider transports, tool schemas, slash commands, JSON-RPC for TUI, ACP for editors, messaging adapter contracts, and MCP tooling. These are useful precedents for CommandCore, but CommandCore should define its own stable system APIs.

## Module: Provider Transport API

### Purpose

Converts Hermes' internal OpenAI-like message and tool structures into provider-native requests and normalizes provider responses.

### Responsibilities

- Convert messages.
- Convert tool definitions.
- Build provider SDK kwargs.
- Normalize raw responses.
- Map finish reasons.
- Extract cache stats where supported.

### Dependencies

- `agent/transports/base.py`
- `agent/transports/chat_completions.py`
- `agent/transports/codex.py`
- Provider SDK clients
- `NormalizedResponse`

### Strengths

- Clear interface.
- Keeps conversion out of core agent loop.
- Supports multiple API modes.

### Weaknesses

- It does not define a CommandCore executive-agent protocol.
- Provider details can still leak into runtime behavior.

### Should Keep

- Transport interface pattern.
- Normalized response model.
- Provider-native conversion boundary.

### Should Improve

- Add CommandCore engine-level request and response envelopes above provider transports.
- Preserve provider metadata for audit and enterprise policy.

### Should Replace

Do not replace CommandCore's future agent API with Hermes provider transports. Use them below the CommandCore engine adapter.

## Module: Tool Schema API

### Purpose

Defines tools as model-callable function schemas with handlers and metadata.

### Responsibilities

- Register tool schemas.
- Route tool calls.
- Check tool availability.
- Support dynamic schema overrides.
- Provide result and error wrappers.

### Dependencies

- `tools/registry.py`
- `model_tools.py`
- Tool modules
- Toolsets

### Strengths

- Mature and extensible.
- Availability checks are first-class.
- Dynamic registry supports MCP refresh and optional tools.

### Weaknesses

- Tool definitions are not CommandCore capability contracts.
- Authorization and governance are Hermes-local.

### Should Keep

- Tool metadata model.
- Availability checks.
- Handler separation.
- Error/result normalization.

### Should Improve

- Map tool schemas into CommandCore Living Capability Library entries.
- Add capability ownership, review status, risk level, and company/project scope.

### Should Replace

Do not replace CommandCore's capability model. Replace direct tool exposure with governed capability exposure.

## Module: Slash Command API

### Purpose

Provides a central registry for user-facing commands across CLI, gateway, help, autocomplete, and platform mappings.

### Responsibilities

- Define command names, aliases, categories, hints, and surface restrictions.
- Drive help text and autocomplete.
- Support CLI-only and gateway-only behavior.

### Dependencies

- `hermes_cli/commands.py`
- CLI runtime
- Gateway dispatch
- Platform menus

### Strengths

- Single source of truth.
- Good command metadata.
- Supports multiple surfaces.

### Weaknesses

- Commands reflect Hermes product behavior.
- Command categories do not match CommandCore executive operations.

### Should Keep

- Central registry concept.
- Command metadata structure.
- Surface-specific command gating.

### Should Improve

- Define a CommandCore action registry for Nexus and executive workflows.
- Translate Hermes commands only where useful.

### Should Replace

Do not replace CommandCore action design with Hermes slash commands.

## Module: Gateway Adapter API

### Purpose

Abstracts platform-specific messaging details.

### Responsibilities

- Receive platform messages.
- Convert messages into Hermes events.
- Deliver responses.
- Handle platform-specific attachments, callbacks, commands, and sessions.

### Dependencies

- `gateway/`
- Platform SDKs
- Gateway config
- Delivery router

### Strengths

- Broad platform coverage.
- Adapter model has operational proof.
- Supports real communication workflows.

### Weaknesses

- Event model is Hermes-centric.
- It lacks CommandCore company, project, team, and executive context.

### Should Keep

- Adapter boundary.
- Delivery abstraction.
- Session source tracking.

### Should Improve

- Convert platform events to CommandCore events.
- Add enterprise identity, tenant, company, and audit context.

### Should Replace

Do not replace CommandCore's communication API. Hermes adapters may back selected connectors.

## Module: ACP API

### Purpose

Integrates Hermes with ACP-compatible editors.

### Responsibilities

- Advertise commands.
- Manage session state.
- Send usage updates.
- Handle model selection.
- Bridge editor content to agent turns.

### Dependencies

- `acp_adapter/server.py`
- ACP package
- Hermes runtime

### Strengths

- Strong candidate for developer workflow integration.
- Protocol boundary is explicit.

### Weaknesses

- Command and model state are Hermes-specific.
- Needs CommandCore identity and project mapping.

### Should Keep

- ACP as a possible IDE integration route.
- Usage update design.
- Session state bridge.

### Should Improve

- Route ACP requests through CommandCore agent interface.
- Attach project, company, and capability context.

### Should Replace

Do not replace CommandCore's system API with ACP. ACP is one client protocol.

## Module: MCP API

### Purpose

Allows Hermes to expose or consume Model Context Protocol tool capabilities.

### Responsibilities

- Serve tools through `mcp_serve.py`.
- Refresh dynamic MCP tools.
- Integrate external MCP servers where configured.

### Dependencies

- `mcp_serve.py`
- `tools/registry.py`
- Optional MCP extras

### Strengths

- Aligns with pluggable tool ecosystems.
- Useful for engine interoperability.

### Weaknesses

- MCP by itself is not a full CommandCore capability governance model.

### Should Keep

- MCP compatibility as a reusable interoperability layer.

### Should Improve

- Wrap MCP tools with CommandCore capability metadata and review status.

### Should Replace

Do not replace CommandCore capability governance with raw MCP exposure.

