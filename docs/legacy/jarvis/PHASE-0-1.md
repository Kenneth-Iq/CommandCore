# Phase 0–1 Specification — The Spine

**Version:** 1.0 · **Date:** 2026-06-11 · **Parent:** VISION.md §7
**Scope:** Phase 0 (foundation) and Phase 1 (the spine). Phases 2–4 are specced just-in-time at the end of Phase 1.

---

## 0. Outcome

At the end of Phase 1:

- The repo is a platform monorepo: `app\` (Electron Command Bridge), `core\` (Jarvis Core, Python), `services\` (Odysseus deployment), `docker\` (compose stack).
- Jarvis Core runs as a FastAPI service exposing a REST command API and a WebSocket event stream.
- Jarvis Prime (a Hermes `AIAgent`) executes missions inside Core; every tool call, status change, and approval surfaces as a typed event.
- The Electron app talks to Core instead of its own `llm.js` loop — with graceful fallback to the local loop when Core is down (PRD principle 5).
- T2+ actions pause in Core's approval broker and resolve from the Electron confirmation dialog.
- `docker compose up` brings up Core + Odysseus + ChromaDB + SearXNG + ntfy.

**Demo script (Phase 1 exit):** say or type "create a file called hello.md with a greeting, then read it back" → watch `tool.call` events stream in the UI → file appears under `C:\jarvis\` → spoken/text response returns. Then: "delete hello.md" → approval card appears → approve → deletion executes and is audit-logged.

---

## 1. Frozen contracts

These three contracts are the expensive-to-change seams. Everything else in this spec is implementation guidance and may drift; **changes to §1.1–1.3 require a version bump and a note in VISION.md §8.**

### 1.1 Event protocol v1

Transport: WebSocket `ws://127.0.0.1:8765/ws/events`. Server→client only (commands go over REST). JSON, one event per message:

```json
{
  "v": 1,
  "id": "evt_<uuid4>",
  "ts": "2026-06-11T14:32:08.123Z",
  "mission_id": "m_<uuid4>",
  "agent_id": "prime",
  "type": "tool.call",
  "payload": { }
}
```

- `v` — protocol version, always `1` for this spec.
- `mission_id` — null only for `alert` and `core.status` events.
- `agent_id` — `"prime"` in Phase 1; role instance ids (`"researcher-1"`) arrive in Phase 2. Null for mission-level events.
- Ordering: events for one mission are emitted in order; clients must not assume global ordering across missions.
- Replay: `GET /missions/{id}/events` returns the persisted event list so a reconnecting client can catch up; the WS stream is fire-and-forget.

| `type` | `payload` | Emitted when |
|---|---|---|
| `core.status` | `{state: "ready"\|"degraded", engine, version}` | On WS connect + state changes |
| `mission.created` | `{title, prompt, mode}` | Mission accepted |
| `mission.status` | `{status}` | Ledger status transitions |
| `agent.spawned` | `{role, model}` | Agent starts (Prime in P1; fleet in P2) |
| `agent.status` | `{state: "thinking"\|"acting"\|"waiting_approval"\|"done", detail}` | Engine status callbacks |
| `assistant.delta` | `{text}` | Streaming token chunks |
| `assistant.message` | `{text, final: bool}` | Complete assistant turn |
| `tool.call` | `{call_id, tool, args_preview}` | Tool execution starts |
| `tool.result` | `{call_id, tool, ok: bool, result_preview}` | Tool execution ends |
| `approval.requested` | `{approval_id, tier, action, description, expires_at}` | T2+ action pauses |
| `approval.resolved` | `{approval_id, decision, resolved_by}` | Commander decides |
| `sitrep` | `{text}` | Agent files a progress report (P2; reserved) |
| `mission.completed` | `{result_summary, artifacts_dir}` | Mission ends successfully |
| `mission.failed` | `{error}` | Mission ends in error |
| `alert` | `{severity, text}` | Out-of-band notification |

Previews (`args_preview`, `result_preview`) are truncated to 300 chars — full payloads live in the ledger, never on the wire.

### 1.2 REST command API v1

Base: `http://127.0.0.1:8765`. No auth in Phase 1 (loopback bind only — hard requirement).

