# 04 - API Architecture

## API Surfaces

The current repository exposes two major API surfaces:

- Python Core REST and WebSocket API.
- Electron preload IPC API exposed as `window.jarvis`.

## Module: Core REST API

### Purpose

Command API for missions, approvals, audit actions, and schedules.

### Responsibilities

- `GET /health`
- `POST /missions`
- `GET /missions`
- `GET /missions/{mission_id}`
- `GET /missions/{mission_id}/events`
- `GET /missions/{mission_id}/agents`
- `POST /missions/{mission_id}/cancel`
- `GET /approvals`
- `POST /approvals/{approval_id}/resolve`
- `GET /actions`
- `GET/POST/PATCH/DELETE /schedules`

### Dependencies

- FastAPI, Pydantic request models, `MissionManager`, `Ledger`, `ApprovalBroker`, `Scheduler` data.

### Strengths

- Small, understandable REST surface.
- Pydantic validates mission modes, approval decisions, and schedule fields.
- Tests cover important lifecycle and error cases.

### Weaknesses

- API is not authenticated in current code.
- Response schema is convention-based, not formally documented.
- Some endpoint behavior depends on background threads.

### Should Keep

- REST endpoints for mission management.
- Simple envelope responses such as `{ "mission": ... }`.
- Cancel endpoint semantics.

### Should Improve

- Publish OpenAPI-derived examples for future engineers.
- Add authentication/authorization before non-local exposure.
- Document async lifecycle expectations.

### Should Replace

- Replace implicit response contracts with explicit schema documentation while preserving routes.

## Module: Core WebSocket API

### Purpose

Live event stream for Core status, mission lifecycle, agent activity, tool calls, approvals, research progress, and sitreps.

### Responsibilities

- Serve `/ws/events`.
- Send connect-time `core.status` event.
- Fan out EventHub events to clients.

### Dependencies

- FastAPI WebSocket, `EventHub`, ledger-backed events.

### Strengths

- Simple client model.
- All mission events are also persisted for replay.
- Electron desktop uses this stream to drive live UI.

### Weaknesses

- No authentication.
- No topic filtering.
- No explicit backpressure policy.

### Should Keep

- WebSocket event stream.
- Versioned event envelopes.

### Should Improve

- Document event types and payloads.
- Add connection trust model.

### Should Replace

- Replace unfiltered all-event broadcast with scoped streams if multi-user or multi-workspace support appears.

## Module: Electron Preload IPC API

### Purpose

Safe renderer-facing API exposed as `window.jarvis`.

### Responsibilities

- Send messages and audio to main process.
- Invoke file, log, feed, config, credential, Microsoft auth, Core, undo, and Ollama operations.
- Subscribe to state, response, transcription, speech, config, confirmation, proactive alert, Core event, and Core status events.

### Dependencies

- Electron `contextBridge`, `ipcRenderer`, channels registered in `app/src/main/ipc.js`.

### Strengths

- Context isolation is enabled.
- Renderer does not receive raw Node access.
- API is centralized and discoverable.

### Weaknesses

- All channel definitions live in one large file.
- Listener cleanup uses `removeAllListeners` per channel, which can affect multiple subscribers.
- API names retain Jarvis branding.

### Should Keep

- Preload bridge pattern.
- Explicit API methods.

### Should Improve

- Group APIs by domain.
- Document channel ownership and payloads.
- Use per-callback listener removal if multiple subscribers become common.

### Should Replace

- Replace one monolithic IPC registration with domain modules while preserving public `window.jarvis` compatibility.

## Module: Core Client API in Desktop

### Purpose

Electron main-process client for Core REST and WebSocket APIs.

### Responsibilities

- Connect/reconnect WebSocket.
- Forward events to renderer.
- Track online/offline state.
- Create chat missions and resolve final assistant text.
- Expose wrappers for missions, approvals, and schedules.

### Dependencies

- `ws`, global `fetch`, Core service endpoints.

### Strengths

- Reconnect backoff exists.
- Core unavailability is non-fatal.
- Pending chat promises resolve from event stream.

### Weaknesses

- Pending chat timeout is fixed at 120 seconds.
- No request cancellation path for pending chat calls.
- Online state is derived from WebSocket state only.

### Should Keep

- Optional Core connectivity.
- WebSocket-driven chat resolution.

### Should Improve

- Document timeout semantics.
- Expose cancel for long-running pending chat if needed.

### Should Replace

- Replace WebSocket-only online determination with combined health/WebSocket state if reliability requires it.
