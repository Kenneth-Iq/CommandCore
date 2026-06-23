# Phase 5 Specification — Remote Command & Control

**Version:** 1.0 · **Date:** 2026-06-12 · **Parent:** VISION.md §7 "Phase 4 — Everywhere", builds on PHASE-4.md
**Scope:** two-way mobile control via a Telegram bridge (assign missions, receive sitreps, approve/deny actions from the phone), cooperative in-flight mission cancellation, and the small workspace-tool completions deferred from Phase 4. The futuristic UI pass and one-command public deploy remain deferred (§6).

---

## 0. Outcome

1. **Telegram bridge** — the commander pairs a Telegram bot with Core. From the phone: send a text → it runs as a chat turn and replies; `/mission <prompt>` and `/research <prompt>` launch missions; sitreps and failures arrive as messages; tier-2+ approval requests arrive with inline **Approve / Deny** buttons that resolve the same broker the desktop dialog uses. Unauthorized chat IDs are ignored.
2. **In-flight cancellation** — `POST /missions/{id}/cancel` (and a Telegram `/cancel <id>`) now works on *running* missions at safe points: before planning, while awaiting approval, between fleet stages, and per research poll tick (which also cancels the Odysseus job). A running engine turn still finishes — interruption inside a Hermes loop stays out of scope.
3. **Workspace completions** — calendar event update/delete tools; email reply support (`in_reply_to`); research cancel codex route (Odysseus patch §1).

**Demo (exit):**
- From Telegram: `/mission summarize this week's research` → plan-approval message with buttons → tap Approve → sitrep arrives in the chat.
- A text from an unauthorized Telegram account gets no reply and no mission.
- `/cancel` on a running research mission stops it within one poll tick and the Odysseus job is cancelled.
- All Telegram features no-op when `TELEGRAM_BOT_TOKEN` is unset (graceful degradation, as ever).

## 1. Odysseus patch (additive, same pattern as Phase 4)

- `routes/codex_routes.py`: `POST /api/codex/research/{session_id}/cancel` → wraps `research_cancel`, scope `research:run`.
- `routes/codex_routes.py`: calendar event update/delete wrappers if the calendar router exposes them (`PATCH/DELETE /api/calendar/events/...`) — same `_scope_owner` + `_as_owner` pattern, scope `calendar:write`.

## 2. Telegram bridge

### 2.1 Module

New `core/jarvis_core/telegram.py`, started from `app.py`'s lifespan as **asyncio tasks** (not threads — it subscribes to the EventHub like the WebSocket route does):

- **Outbound task**: `hub.subscribe()` queue consumer. Forwards to the commander's chat:
  - `approval.requested` → message with the action description + `InlineKeyboardMarkup` [✅ Approve | ❌ Deny], callback data `apv:{approval_id}:{decision}`.
  - `mission.completed` → "✅ {title}\n{result_summary}" (truncated 3500 chars).
  - `mission.failed` → "❌ {title}\n{error}".
  - Everything else is ignored (chat deltas would flood the channel).
- **Inbound task**: `getUpdates` long-poll loop (`timeout=50`, offset bookkeeping). Handles:
  - `callback_query` with `apv:` data → `broker.resolve(approval_id, decision, resolved_by="telegram")`, then `answerCallbackQuery` + edit the original message to show the outcome.
  - `/mission <prompt>` → `manager.create(prompt, mode="mission")`; `/research <prompt>` → mode research; `/cancel <mission_id_prefix>` → cancel; `/status` → last 5 missions w/ statuses.
  - Plain text → `manager.create(text, mode="chat")`; the final `assistant.message` for that mission is sent back as the reply (tracked by mission_id, same pattern as `core-client.js`'s pendingChats).
- **Auth**: every update is checked against `Settings.telegram_chat_id`. Mismatched or missing chat IDs are dropped silently (logged at debug).
- All Telegram API calls via `httpx.AsyncClient` against `https://api.telegram.org/bot{token}/...`; failures logged and swallowed; the loop backs off (5s → 60s) on repeated errors.

### 2.2 Settings

- `telegram_bot_token` (env `TELEGRAM_BOT_TOKEN`, default "") — from @BotFather.
- `telegram_chat_id` (env `TELEGRAM_CHAT_ID`, default "") — the commander's chat with the bot (obtainable via the bot's first `getUpdates` after messaging it; README documents the one-liner).
- Bridge starts only when both are set.

