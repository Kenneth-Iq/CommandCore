# 08 - Current Capabilities

## Capability Inventory

This file documents what the current code can do. It does not imply all capabilities are production-ready.

## Module: Mission Orchestration

### Purpose

Run chat, planned missions, and research missions.

### Responsibilities

- Create missions.
- Stream events.
- Track statuses.
- Cancel missions.
- Store mission history.

### Dependencies

- Core API, MissionManager, Ledger, Engine, EventHub.

### Strengths

- Tested lifecycle.
- Event replay and live stream.

### Weaknesses

- Single mission worker.
- No multi-user authorization.

### Should Keep

- Mission model and event stream.

### Should Improve

- Document mission modes and statuses.

### Should Replace

- Replace untyped payloads with typed models over time.

## Module: Fleet Agents

### Purpose

Execute staged role-agent plans.

### Responsibilities

- Plan tasks.
- Spawn role-specific agent runs.
- Execute stages in order with parallelism inside stages.
- Synthesize sitrep.

### Dependencies

- Planner, roles, engine, ledger.

### Strengths

- Clear role ceilings.
- Stage parallelism tested.

### Weaknesses

- Planning relies on LLM output format.

### Should Keep

- Fleet planning and staged execution.

### Should Improve

- Formalize plan schema.

### Should Replace

- Replace fragile parsing once structured output is reliable.

## Module: Approval and Audit

### Purpose

Prevent unsafe actions without human approval and record action lineage.

### Responsibilities

- Classify action tiers.
- Request approvals.
- Resolve approval decisions.
- Log actions.

### Dependencies

- Core tiers, ApprovalBroker, Ledger, desktop confirmation dialog, local tool registry.

### Strengths

- Approval tests cover approve, deny, timeout, double resolve, ceiling denial.
- Desktop and Telegram can both resolve approvals.

### Weaknesses

- Core and desktop fallback have separate audit stores.

### Should Keep

- Tier model and approval UX.

### Should Improve

- Normalize audit vocabulary.

### Should Replace

- Replace duplicated audit stores with a shared record model when local/Core unification is addressed.

## Module: Research

### Purpose

Support deep research and feed gathering.

### Responsibilities

- Core research mode delegates to Odysseus.
- Desktop research tools fetch ArXiv, Reddit, RSS, and save articles.
- Docker stack provides SearXNG for web search.

### Dependencies

- Odysseus, SearXNG, public web APIs, sandbox.

### Strengths

- Deep research lifecycle is tested.
- Research reports are written back to memory.

### Weaknesses

- Desktop feed parsing is manual and best-effort.
- Odysseus is external to this repo.

### Should Keep

- Research mode and Innovation-oriented feed tools.

### Should Improve

- Document external research service setup.

### Should Replace

- Replace manual XML parsing with robust parsing libraries if feeds become core.

## Module: Workspace Tools

### Purpose

Operate email, calendar, server, memory, social, and file capabilities.

### Responsibilities

- Microsoft Graph email/calendar.
- SSH/REST server status and allowlisted commands.
- Local YAML memory.
- Social draft/post tools.
- Sandbox file operations.

### Dependencies

- Graph OAuth, credentials, ssh2, social APIs, sandbox, tool registry.

### Strengths

- Broad local operator capability.
- Tiered actions protect sends, posts, destructive actions, and server commands.

### Weaknesses

- Many integrations are not covered by automated tests.
- Some capabilities exist only in desktop fallback, not Core.

### Should Keep

- Tool modularity and tier metadata.

### Should Improve

- Add integration health checks and tests.

### Should Replace

- Replace desktop-only integration ownership with shared service contracts if Core becomes the canonical engine.

## Module: Voice and Desktop UX

### Purpose

Provide voice-first local command bridge.

### Responsibilities

- Wake word or shortcut activation.
- STT, TTS, overlay, expanded panel, Command Bridge.
- Proactive alerts and glance feeds.

### Dependencies

- Electron, OpenAI-compatible ASR, Piper, openWakeWord, public feed APIs.

### Strengths

- Works without wake word/TTS resources via graceful fallback.
- Command Bridge gives live mission visibility.

### Weaknesses

- Windows-oriented resources and paths.
- Speaking completion state is not fully closed loop.

### Should Keep

- Voice-first desktop surface.

### Should Improve

- Complete state lifecycle and setup documentation.

### Should Replace

- Replace hard-coded resource paths with configurable paths.
