# Phase 4 Specification — Research Missions & Workspace Tools

**Version:** 1.0 · **Date:** 2026-06-11 · **Parent:** VISION.md §7, builds on PHASE-3.md
**Scope:** Deep Research as a mission mode, Odysseus email/calendar as agent-callable tools with tier-mapped approvals, and a full Schedules editor in the app. Requires one small additive patch to the Odysseus checkout (§1).

---

## 0. Outcome

1. **Research missions** — `mode: "research"` hands the prompt to Odysseus's deep-research engine. Core polls progress, streams it into the event protocol, and the final report becomes the mission's sitrep (and a memory entry, via the Phase 3 write-back).
2. **Workspace tools** — fleet agents gain an `odysseus` Hermes toolset: email list/read/draft/send and calendar list/create, calling Odysseus's token-scoped codex routes. Outward-facing actions (email send) go through the commander approval gate at tier 2; calendar writes at tier 1 (auto-approved, audited).
3. **Schedules editor** — the app's Schedules section gains create/edit/delete (name, cron, prompt, mode), completing the Phase 3 read-only list.

**Demo (exit):**
- `POST /missions {"mode":"research"}` runs an Odysseus deep-research job; `research.progress` events appear; the mission completes with the report as sitrep.
- A mission instructs the operator to send an email → tier-2 approval dialog fires in the app; on approve, the mail goes out via Odysseus; the action ledger records it.
- An agent answers "what's on my calendar this week" via the calendar tool.
- A schedule is created, edited, and deleted entirely from the app.
- All features no-op gracefully (clear tool errors / mission failure with reason, never a crash) when Odysseus or its email/calendar/research config is absent.

## 1. Odysseus patch — token-scoped research routes

Odysseus's `/api/research/*` routes use `require_privilege` (session-cookie only; bearer tokens are 403'd) and the `internal-tool` bypass is loopback-only, unusable across the Docker network. Email/calendar/memory already have token-scoped `/api/codex/*` equivalents; research does not. Patch (in `C:\Projects\odysseus`, committed there):

- `routes/api_token_routes.py`: add `"research:run"` to `ALLOWED_SCOPES`.
- `routes/codex_routes.py`: three additive routes, same `_scope_owner` pattern as email/memory:
  - `POST /api/codex/research` — body `{query, max_time?, max_rounds?}` → wraps `research_start` logic (endpoint resolution included) → `{session_id, status, query}`. Scope `research:run`.
  - `GET /api/codex/research/{session_id}` — wraps `get_status` → `{status, progress, ...}`. Scope `research:run`.
  - `GET /api/codex/research/{session_id}/report` — wraps the report fetch → `{report, sources, ...}`. Scope `research:run`.

The compose file builds the odysseus image from this checkout, so the patch is live after `docker compose up -d --build odysseus`. The patch is additive and upstream-friendly.

**Config dependency (manual, one-time):** deep research needs an LLM endpoint configured in Odysseus's Settings UI (it resolves `research` → `utility` → `default` → `chat` endpoint roles). Without one, `POST /api/codex/research` returns 400 "No endpoints configured" and Core fails the mission with that reason.

**Token:** the `jarvis-core` token gains scopes `email:read,email:draft,email:send,calendar:read,calendar:write,research:run` (PATCH `/api/tokens/{id}` or recreate).

## 2. Research mission mode

### 2.1 Core flow

