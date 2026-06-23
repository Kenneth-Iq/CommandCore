# Phase 3 Specification — Memory & Sentinel

**Version:** 1.0 · **Date:** 2026-06-11 · **Parent:** VISION.md §7, builds on PHASE-0-1.md, PHASE-2.md
**Scope:** a thin Odysseus bridge for cross-mission shared memory, and a Sentinel scheduler that runs unattended missions on a cron and reports via ntfy. Deep Research as a mission type and email/calendar tool integrations are deferred to Phase 4 (see §6).

---

## 0. Outcome

1. **Shared memory** — before planning a mission, Core asks Odysseus's memory store ("what do we already know relevant to this?") and feeds the answer into the plan prompt and into every fleet agent's instructions. After a mission completes, Core writes the sitrep back to Odysseus memory as a `category: "event"` entry. This makes missions cumulative: a research mission today informs a writing mission tomorrow, without re-discovering the same facts.
2. **Sentinel scheduler** — the commander can register a recurring mission (cron expression + prompt). Core runs it unattended on schedule, and on completion (or on an approval it can't auto-clear) pushes a notification to ntfy. The first scheduled job is a daily morning briefing.

**Demo (exit):**
- `POST /schedules` registers a daily Sentinel briefing. Wait (or fast-forward the clock in a test) → Core creates a mission automatically, runs the Sentinel role, and a `ntfy` push arrives with the sitrep.
- A mission that references something stored by an earlier mission's sitrep retrieves it via the memory search injected into its plan/agent context (visible in `mission.created`'s context block / `tool` events).
- If Odysseus is unreachable, both features no-op silently — missions behave exactly as Phase 2 (graceful degradation, per PRD).

## 1. Odysseus bridge

New module `core/jarvis_core/odysseus.py` — a small `httpx` client, never raises:

```python
class OdysseusClient:
    def __init__(self, base_url: str | None, api_token: str | None, timeout: float = 5.0): ...
    def search_memory(self, query: str, max_items: int = 5) -> list[str]: ...
    def add_memory(self, text: str, category: str = "fact") -> bool: ...
    @property
    def enabled(self) -> bool: ...  # True only if base_url and api_token are set
```

