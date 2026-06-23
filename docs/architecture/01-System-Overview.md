# 01 - System Overview

## Scope

This document records the current CommandCore codebase as found in the repository. The system is still named Jarvis in code, package metadata, APIs, folders, and UI copy. This is a legacy enterprise architecture review, not a redesign.

## Current System Shape

CommandCore currently consists of:

- `core/`: Python FastAPI service named `jarvis-core`.
- `app/`: Electron desktop application named Jarvis / Command Bridge.
- `docker/`: Docker Compose stack for Core, Odysseus, ChromaDB, SearXNG, and ntfy.
- `services/`: local persisted service data for Core and Odysseus.
- `docs/legacy/jarvis/`: phase specifications and the original Jarvis PRD.
- `docs/product/` and `docs/blueprint/`: new CommandCore product and architecture direction.

The current architecture is a two-brain system:

1. Python Core is the primary mission orchestration brain when online.
2. Electron main process keeps a local fallback agentic loop for offline or Core-unavailable operation.

## Module: Python Core Service

### Purpose

Mission orchestration service for chat, mission, and research workflows.

### Responsibilities

- Expose REST and WebSocket APIs.
- Persist missions, events, approvals, agent runs, schedules, and actions in SQLite.
- Plan missions through a pluggable engine.
- Execute staged agent fleets.
- Broker approvals.
- Run scheduled Sentinel missions.
- Bridge to Odysseus memory and research APIs.
- Bridge to Telegram for remote command and approval.

### Dependencies

- FastAPI, Uvicorn, Pydantic, PyYAML, httpx, croniter.
- SQLite via Python standard library.
- Optional Hermes agent package.
- Optional Odysseus HTTP API.
- Optional Telegram Bot API.
- Optional ntfy service.

### Strengths

- Clear FastAPI boundary.
- Strong event protocol and replay model.
- Deterministic mock engine for tests.
- Approval broker and role ceilings are explicit.
- Mission, fleet, research, scheduler, and Telegram behavior have test coverage.

### Weaknesses

- Still branded and named Jarvis throughout code.
- Single mission worker limits throughput by design.
- SQLite migrations are inline and manual.
- Core and desktop fallback duplicate approval/audit concepts.
- Hermes dependency is external and lazy-loaded.

### Should Keep

- FastAPI service boundary.
- Engine protocol abstraction.
- SQLite ledger for local-first operation.
- EventHub and WebSocket stream.
- ApprovalBroker and action audit trail.
- MockEngine test/development path.

### Should Improve

- Document the stable event contract as a first-class API artifact.
- Make migrations explicit and versioned.
- Clarify naming transition from Jarvis to CommandCore without breaking legacy compatibility.
- Align Core audit semantics with desktop fallback audit semantics.

### Should Replace

- Replace ad hoc inline schema migration mechanics with a formal migration layer while preserving the existing ledger data and behavior.
- Replace direct global process assumptions in engine setup with configuration-owned runtime state when practical.

## Module: Electron Desktop Application

### Purpose

Windows-oriented desktop command surface with overlay, expanded panel, voice pipeline, Core connectivity, and local fallback agent loop.

### Responsibilities

- Launch tray app, overlay, and expanded panel windows.
- Provide renderer-safe IPC through preload bridge.
- Manage credentials through Electron `safeStorage`.
- Connect to Core over REST and WebSocket.
- Render mission events, approvals, files, tools, integrations, logs, and Command Bridge UI.
- Run local fallback agentic loop when Core is offline.
- Run voice pipeline and proactive alerts.

### Dependencies

- Electron, electron-vite, React, Zustand, OpenAI SDK, sql.js, ssh2, ws, js-yaml, lucide-react, framer-motion.
- NVIDIA NIM-compatible OpenAI APIs.
- Optional Ollama.
- Optional Microsoft Graph.
- Optional Piper and openWakeWord resources.

### Strengths

- Clear process separation through preload bridge.
- Core connectivity is optional and degrades to local loop.
- User confirmation protocol is visible in UI.
- Credential storage uses OS-backed encryption when available.
- Command Bridge UI consumes Core events live.

### Weaknesses

- Main process owns many unrelated concerns.
- Local fallback duplicates Core concepts.
- Some sandbox path checks are Windows-specific.
- Undo stack is in-memory only.
- Voice state completion path is incomplete in renderer comments.

### Should Keep

- Tray, overlay, and expanded panel model.
- Preload bridge and context isolation.
- Core-first with local fallback behavior.
- Credential vault behavior.
- Command Bridge event-driven UI.

### Should Improve

- Separate IPC registration by domain.
- Harmonize local fallback approval tiers with Core tiers.
- Make local fallback capabilities visibly marked in UI.
- Improve cross-platform path containment if Linux/macOS are future targets.

### Should Replace

- Replace in-memory undo with persisted undo records if undo remains a first-class capability.
- Replace duplicated local/Core audit vocabulary with a shared contract while preserving both flows.

## Module: Docker and Services

### Purpose

Self-hosted runtime environment for Core plus workspace/research services.

### Responsibilities

- Build and expose `jarvis-core`.
- Run Odysseus from a sibling checkout.
- Run ChromaDB, SearXNG, and ntfy.
- Persist Core and Odysseus data under `services/`.

### Dependencies

- Docker Compose.
- Sibling `../../odysseus` checkout.
- ChromaDB image.
- SearXNG image pinned to a specific tag.
- ntfy image.

### Strengths

- Local-only port binding to `127.0.0.1`.
- Clear environment variable contract.
- Persistent volumes and host directories are separated.
- SearXNG version is pinned because of known upstream instability.

### Weaknesses

- Compose references a sibling checkout outside this repository.
- README mentions ChromaDB while current blueprint references Qdrant/X10 separately.
- Runtime data is present in repository working tree.
- Docker env sample is referenced but not present in current file list.

### Should Keep

- Containerized Core path.
- SearXNG and ntfy support.
- Localhost-only exposure defaults.
- Persistent service data separation.

### Should Improve

- Document required sibling dependencies.
- Clarify legacy ChromaDB versus future Qdrant direction.
- Move runtime data handling policy into documentation.

### Should Replace

- Replace implicit sibling checkout assumptions with documented setup checks or configuration, preserving the Odysseus integration.