| Method & path | Body | Returns |
|---|---|---|
| `GET /health` | — | `{status, engine, version}` |
| `POST /missions` | `{prompt, mode: "chat"\|"mission", title?}` | `201 {mission}` — starts immediately in P1 (planner gate is P2) |
| `GET /missions` | — | `{missions: [...]}` newest first |
| `GET /missions/{id}` | — | `{mission}` |
| `GET /missions/{id}/events` | `?after=<event_id>` | `{events: [...]}` |
| `POST /missions/{id}/cancel` | — | `202` |
| `GET /approvals?status=pending` | — | `{approvals: [...]}` |
| `POST /approvals/{id}/resolve` | `{decision: "approve"\|"deny", note?}` | `200 {approval}` · `409` if already resolved/expired |

`mode: "chat"` = conversational turn (voice/text chat — still a mission row, keeps the ledger uniform). `mode: "mission"` = long-running delegated work. Phase 1 treats both identically except for title generation.

### 1.3 Mission ledger schema (SQLite)

`C:\jarvis\jarvis-log\ledger.db`, WAL mode. Append-only except `missions.status` / `approvals.status`.

```sql
CREATE TABLE missions (
  id TEXT PRIMARY KEY,            -- m_<uuid4>
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('chat','mission')),
  status TEXT NOT NULL CHECK (status IN
    ('queued','planning','awaiting_approval','running',
     'completed','failed','cancelled')),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  result_summary TEXT, artifacts_dir TEXT
);
CREATE TABLE events (
  id TEXT PRIMARY KEY, mission_id TEXT, agent_id TEXT,
  type TEXT NOT NULL, payload_json TEXT NOT NULL, ts TEXT NOT NULL
);
CREATE TABLE approvals (
  id TEXT PRIMARY KEY,            -- ap_<uuid4>
  mission_id TEXT NOT NULL, agent_id TEXT,
  tier INTEGER NOT NULL,
  action TEXT NOT NULL, description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','approved','denied','expired')),
  requested_at TEXT NOT NULL, resolved_at TEXT, resolved_by TEXT, note TEXT
);
CREATE TABLE actions (              -- PRD §8.3 audit log, now with lineage
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL, mission_id TEXT, agent_id TEXT,
  intent TEXT, action_type TEXT, target TEXT,
  payload_summary TEXT, confirmed_by TEXT, result TEXT
);
```

The old `actions.db` from the PRD is superseded by the `actions` table here; same columns plus `mission_id`/`agent_id` lineage.

---

## 2. Permission model mapping (PRD tiers → Hermes)

Hermes raises approval requests through a per-thread callback (`tools/terminal_tool.set_approval_callback`; pattern documented in `tools/approval.py:732`). Core installs a callback in the engine worker thread that:

1. Classifies the action into a PRD tier (T0–T4) via a rule table in `core\jarvis_core\tiers.py` (tool name + args patterns; default for unknown dangerous commands = T3).
2. T0/T1 → return `"approve"` immediately; T1 also writes an `actions` row.
3. T2+ → insert `approvals` row, emit `approval.requested`, block on a `threading.Event` resolved by `POST /approvals/{id}/resolve` (the broker bridges asyncio→thread). Timeout: 10 min → `expired` → return `"deny"`.
4. T3 requires the UI's double-confirm (the dialog enforces it; Core just records `confirmed_by: "user-double"`).

Phase 1 toolsets for Prime are restricted to file/terminal basics inside the sandbox (see §4.3), so T4 (server write) cannot arise yet.

## 3. Role config (Phase 1 subset)

`core\agents\roles.yaml` — full roster lands in Phase 2; the file format is set now:

```yaml
prime:
  display_name: "Jarvis Prime"
  model: ${JARVIS_MODEL}            # e.g. nvidia/llama-3.1-nemotron-ultra-253b-v1
  base_url: ${JARVIS_LLM_BASE_URL}  # default https://integrate.api.nvidia.com/v1
  api_key_env: NVIDIA_API_KEY
  toolsets: [files, terminal]       # Hermes enabled_toolsets
  max_tier: 3                       # ceiling; T4 requires operator role (P2)
  system_prompt_file: prompts/prime.md
  max_iterations: 30
```