### 2.3 Approval flow note

The broker is unchanged. A Telegram approval and a desktop approval race safely — `resolve_approval`'s conditional UPDATE already arbitrates; the loser gets a "already resolved" toast/edit.

## 3. In-flight cancellation

- `MissionManager` gains `self._cancel_requested: set[str]` (+ lock). `cancel(mission_id)`:
  - `queued` → status `cancelled` (existing behavior).
  - `planning` / `awaiting_approval` / `running` → adds to `_cancel_requested`, returns True; the mission thread honors it at the next safe point and sets status `cancelled` (emitting `mission.status` as usual).
- Safe points (`_check_cancelled(mid)` raising a private `_Cancelled` exception, caught in `_run`):
  - mission mode: before plan generation; after plan approval resolves; before each stage launches.
  - awaiting approval: the pending approval is resolved as denied/expired by the broker timeout as today — cancel additionally resolves it immediately (`broker.resolve(..., "deny", resolved_by="cancel")`) so the thread unblocks without waiting out the timeout.
  - research mode: each poll tick; on cancel, call the new codex cancel route (best-effort) before marking cancelled.
  - chat mode: not cancellable once running (single engine turn).
- REST: `POST /missions/{id}/cancel` response gains `{"cancelled": bool, "pending": bool}` (`pending: true` = flagged, will stop at next safe point).

## 4. Workspace tool completions

- `calendar_update` / `calendar_delete` tools (tier 1, audited) — only if §1's Odysseus wrappers are feasible (calendar router must expose update/delete endpoints; verify during implementation, else defer).
- `email_draft`/`email_send` gain optional `in_reply_to` + `references` passthrough (already in Odysseus's `SendEmailRequest`).
- `OdysseusClient.cancel_research(session_id)` (never-raise, used by §3).

## 5. Acceptance criteria

| ID | Criterion | Verification |
|---|---|---|
| E1 | Bridge no-ops (no tasks started) when token/chat-id unset | **done (2026-06-12)** — pytest; also confirmed live (Core boots with no bridge, no token set) |
| E2 | Inbound `/mission` from the authorized chat creates a mission; from another chat id, nothing happens | **done** — pytest (mocked Telegram API) |
| E3 | `approval.requested` produces a buttons message; callback resolves the broker (approve and deny paths) | **done** — pytest |
| E4 | Plain text runs a chat mission and the final assistant text is sent back (no double-send on mission.completed) | **done** — pytest |
| E5 | Running mission cancel: flagged during stage 1 → later stages never start, status `cancelled` | **done** — pytest |
| E6 | Research cancel: flag honored at next poll, Odysseus cancel called | **done** — pytest + **live (2026-06-12)**: research mission cancelled mid-flight, codex cancel 200, Odysseus active list empty, mission `cancelled` in seconds |
| E7 | Awaiting-approval cancel resolves the pending approval immediately | **done** — pytest |
| E8 | Live: pair a real bot, run the §0 demo from the phone | **pending commander setup** — create a bot via @BotFather, set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` in `docker/.env` (instructions in `.env.example`), `docker compose up -d jarvis-core` |

## 6. Deferred

- Futuristic UI pass (neon theme, avatars, animated fleet states) — cosmetic, separate effort.
- One-command public deploy + security hardening review — needs its own checklist (secrets, network exposure, Telegram webhook vs polling).
- WhatsApp (Telegram only; WhatsApp Business API needs Meta approval).
- Voice announcements of remote-triggered sitreps.

## 7. Risks / notes

- Telegram long-polling needs outbound HTTPS only — works from the Docker network with no inbound exposure. Webhooks (inbound) are explicitly avoided.
- The bridge sends mission content to Telegram's servers — acceptable for a personal assistant, but documented in README so the commander knows sitreps leave the LAN when the bridge is enabled.
- `getUpdates` offset state is kept in memory; a Core restart may replay the last unacked update — handlers must be idempotent-ish (mission creation from a replayed text would duplicate; mitigated by acking before processing).
- Race between Telegram approve and desktop approve is already arbitrated by the ledger's conditional UPDATE (Phase 1 design).
