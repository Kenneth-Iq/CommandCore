# 03 - Service Architecture

## Current Runtime Services

The deployed/service architecture is centered on Python Core and auxiliary workspace services.

```text
Electron App
  REST + WebSocket
Jarvis Core / FastAPI
  SQLite ledger
  Hermes or Mock engine
  Odysseus API client
  Telegram API
  ntfy
Docker Compose
  Odysseus
  ChromaDB
  SearXNG
  ntfy
```

## Module: Jarvis Core Service

### Purpose

Primary service-side orchestrator for missions and agent fleet workflows.

### Responsibilities

- HTTP API and WebSocket event stream.
- Mission lifecycle management.
- Approval brokerage.
- Event persistence and broadcast.
- Schedule execution.
- Telegram long-poll command bridge.

### Dependencies

- `jarvis_core.app`, `MissionManager`, `Ledger`, `EventHub`, `ApprovalBroker`, `Scheduler`, `TelegramBridge`, `OdysseusClient`, engine factory.

### Strengths

- Service is small and cohesive around mission orchestration.
- Lifespan initialization wires all major dependencies clearly.
- Shutdown closes scheduler, Telegram bridge, mission workers, and ledger.

### Weaknesses

- All service dependencies are constructed directly in `create_app`.
- No explicit dependency injection container.
- No authentication on Core REST/WebSocket endpoints in current code.

### Should Keep

- FastAPI lifespan wiring.
- App state as central holder for runtime services.
- Localhost binding defaults.

### Should Improve

- Document trust boundary for Core endpoints.
- Add a stable service dependency map for future maintainers.

### Should Replace

- Replace unauthenticated service exposure with a documented local-auth or token model when Core leaves localhost-only use.

## Module: Ledger Service

### Purpose

Thread-safe SQLite persistence for mission state, events, approvals, agent runs, schedules, and audit actions.

### Responsibilities

- Create and update mission rows.
- Persist events and replay event history.
- Persist approvals and conditional resolution state.
- Store agent run status.
- Store scheduled missions.
- Store audit actions.

### Dependencies

- Python `sqlite3`, `threading.Lock`, filesystem path from `Settings`.

### Strengths

- Simple, local-first, inspectable persistence.
- WAL mode supports concurrent-ish reads with one guarded connection.
- Conditional approval resolution avoids common race conditions.

### Weaknesses

- Schema is embedded in a string constant.
- Migration logic is manually coded in constructor.
- Single connection guarded by one lock limits scalability.

### Should Keep

- SQLite local-first persistence.
- Event and action tables.
- Mission status model.

### Should Improve

- Add schema versioning.
- Document table ownership and event retention expectations.

### Should Replace

- Replace constructor-based migrations with a formal migration mechanism while preserving table semantics.

## Module: EventHub

### Purpose

Persist and fan out events from service and worker threads to WebSocket subscribers.

### Responsibilities

- Create event envelopes.
- Persist each event to the ledger.
- Maintain subscriber queues.
- Broadcast events safely from worker threads to the event loop.

### Dependencies

- `Ledger`, `asyncio.Queue`, FastAPI WebSocket endpoint.

### Strengths

- Event protocol is simple and versioned with `v: 1`.
- Works across worker threads.
- Supports live stream and replay via ledger.

### Weaknesses

- No subscriber backpressure strategy.
- Event schema is implicit in producers/tests.

### Should Keep

- Event envelope structure.
- Persist-then-broadcast design.

### Should Improve

- Document event types and payloads in API docs.
- Add retention/backpressure policy if event volume grows.

### Should Replace

- Replace implicit event schema knowledge with an explicit contract document or generated schema.

## Module: Scheduler and ntfy

### Purpose

Run due scheduled missions and notify completion through ntfy.

### Responsibilities

- Evaluate cron schedules.
- Launch missions with unattended auto-approval ceiling.
- Update schedule metadata.
- Wait for terminal mission status.
- Notify ntfy topic.

### Dependencies

- `croniter`, `httpx`, `Ledger`, `MissionManager`, `Settings`.

### Strengths

- Keeps unattended actions bounded to tier 1.
- Notification is decoupled and best-effort.
- Schedule API is covered by tests.

### Weaknesses

- In-process thread scheduler only.
- Polling for mission completion is simple but not event-driven.

### Should Keep

- Sentinel concept.
- Auto-approval ceiling.
- ntfy integration.

### Should Improve

- Document schedule semantics and failure behavior.
- Consider event-driven notification internally while keeping current behavior.

### Should Replace

- Replace polling completion wait with event subscription if scheduler load grows, preserving notifications.

## Module: Docker Compose Services

### Purpose

Bundle Core with Odysseus research/workspace services and supporting tools.

### Responsibilities

- Build and run Core.
- Build and run Odysseus from sibling checkout.
- Provide ChromaDB vector store to Odysseus.
- Provide SearXNG search to Odysseus and Hermes.
- Provide ntfy notifications.

### Dependencies

- Docker, Docker Compose, Odysseus repository, ChromaDB, SearXNG, ntfy.

### Strengths

- Concrete operational stack.
- Explicit env vars.
- Mostly localhost-bound.

### Weaknesses

- External sibling repository is required.
- Compose file is still Jarvis/Odysseus-specific and not yet CommandCore-generalized.

### Should Keep

- Self-hosted compose option.
- SearXNG and ntfy services.

### Should Improve

- Document required external repositories and version assumptions.

### Should Replace

- Replace undocumented local path dependencies with a repeatable setup process.