- `enabled` is `False` unless both `ODYSSEUS_BASE_URL` and `ODYSSEUS_API_TOKEN` are set. All call sites check `enabled` first so the rest of the system pays zero cost when Odysseus isn't configured.
- **Revised against the live API (2026-06-11):** the legacy `/api/memory/*` routes are session-cookie-only and reject bearer tokens (403 "API tokens must use a scope-aware API route"). The token-scoped routes live under `/api/codex/`:
  - `add_memory` → `POST {base_url}/api/codex/memory` (JSON: `{text, category, source: "jarvis-core"}`), text truncated to Odysseus's 5000-char cap. Any exception/non-200 → `False`. Fire-and-forget from the caller's perspective (failures are logged, never raised).
  - `search_memory` → Odysseus has **no token-scoped search endpoint**, so the client does `GET {base_url}/api/codex/memory` (owner's full list) and ranks it client-side by keyword overlap with the query, returning up to `max_items` matches with score > 0. Fine for a single-operator store; revisit if it grows past a few thousand entries. Any exception/timeout/non-200 → `[]`.
  - Valid categories are `fact|contact|task|preference|identity|project|goal` — anything else (including the originally-specced `"event"`) is silently coerced to `"fact"` by Odysseus, so sitreps are stored as `category: "fact"`.
- Odysseus token needs scope `memory:read,memory:write` (`routes/api_token_routes.py` — created in Odysseus's settings UI → API Tokens, pasted into `docker/.env` as `ODYSSEUS_API_TOKEN`).

### 1.1 Wiring into missions

- `Settings` gains `odysseus_base_url` (env `ODYSSEUS_BASE_URL`, default `http://odysseus:7000` in compose / unset natively) and `odysseus_api_token` (env `ODYSSEUS_API_TOKEN`, default `""`).
- `MissionManager.__init__` builds one `OdysseusClient` and passes it down.
- `_run_mission`, before calling `planner.generate_plan`:
  - if `odysseus.enabled`, calls `search_memory(prompt)`. If non-empty, builds a `Relevant memory:\n- ...\n- ...` block and prepends it to the planning prompt **and** to each fleet task's instruction (same mechanism as the existing `findings_block` from earlier stages — concatenated, not replacing it).
  - emits a `memory.recalled` event (new type, additive) with `{items: [...]}` so the dashboard/audit trail shows what context was injected. If the search returned nothing, no event is emitted.
- `_run_mission`, after the sitrep is produced (success path only):
  - calls `add_memory(f"Mission: {prompt}\n\n{sitrep_text}", category="event")` (best-effort, result ignored beyond a debug log).
- `_run_chat` is unaffected — chat mode stays a single Prime turn with no memory round trip, keeping the common case (a quick question) fast and side-effect-free.

### 1.2 Contract additions (additive — protocol stays v1)

- New event type `memory.recalled`: `{items: [str, ...]}`, `agent_id: "prime"`, emitted once per mission at most, before `plan.proposed`.
- No ledger schema changes — memory lives in Odysseus, not the Jarvis ledger.

## 2. Sentinel scheduler

New module `core/jarvis_core/scheduler.py` — a background thread, started from `app.py`'s lifespan alongside `MissionManager`.

### 2.1 Ledger: `schedules` table

```sql
CREATE TABLE schedules (
  id TEXT PRIMARY KEY,             -- sched_<uuid4>
  name TEXT NOT NULL,
  cron_expr TEXT NOT NULL,         -- 5-field cron, croniter syntax
  prompt TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'mission' CHECK (mode IN ('chat','mission')),
  enabled INTEGER NOT NULL DEFAULT 1,
  notify_topic TEXT,               -- ntfy topic; NULL = use default
  created_at TEXT NOT NULL,
  last_run_at TEXT,
  last_mission_id TEXT,
  next_run_at TEXT NOT NULL
);
```

Added via the same idempotent `CREATE TABLE IF NOT EXISTS` pattern as `agent_runs`. `Ledger` gains `create_schedule`, `list_schedules`, `get_schedule`, `update_schedule` (enable/disable, last_run/next_run bookkeeping), `delete_schedule`.

### 2.2 Scheduler loop

- Tick every 30s (configurable via `Settings.scheduler_tick`, default 30.0; tests use a tiny tick).
- For each enabled schedule with `next_run_at <= now`:
  1. Compute `next_run_at` from `croniter(cron_expr, now)` immediately (so a slow mission can't cause a re-fire pile-up).
  2. Call `MissionManager.create(prompt, mode=schedule.mode, title=f"[Sentinel] {schedule.name}")`.
  3. Record `last_run_at`, `last_mission_id`.
  4. Subscribe to that mission's completion (poll the ledger, since the scheduler runs off the asyncio loop) and on `completed`/`failed`/`awaiting_approval`, push to ntfy (§2.3).
- `croniter` is already a transitive dep via `hermes-agent` (`pyproject.toml` doesn't need a new entry, but `core/pyproject.toml` adds it explicitly since Core must not rely on Hermes' dependency tree for its own scheduling — add `croniter` to `core/pyproject.toml` deps directly).

### 2.3 Auto-approval ceiling for unattended runs

Scheduled missions must not silently block forever waiting for an approval nobody will see. `MissionManager._run_mission` gains an `auto_approve_max_tier: int | None` parameter (default `None` = normal behavior, always ask):

- When a mission is created by the scheduler, `auto_approve_max_tier=1` is passed (matches Sentinel's own `max_tier`).
- The plan-approval step (`broker.request(..., tier=2, action="execute mission plan")`) is **skipped** if every task in the plan uses a role whose `max_tier <= auto_approve_max_tier`. The mission proceeds straight to `running` and emits `plan.proposed` with `payload.auto_approved: true` instead of going through the broker.
- If any stage needs a higher-ceiling role (e.g. the planner decided an `operator` task is warranted), the normal approval flow runs as-is — it will time out per the existing `approval_timeout` and the mission is `cancelled`. The scheduler's completion notifier still fires for `cancelled` so the commander gets a "Sentinel wanted to do something it couldn't — check the dashboard" ntfy push.

### 2.4 ntfy delivery

- `Settings.ntfy_base_url` (env `NTFY_BASE_URL`, default `http://ntfy:80` in compose), `Settings.ntfy_topic` (env `NTFY_TOPIC`, default `jarvis`).
- `scheduler.py`'s `_notify(schedule, mission)` POSTs plain text to `{ntfy_base_url}/{schedule.notify_topic or ntfy_topic}`:
  - `completed`: title "Jarvis — {schedule.name}", body = sitrep text (or final assistant text for `mode: chat`), truncated to 2000 chars.
  - `failed`/`cancelled`: title "Jarvis — {schedule.name} needs attention", body = error/reason + link hint (`mission_id`).
- Failures to reach ntfy are logged and swallowed — never crash the scheduler loop.

### 2.5 REST API additions

| Method | Path | Body / Query | Notes |
|---|---|---|---|
| `GET` | `/schedules` | — | `{schedules: [...]}` |
| `POST` | `/schedules` | `{name, cron_expr, prompt, mode?, notify_topic?}` | validates `cron_expr` via `croniter`; 400 on bad expression |
| `GET` | `/schedules/{id}` | — | 404 if missing |
| `PATCH` | `/schedules/{id}` | `{enabled?, cron_expr?, prompt?, name?, notify_topic?}` | recomputes `next_run_at` if `cron_expr` changes |
| `DELETE` | `/schedules/{id}` | — | |

### 2.6 Default schedule

`core/agents/schedules.yaml` (new, optional — loaded at startup if present, entries inserted only if a schedule with the same `name` doesn't already exist, so user edits via the API survive restarts):

```yaml
- name: "Morning Briefing"
  cron_expr: "0 7 * * *"
  prompt: >
    Give the commander a morning briefing: anything notable from
    memory recalled for today, and a short outlook. Keep it to a
    few sentences.
  mode: mission
  enabled: false   # commander opts in via PATCH /schedules/{id} {"enabled": true}
```

Shipped disabled — Sentinel doesn't start pushing notifications until the commander turns it on.

## 3. Role roster

No roster changes. `sentinel`'s prompt (`prompts/sentinel.md`) is updated to describe its scheduled-briefing role now that it's live (it previously said "reserved").

## 4. App / dashboard scope

Minimal for Phase 3 — a "Schedules" section is added to the existing **Missions** tab (not a new tab):

- List of schedules (name, cron expression, enabled toggle, last run status) fetched via a new IPC `jarvis:core-schedules` → `GET /schedules`.
- Toggle enabled/disabled via `jarvis:core-schedule-toggle` → `PATCH /schedules/{id}`.
- Read-only for cron expression / prompt editing in Phase 3 (creating/editing schedules is via the REST API or `schedules.yaml`; a full editor UI is Phase 4 polish).

## 5. Acceptance criteria

| ID | Criterion | Verification |
|---|---|---|
| C1 | `OdysseusClient` no-ops cleanly (returns `[]`/`False`, no exceptions) when unset or unreachable | **done (2026-06-11)** — `tests/test_phase3.py::test_odysseus_disabled_when_unconfigured`, `::test_odysseus_unreachable_noops` |
| C2 | Mission with mocked Odysseus returning memory hits emits `memory.recalled` before `plan.proposed`, and the recalled text appears in the fleet task instructions | **done** — `::test_memory_recalled_and_injected` |
| C3 | Successful mission posts a sitrep-derived entry to Odysseus memory (mocked, assert call made) | **done** — `::test_sitrep_written_to_memory` |
| C4 | `POST /schedules` validates cron expressions; bad expression → 400 | **done** — `::test_schedule_create_validates_cron` |
| C5 | Scheduler tick creates a mission from a due schedule, advances `next_run_at`, and records `last_mission_id` | **done** — `::test_scheduler_tick_creates_mission` |
| C6 | Low-ceiling scheduled mission auto-approves (`plan.proposed.auto_approved: true`, no approval row created) | **done** — `::test_low_ceiling_auto_approves` |
| C7 | High-ceiling scheduled mission still creates an approval, times out per normal flow, mission `cancelled` | **done** — `::test_high_ceiling_scheduled_mission_times_out` |
| C8 | ntfy notification posted on schedule completion (mocked HTTP) | **done** — `::test_ntfy_notification_on_completion` |
| C9 | App Schedules section lists schedules and toggles enabled via IPC | **done (2026-06-11)** — commander toggled Morning Briefing on live from the app's Missions tab |

## 6. Deferred to Phase 4

- **Deep Research as a mission type** (`mode: "research"` → Odysseus `/api/research/*`): requires Odysseus to have its own LLM endpoint configured in its Settings UI (separate from `NVIDIA_API_KEY`), plus SSE-stream bridging into Core's event protocol. Bigger surface, separate config dependency — own spec when picked up.
- **Email triage / CalDAV calendar tools**: Odysseus has rich REST APIs for both (`routes/email_routes.py`, `routes/calendar_routes.py`) but wiring them as agent-callable tools needs per-role scopes and write-action approval-tier mapping (email send = T2, calendar write = T1/T2) — own spec.
- Full Schedules editor UI (create/edit cron + prompt from the app).

## 7. Risks / notes

- Odysseus's `/api/memory/search` is keyword/embedding search over the *single-user* memory store — there's no per-mission namespacing. This is intentional (it's the commander's shared memory, not per-mission scratch space) but means missions can see each other's recalled context; acceptable for a single-operator system.
- The scheduler thread and `MissionManager`'s executors are independent; a stuck mission from a previous tick doesn't block the scheduler from firing the next one (each schedule's mission creation is independent of others).
- `croniter` cron expressions are evaluated in the Core process's local timezone (container default UTC in Docker). Documented in README; not configurable in Phase 3.