## 4. Component design

### 4.1 Repo layout (Phase 0)

```
C:\Projects\Jarvis\
├── app\                  # Electron (moved: src, package.json, electron.vite.config.mjs,
│                         #   node_modules, out, resources, scripts, SETUP.md)
├── core\
│   ├── jarvis_core\
│   │   ├── app.py        # FastAPI factory, lifespan, routes
│   │   ├── config.py     # env/yaml settings
│   │   ├── ledger.py     # SQLite (schema §1.3)
│   │   ├── events.py     # EventHub: broadcast to WS clients + persist
│   │   ├── approvals.py  # ApprovalBroker (asyncio<->thread bridge)
│   │   ├── missions.py   # MissionManager: lifecycle + engine dispatch
│   │   ├── tiers.py      # action -> PRD tier classification
│   │   ├── roles.py      # roles.yaml loader
│   │   └── engine\
│   │       ├── base.py   # Engine protocol
│   │       ├── hermes.py # HermesEngine (AIAgent embedding)
│   │       └── mock.py   # MockEngine (tests, UI dev, no API key)
│   ├── agents\roles.yaml · agents\prompts\prime.md
│   ├── tests\            # pytest, MockEngine-driven
│   ├── pyproject.toml · Dockerfile
├── services\odysseus\    # .env.example + data\ (bind mounts)
├── docker\docker-compose.yml
├── PRD.md · VISION.md · PHASE-0-1.md
```

### 4.2 Engine seam

```python
class Engine(Protocol):
    def run(self, mission: Mission, role: RoleConfig,
            emit: Callable[[str, dict], None],          # (type, payload)
            approval_gate: Callable[..., str],          # installed pre-run
            ) -> EngineResult: ...                      # blocking; called in thread
```

- `HermesEngine` constructs `AIAgent(base_url=…, api_key=…, model=…, enabled_toolsets=role.toolsets, quiet_mode=True, skip_context_files=True, skip_memory=True, max_iterations=role.max_iterations, ephemeral_system_prompt=…)` and wires callbacks → `emit`:
  - `tool_start_callback(id, name, args)` → `tool.call`
  - `tool_complete_callback(id, name, args, result)` → `tool.result` (+ `actions` row for T1+)
  - `stream_delta_callback` → `assistant.delta`
  - `status_callback(kind, msg)` → `agent.status`
  - installs `approval_gate` via `set_approval_callback` on its worker thread before running
  - `run_conversation(prompt)` → final text → `assistant.message{final:true}`
- `skip_memory`/`skip_context_files` are deliberate in Phase 1 — Hermes memory comes online with the shared ChromaDB decision in Phase 3.
- Hermes install: dev = `pip install -e C:\Projects\Hermes-agent`; Docker = `pip install git+https://github.com/NousResearch/hermes-agent@<pinned-commit>`. Core must import lazily so MockEngine works without Hermes installed.
- `MockEngine` replays a scripted sequence (status → tool.call → tool.result → approval request if prompt contains "delete" → assistant.message). Deterministic; used by all tests and by `JARVIS_ENGINE=mock` for UI development.

### 4.3 Sandbox containment

