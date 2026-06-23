# Hermes Architecture Review: Service Architecture

## Overview

Hermes is not a microservice system in the CommandCore sense. It is primarily a local-first agent runtime with optional long-running services, adapters, scheduled jobs, and external provider integrations.

## Module: Agent Process

### Purpose

Runs the core Hermes agent loop.

### Responsibilities

- Accept user prompts.
- Build context.
- Call model providers.
- Execute tools.
- Stream or return results to calling surfaces.

### Dependencies

- `run_agent.py`
- `agent/`
- `model_tools.py`
- `tools/`
- Provider APIs
- Local filesystem
- Optional `SessionDB`

### Strengths

- Local-first execution.
- Provider-agnostic enough to support many backends.
- Supports callbacks for service-like surfaces.

### Weaknesses

- Large process object carries many concerns.
- CommandCore would need a stable engine boundary before embedding or supervising it.

### Should Keep

- Agent process as an engine candidate.
- Callback hooks for integration surfaces.
- Provider and tool flexibility.

### Should Improve

- Define a narrow CommandCore execution contract.
- Isolate engine config from CommandCore system config.

### Should Replace

Do not replace CommandCore's planned service architecture. Hermes should run behind a CommandCore-owned adapter if used.

## Module: Messaging Gateway Service

### Purpose

Runs Hermes as a long-lived messaging gateway across supported chat and communication platforms.

### Responsibilities

- Manage platform adapters.
- Maintain session state by platform/thread/user.
- Route messages to cached or new agent instances.
- Deliver agent responses back to platforms.
- Handle approvals, queues, interrupts, restarts, and delivery errors.

### Dependencies

- `gateway/run.py`
- `gateway/` platform adapters
- Gateway config
- `AIAgent`
- `SessionStore`
- `DeliveryRouter`
- Optional platform SDKs

### Strengths

- Strong real-world service behavior.
- Many platform integrations.
- Rich session continuity and queue semantics.

### Weaknesses

- Complex controller with many responsibilities.
- Not organized around CommandCore companies, Nexus, executive roles, or capability governance.

### Should Keep

- Platform adapter pattern.
- Delivery router concept.
- Session continuity handling.
- Approval workflow references.

### Should Improve

- Wrap platform events into CommandCore event envelopes.
- Map sessions to CommandCore agents, tasks, companies, or projects before reuse.

### Should Replace

Do not replace CommandCore communication services. Use Hermes gateway pieces as candidate adapters.

## Module: Cron Scheduler Service

### Purpose

Executes scheduled automations with or without agent involvement.

### Responsibilities

- Resolve cron jobs.
- Execute no-agent scripts.
- Run agent-backed jobs.
- Deliver job output to configured targets.
- Detect prompt-injection concerns in job inputs.

### Dependencies

- `cron/scheduler.py`
- Cron configuration
- `AIAgent`
- Local subprocess execution
- Delivery integrations

### Strengths

- Practical local automation.
- Supports silent watchdog-style jobs.
- Separates script-only jobs from agent jobs.

### Weaknesses

- Job model is Hermes-specific.
- Needs CommandCore task, capability, and approval mapping.

### Should Keep

- Script-only scheduled job model.
- Agent-backed scheduled job model.
- Delivery target abstraction.
- Injection scanning concepts.

### Should Improve

- Represent jobs as CommandCore tasks or capability executions.
- Apply CommandCore audit and governance metadata.

### Should Replace

Do not replace CommandCore task architecture. Reuse scheduler concepts through a CommandCore adapter.

## Module: ACP Adapter Service

### Purpose

Exposes Hermes to editor clients that speak Agent Client Protocol.

### Responsibilities

- Manage ACP sessions.
- Advertise slash commands.
- Build model selector state.
- Convert content between ACP and Hermes runtime.
- Stream usage and status updates.

### Dependencies

- `acp_adapter/server.py`
- ACP library
- `SessionManager`
- `AIAgent`
- Hermes model catalog

### Strengths

- Useful IDE integration path.
- Model selection and context usage are exposed to editor clients.
- Keeps editor protocol separate from core runtime.

### Weaknesses

- Advertised commands are Hermes-specific.
- Does not know CommandCore executive hierarchy or companies.

### Should Keep

- ACP bridge as a reusable candidate.
- Protocol adapter pattern.
- Model-state reporting.

### Should Improve

- Translate ACP sessions into CommandCore agent sessions.
- Replace Hermes command names with CommandCore-approved actions if adopted.

### Should Replace

Do not replace CommandCore's future IDE integration strategy. Hermes ACP can inform or power one engine-specific bridge.

## Module: TUI Gateway

### Purpose

Connects TypeScript terminal UI to Python Hermes runtime through JSON-RPC over stdio.

### Responsibilities

- Own runtime/session behavior in Python.
- Own rendering in TypeScript.
- Pass structured events between layers.

### Dependencies

- `ui-tui/`
- `tui_gateway/`
- Node runtime
- Hermes Python runtime

### Strengths

- Clean language boundary.
- Avoids duplicating runtime logic in frontend code.

### Weaknesses

- TUI is not the Nexus.
- UX model is terminal-agent-centric.

### Should Keep

- JSON-RPC separation pattern.
- Terminal UI as a possible developer tool.

### Should Improve

- Reframe any reused TUI elements as engine diagnostics or developer console.

### Should Replace

Do not replace the Nexus with the Hermes TUI.

## Module: External Services

### Purpose

Hermes integrates with model providers, search providers, browser automation, memory providers, platform APIs, and sandbox environments.

### Responsibilities

- Provide model execution.
- Provide web/search/browser capabilities.
- Provide messaging delivery.
- Provide external memory or tool storage.
- Provide isolated compute environments.

### Dependencies

- Provider APIs and SDKs.
- Optional Python extras.
- Optional Node browser tooling.
- Docker, SSH, Modal, Daytona, Vercel Sandbox, Singularity, and similar backends.

### Strengths

- Low vendor lock-in.
- Broad external ecosystem.
- Optional extras reduce required install surface.

### Weaknesses

- Operational complexity grows with enabled integrations.
- External provider behavior is not governed by CommandCore yet.

### Should Keep

- Multi-provider stance.
- Optional dependency model.
- Sandbox backend abstraction.

### Should Improve

- Register external services in CommandCore capability metadata.
- Apply enterprise policy to provider selection and secrets.

### Should Replace

Do not replace CommandCore infrastructure policy. Hermes external services must conform to it.

