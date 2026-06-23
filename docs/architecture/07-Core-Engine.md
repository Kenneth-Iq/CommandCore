# 07 - Core Engine

## Core Engine Overview

The Core engine is the service-side execution model inside `core/jarvis_core`. It is not a single file; it is the collaboration of Settings, FastAPI app, Ledger, EventHub, ApprovalBroker, MissionManager, Planner, Roles, Tiers, Engines, Scheduler, TelegramBridge, and OdysseusClient.

## Module: Settings

### Purpose

Runtime configuration for Core.

### Responsibilities

- Read environment variables.
- Define host, port, engine, sandbox root, roles path, schedules path, timeouts, Odysseus, ntfy, Telegram, and version.
- Resolve ledger path.

### Dependencies

- Environment variables, filesystem paths.

### Strengths

- Simple dataclass.
- Reasonable defaults.

### Weaknesses

- No validation beyond type conversion.
- Defaults still use Jarvis naming and paths.

### Should Keep

- Central settings object.

### Should Improve

- Validate settings at startup.
- Document environment variables.

### Should Replace

- Replace implicit conversion errors with explicit validation messages.

## Module: MissionManager

### Purpose

Own mission lifecycle and fleet execution.

### Responsibilities

- Create missions.
- Cancel queued/running/research missions.
- Execute chat, mission, and research modes.
- Generate plans.
- Request plan approval.
- Run staged fleet tasks.
- Synthesize sitreps.
- Write completed mission summaries to Odysseus memory.

### Dependencies

- Settings, Ledger, EventHub, ApprovalBroker, Engine, roles, OdysseusClient, Planner, Tiers.

### Strengths

- Mission flow is readable and well tested.
- Cancellation safe points are explicit.
- Fleet stage execution supports parallelism.
- Research mode delegates to Odysseus cleanly.

### Weaknesses

- One global mission executor.
- Blocking worker model.
- Uses dictionaries rather than typed domain models.

### Should Keep

- Mode separation.
- Approval gates.
- Fleet stage model.
- Cancellation behavior.

### Should Improve

- Add explicit mission domain models.
- Document cancellation guarantees.

### Should Replace

- Replace raw dict plumbing with typed models while preserving current API payloads.

## Module: ApprovalBroker

### Purpose

Bridge blocking engine threads to human approval decisions.

### Responsibilities

- Create approval records.
- Emit approval requested events.
- Block until approval, denial, or timeout.
- Resolve races between timeout and user decision.

### Dependencies

- Ledger, EventHub, threading events.

### Strengths

- Race handling is centralized.
- Works with REST, desktop confirmation, and Telegram callbacks.

### Weaknesses

- Approval timeouts are simple per-request waits.
- Pending map is in memory.

### Should Keep

- Blocking approval contract for engines.
- Conditional ledger resolution.

### Should Improve

- Document approval lifecycle and timeout behavior.

### Should Replace

- Replace in-memory-only pending state if distributed Core workers are ever introduced.

## Module: Tiers

### Purpose

Classify flagged commands into approval tiers.

### Responsibilities

- Detect read-only, send/post, destructive, outside-sandbox, and Odysseus synthetic commands.
- Return tier and action label.

### Dependencies

- Regexes and sandbox root path.

### Strengths

- Simple conservative classifier.
- Explicit Odysseus tool handling.

### Weaknesses

- Regex-based shell understanding is approximate.
- Windows path detection is explicit; POSIX outside-root detection is less complete.

### Should Keep

- Tier model.
- Conservative defaults.

### Should Improve

- Expand path classification for POSIX and shell variants.

### Should Replace

- Replace regex-only shell classification with parsed command analysis if command execution grows.

## Module: OdysseusClient

### Purpose

Never-raising client for Odysseus memory and research APIs.

### Responsibilities

- Search memory by fetching token-scoped memory list and ranking locally.
- Add memory.
- Start, poll, cancel, and retrieve deep research sessions.

### Dependencies

- httpx, Odysseus `/api/codex/*` routes.

### Strengths

- Gracefully no-ops when unconfigured.
- Never raises into mission flow.
- Research lifecycle is covered by tests with fakes.

### Weaknesses

- Memory search is client-side keyword overlap.
- Route compatibility is captured in comments rather than formal integration docs.

### Should Keep

- No-op when disabled.
- Token-scoped codex routes.

### Should Improve

- Document Odysseus route contract.
- Revisit search strategy if memory grows.

### Should Replace

- Replace client-side memory ranking with server-side search when Odysseus exposes a token-scoped search route.