Hermes file/terminal tools run with CWD = `C:\jarvis\` and the Prime system prompt constrains writes to the sandbox, but **prompt constraints are not enforcement**: Phase 1 enforcement = tier classifier treats any write/exec path outside `C:\jarvis\` as T3 (forced approval). Hard path-jail (Hermes `path_security` config or Docker volume scoping) is a Phase 2 hardening item — tracked, not silently dropped.

### 4.4 Electron rewire

- `app\src\main\core-client.js` — new: REST + WS client (`ws` dependency), exponential backoff reconnect, `online`/`offline` state, event re-emit to both windows via `webContents.send('jarvis:event', evt)`.
- `ipc.js` — chat submit: if Core online → `POST /missions {mode:"chat"}` and resolve the reply from `assistant.message`; else → existing local `chat()` (fallback path unchanged, UI shows "local mode" badge state via `core.status`).
- Approval bridge: `approval.requested` → existing `ConfirmationDialog.jsx` flow → `POST /approvals/{id}/resolve`. The dialog's double-confirm behavior is reused for tier 3.
- `voice\pipeline.js` — transcript handoff goes through the same chat-submit path (one code path for voice + text). TTS speaks `assistant.message.final` text, summarized if > 400 chars (PRD §5.3 behavior preserved).
- Renderer: minimal in Phase 1 — conversation tab consumes `assistant.delta`/`assistant.message`; a status dot shows core online/local; event ticker is Phase 2.

### 4.5 Docker stack

`docker\docker-compose.yml`: `jarvis-core` (build `..\core`, port 8765, env: `NVIDIA_API_KEY`, `JARVIS_ENGINE`, volume for ledger) + the four Odysseus services adapted from `C:\Projects\odysseus\docker-compose.yml` with build context `..\..\odysseus`, data under `..\services\odysseus\data`, searxng settings template mounted from the odysseus checkout. Odysseus is **present but passive** in Phase 1 (Phase 0 exit = healthy containers; Core consumes its API starting Phase 3).

Native dev path (faster loop): `cd core; pip install -e .[dev]; jarvis-core` — Docker is the deployment story, not a dev gate.

## 5. Task breakdown

**Phase 0**
- P0.1 Restructure repo per §4.1; `npm run build` green from `app\`.
- P0.2 Core scaffold: pyproject, package skeleton, settings.
- P0.3 Compose stack per §4.5; `docker compose config` valid; build attempted.

**Phase 1**
- P1.1 Ledger + EventHub + REST/WS app (§1.1–1.3).
- P1.2 ApprovalBroker + tier classifier (§2).
- P1.3 MockEngine + MissionManager; pytest: mission lifecycle, event ordering, approval approve/deny/timeout, ledger persistence, WS replay.
- P1.4 HermesEngine (§4.2) behind lazy import; smoke-test script `core\scripts\smoke_nim.py` (requires `NVIDIA_API_KEY`).
- P1.5 Electron rewire (§4.4); `npm run build` green.
- P1.6 E2E with MockEngine: scripted client drives REST/WS through the §0 demo flow.

## 6. Acceptance criteria

| # | Check | Verified by |
|---|---|---|
| A1 | Electron builds and runs from `app\` after restructure | `npm run build` |
| A2 | `docker compose config` validates; images build | compose CLI |
| A3 | Mission lifecycle events match §1.1 exactly | pytest |
| A4 | T2 approval blocks engine until resolved; deny cancels action; timeout expires to deny | pytest |
| A5 | Every T1+ action lands in `actions` with mission lineage | pytest |
| A6 | WS client reconnect catches up via `/missions/{id}/events` | pytest |
| A7 | Electron chat round-trips through Core (mock engine), falls back local when Core stopped | manual + build |
| A8 | Live NIM demo (§0 script) | **done (2026-06-11)** — `core\scripts\smoke_nim.py` |

## 7. Risks / notes

- A8 done 2026-06-11: NIM auth + HermesEngine confirmed working with `nvidia/llama-3.3-nemotron-super-49b-v1` (the `nemotron-ultra-253b-v1` and `nemotron-70b-instruct` models are listed by `/v1/models` but return 404 "Function not found for account" — not enabled for this account). `roles.yaml` and `docker/.env.example` updated to the working model.
- Native-Windows smoke run surfaced that Hermes' `terminal` toolset shells out via WSL, and this machine has no working `/bin/bash` in WSL — tool calls using `terminal` fail gracefully with a text explanation. Not a blocker: the platform's real deployment is the Linux `jarvis-core` Docker container, which has a native bash. Decision: leave as-is, do not fix WSL on the host.
- Hermes native-Windows is beta: HermesEngine is exercised via the smoke script natively and via Docker for deployment; MockEngine keeps all automated tests platform-independent.
- Odysseus image build is heavy (ML deps); compose build is attempted but not a Phase 1 gate beyond A2.
- Repo is not under git — recommend `git init` + baseline commit before further phases.
- Wake-word model is still the hey_mycroft placeholder (pre-existing TODO; unaffected by the rewire, voice path still keys off it).
