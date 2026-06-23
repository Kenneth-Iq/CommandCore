# Hermes Architecture Review: Desktop and Human Interface Architecture

## Overview

Hermes has several human-facing interfaces, but it does not have a CommandCore-style desktop Nexus. Its interfaces are agent operation surfaces: CLI, TUI, messaging, IDE ACP, and web/documentation assets.

## Module: CLI

### Purpose

Provides the main interactive terminal interface.

### Responsibilities

- Prompt input.
- Slash command handling.
- Conversation display.
- Setup and configuration.
- Tool progress display.
- Session management.

### Dependencies

- `cli.py`
- `hermes_cli/commands.py`
- `prompt_toolkit`
- `rich`
- `AIAgent`
- `SessionDB`

### Strengths

- Mature terminal ergonomics.
- Central command registry.
- Strong session controls.

### Weaknesses

- Built around individual agent interaction, not enterprise headquarters workflows.
- Not suitable as the Nexus UI.

### Should Keep

- CLI interaction patterns.
- Setup, doctor, and command registry ideas.
- Developer-facing diagnostics.

### Should Improve

- Keep any CLI integration developer-focused.
- Route actions through CommandCore APIs if adopted.

### Should Replace

Do not replace the Nexus desktop with Hermes CLI.

## Module: TUI

### Purpose

Provides an Ink/React terminal UI backed by Python runtime logic.

### Responsibilities

- Render terminal UI.
- Communicate with Python via JSON-RPC over stdio.
- Preserve runtime ownership in Python.

### Dependencies

- `ui-tui/`
- `tui_gateway/`
- Node runtime
- Hermes Python runtime

### Strengths

- Clear UI/runtime split.
- Useful model for a local developer cockpit.

### Weaknesses

- Terminal UI does not model CommandCore companies, worlds, or executive operations.
- Separate Node dependency adds operational surface.

### Should Keep

- JSON-RPC split.
- Terminal dashboard concept for engine inspection.

### Should Improve

- Treat as reference for future CommandCore developer tools.

### Should Replace

Do not replace CommandCore desktop, Nexus, or local productivity UI.

## Module: Messaging Interfaces

### Purpose

Allows users to interact with Hermes through chat platforms.

### Responsibilities

- Receive messages and attachments.
- Preserve conversation continuity.
- Support slash commands.
- Deliver agent responses.
- Handle voice and media where supported.

### Dependencies

- `gateway/`
- Platform SDKs and APIs
- Delivery router
- Gateway session store

### Strengths

- Broad platform reach.
- Practical remote agent operation.
- Supports asynchronous and queued workflows.

### Weaknesses

- Messaging sessions are not mapped to CommandCore organizational objects.
- Platform-specific behavior creates complexity.

### Should Keep

- Platform adapters.
- Delivery routing.
- Session mapping ideas.

### Should Improve

- Add CommandCore identity, organization, project, and task context.
- Use messaging as optional notification and command surfaces.

### Should Replace

Do not replace CommandCore desktop workflows with messaging workflows.

## Module: ACP IDE Interface

### Purpose

Connects Hermes to developer editors through Agent Client Protocol.

### Responsibilities

- Manage ACP sessions.
- Expose model selection.
- Send context usage updates.
- Bridge editor prompts into agent turns.

### Dependencies

- `acp_adapter/`
- ACP-compatible editors
- Hermes model and session systems

### Strengths

- Strong developer productivity potential.
- Good candidate for CommandCore engineering workspaces.

### Weaknesses

- Editor model is narrower than CommandCore enterprise operations.

### Should Keep

- ACP integration option.
- Context usage display pattern.

### Should Improve

- Connect ACP sessions to CommandCore projects and repositories.

### Should Replace

Do not replace CommandCore agent layer with ACP. ACP should be a client channel.

## Module: Web and Website Assets

### Purpose

Provide documentation and possibly web-facing support assets.

### Responsibilities

- Maintain Docusaurus documentation.
- Provide public project docs and guides.

### Dependencies

- `website/`
- Docusaurus/Node ecosystem

### Strengths

- Good documentation infrastructure.

### Weaknesses

- Not an application UI for CommandCore.

### Should Keep

- Documentation patterns.

### Should Improve

- Use as reference for developer docs if needed.

### Should Replace

Do not replace CommandCore docs or UI architecture with Hermes website assets.