- `MissionCreate.mode` pattern widens to `^(chat|mission|research)$`; ledger `missions.mode` CHECK gains `'research'` (additive migration: SQLite can't ALTER a CHECK, so the migration recreates nothing — instead the CHECK is relaxed in `_SCHEMA` for new DBs and existing DBs keep working because inserts of `'research'` only fail on *old* DBs; the migration therefore rebuilds the table iff needed — see §2.3).
- `MissionManager._run_research(mission)`:
  1. `odysseus.start_research(prompt)` → `session_id`. If Odysseus is disabled/unreachable/unconfigured → mission `failed` with the reason (research mode has no local fallback; that's the point of the mode).
  2. Poll `research_status(session_id)` every `Settings.research_poll` (default 5s). On each progress change, emit `research.progress` (new additive event type) with the raw progress payload `{phase, rounds, sources_found, ...}` as provided by Odysseus, `agent_id: "researcher-1"`.
  3. Terminal states: Odysseus `completed` → fetch report → emit `sitrep` with the report text, write memory (Phase 3 path), mission `completed` with `result_summary` = report head. `failed`/`cancelled`/timeout (`Settings.research_timeout`, default 1800s) → mission `failed` with reason. Mission cancel (`POST /missions/{id}/cancel` while queued) unchanged; in-flight research cancellation is deferred.
- No plan/approval step: research is read-only (search + fetch) and runs as the `researcher` role ceiling. Scheduled research missions therefore auto-complete unattended.

### 2.2 OdysseusClient additions

```python
def start_research(self, query: str, max_time: int = 0, max_rounds: int = 0) -> str | None: ...
def research_status(self, session_id: str) -> dict | None: ...   # None = error/unreachable
def research_report(self, session_id: str) -> str | None: ...
```

Same never-raise contract as the memory methods.

### 2.3 Ledger

`missions.mode` CHECK: `IN ('chat','mission','research')` in `_SCHEMA`. Migration for existing DBs: on init, probe `INSERT ... mode='research'` in a rolled-back transaction; if it fails, rebuild the missions table via the standard SQLite copy-rename dance. (Test covers both fresh and legacy DBs.)

### 2.4 Events (additive, protocol stays v1)

- `research.progress`: `{phase: str, detail: dict}` — emitted on progress change, ≤ 1 per poll tick.

## 3. Workspace tools (email + calendar)

### 3.1 Hermes toolset registration

New module `core/jarvis_core/engine/odysseus_tools.py`:

- At `HermesEngine.__init__`, after the Hermes import is known to work, call `register_odysseus_tools(client)` which uses `tools.registry.register(name, toolset="odysseus", schema=..., handler=..., check_fn=...)` (public Hermes registry API, same one plugins use).
- `check_fn` returns `client.enabled` — when Odysseus isn't configured the whole toolset reports unavailable and Hermes hides it from the model.
- Tools (handlers are thin httpx calls to the codex routes; all return `tool_result`/`tool_error` strings per Hermes convention):

| Tool | Codex route | Tier |
|---|---|---|
| `email_list` | `GET /api/codex/emails?folder&limit&filter` | 1 (audited) |
| `email_read` | `GET /api/codex/emails/{uid}` | 1 (audited) |
| `email_draft` | `POST /api/codex/emails/draft` `{to, subject, body, cc?}` | 1 (audited) |
| `email_send` | `POST /api/codex/emails/send` (same body) | **2 — approval gate** |
| `calendar_list` | `GET /api/codex/calendar/events?start&end` | 1 (audited) |
| `calendar_create` | `POST /api/codex/calendar/events` `{summary, dtstart, dtend?, description?, location?}` | 1 (audited) |

### 3.2 Approval gating for non-terminal tools

The Phase 2 gate classifies *terminal commands*; Odysseus tools need explicit tiers. Mechanism:

- `engine/hermes.py` gains a `threading.local()` gate holder. `HermesEngine.run` stores the mission's `approval_gate` + a tier-aware wrapper in it before `run_conversation`, clears it after.
- `odysseus_tools` handlers call `gate_for_current_thread(action, description, tier)`:
  - tier ≤ role handling is unchanged — the wrapper reuses `MissionManager._make_gate`'s broker path by passing a synthetic "command" of the form `odysseus:{tool}:{summary}`; `tiers.classify` gains a prefix rule: `odysseus:email_send:` → tier 2, any other `odysseus:` → tier 1. This keeps ONE gate implementation and the existing ledger/audit wiring.
- Fleet threads each run one agent at a time, so thread-local is race-free (same reasoning as the per-thread `set_approval_callback` pattern Hermes itself uses).

### 3.3 Roles

`roles.yaml`: `operator` gains toolset `odysseus` (full surface; only role with `max_tier: 3` besides prime). `researcher` and `analyst` gain `odysseus` too — their `max_tier: 1` ceiling means `email_send` auto-denies for them (defense in depth via the existing ceiling mechanism). `prime` gains it for chat-mode convenience.

## 4. Schedules editor (app)

- Schedules section gains: **＋ New** button (inline form: name, cron expression, prompt, mode select), **edit** (pencil → same form pre-filled, PATCH on save), **delete** (× with confirm).
- New IPC: `jarvis:core-schedule-create` → `POST /schedules`, `jarvis:core-schedule-update` → `PATCH /schedules/{id}`, `jarvis:core-schedule-delete` → `DELETE /schedules/{id}`. (`coreScheduleToggle` from Phase 3 stays.)
- Cron validation errors from Core (400) surface inline under the form.

## 5. Acceptance criteria

| ID | Criterion | Verification |
|---|---|---|
| D1 | Odysseus patch: token with `research:run` can start/poll/fetch research; token without it gets 403 | **done (2026-06-12)** — live curl: scoped token works, chat-scope token → 403 |
| D2 | `mode: research` mission: progress events emitted, completes with report sitrep, memory written | **done** — `tests/test_phase4.py` |
| D3 | Research failure paths (Odysseus down, no endpoint configured, timeout) → mission `failed` with reason | **done** — pytest; timeout + transient-502 paths also exercised live |
| D4 | Legacy ledger DB accepts `mode='research'` after migration; fresh DB unaffected | **done** — pytest |
| D5 | `email_send` from a tier-1 role auto-denies; from operator raises a tier-2 approval; approve → send called, deny → not | **done** — pytest (mocked codex routes) |
| D6 | Tier-1 odysseus tools log audited actions without approvals | **done** — pytest |
| D7 | Toolset reports unavailable when OdysseusClient is disabled (no tool exposure) | **done** — pytest |
| D8 | Schedule create/edit/delete from the app round-trips; invalid cron shows inline error | **done (2026-06-12)** — REST surface round-tripped live (create→edit→bad-cron-400→delete); editor UI built and `electron-vite build` green |
| D9 | Live exit demo (research mission + approved email send + calendar query) | **done (2026-06-12)** — live research mission completed in ~7 min (3 rounds, 23 URLs) with the report as sitrep; calendar tool returns events (empty store); email tools degrade cleanly (no mail account configured — live approved-send deferred until one is). Live run exposed and fixed the `done`-vs-`completed` status mismatch. |

## 6. Deferred to Phase 5

- In-flight research cancellation (Odysseus supports `POST /api/research/cancel/{id}`; wiring it to mission cancel needs running-mission interruption, a Phase 1 deferral).
- Email attachments, multi-account selection, calendar event update/delete tools.
- Research SSE streaming (polling is sufficient at 5s granularity; SSE adds an async consumer inside a thread-based manager).
- Voice announcement of completed research (TTS pipeline polish).

## 7. Risks / notes

- The Odysseus patch lives in Kenneth's checkout; rebasing that checkout on upstream may need the patch re-applied (it's additive and isolated to two files — low conflict risk).
- Deep research jobs hold an Odysseus worker for up to `max_time`; concurrent research missions queue behind Core's single mission executor anyway (Phase 2 design), so no extra throttling needed.
- Email/calendar tools depend on the commander having configured accounts in Odysseus (IMAP/SMTP, CalDAV). Handlers surface Odysseus's 503 "integration is not available" as a clean tool error the model can relay.
- `tiers.classify` prefix rule means the synthetic `odysseus:` commands never hit the path/destructive regexes — ordering: prefix check first.
