"""Telegram bridge — two-way mobile command & control (PHASE-5.md §2).

Runs as two asyncio tasks inside Core's event loop:
  outbound: EventHub subscriber -> approval prompts (inline buttons),
            sitreps, failures, chat replies to the commander's chat
  inbound:  getUpdates long-poll -> /mission, /research, /cancel, /status,
            approval button callbacks, plain-text chat turns

Only the configured commander chat id is honored; everything else is
dropped. The bridge is a no-op unless both token and chat id are set.
Long-polling means outbound HTTPS only — no inbound exposure.
"""
from __future__ import annotations

import asyncio
import logging

import httpx

logger = logging.getLogger(__name__)

POLL_TIMEOUT = 50          # Telegram long-poll window (seconds)
ERROR_BACKOFF_MAX = 60.0
MESSAGE_LIMIT = 3500       # Telegram cap is 4096; keep headroom

FORWARDED_EVENTS = {"approval.requested", "mission.completed", "mission.failed"}

HELP_TEXT = (
    "Jarvis remote bridge:\n"
    "/mission <prompt> — run a fleet mission\n"
    "/research <prompt> — run a deep-research mission\n"
    "/status — last 5 missions\n"
    "/cancel <mission id or prefix> — cancel a mission\n"
    "any other text — quick chat turn"
)


class TelegramBridge:
    def __init__(self, settings, ledger, hub, broker, manager):
        self.token = settings.telegram_bot_token
        self.chat_id = str(settings.telegram_chat_id)
        self.ledger = ledger
        self.hub = hub
        self.broker = broker
        self.manager = manager
        self.api = f"https://api.telegram.org/bot{self.token}"
        self._tasks: list[asyncio.Task] = []
        self._client: httpx.AsyncClient | None = None
        # chat-mode missions launched from Telegram, awaiting their final text
        self._pending_chats: set[str] = set()

    @property
    def enabled(self) -> bool:
        return bool(self.token and self.chat_id)

    def start(self) -> None:
        if not self.enabled:
            return
        self._client = httpx.AsyncClient(timeout=POLL_TIMEOUT + 10)
        self._tasks = [
            asyncio.create_task(self._outbound_loop(), name="tg-outbound"),
            asyncio.create_task(self._inbound_loop(), name="tg-inbound"),
        ]
        logger.info("Telegram bridge started (chat %s)", self.chat_id)

    async def stop(self) -> None:
        for task in self._tasks:
            task.cancel()
        for task in self._tasks:
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass
        if self._client is not None:
            await self._client.aclose()

    # ── telegram api helpers (never raise) ──────────────────────────────────

    async def _call(self, method: str, **payload):
        try:
            resp = await self._client.post(f"{self.api}/{method}", json=payload)
            data = resp.json()
            if not data.get("ok"):
                logger.debug("Telegram %s failed: %s", method, str(data)[:200])
                return None
            return data.get("result")
        except Exception:
            logger.debug("Telegram %s errored", method, exc_info=True)
            return None

    async def _send(self, text: str, reply_markup: dict | None = None):
        payload = {"chat_id": self.chat_id, "text": text[:MESSAGE_LIMIT]}
        if reply_markup:
            payload["reply_markup"] = reply_markup
        return await self._call("sendMessage", **payload)

    # ── outbound: events -> phone ────────────────────────────────────────────

    async def _outbound_loop(self) -> None:
        queue = self.hub.subscribe()
        try:
            while True:
                event = await queue.get()
                try:
                    await self._handle_event(event)
                except Exception:
                    logger.debug("Telegram outbound handler failed", exc_info=True)
        finally:
            self.hub.unsubscribe(queue)

    async def _handle_event(self, event: dict) -> None:
        etype = event.get("type", "")
        payload = event.get("payload", {})
        mission_id = event.get("mission_id")

        # final text of a chat turn launched from Telegram
        if (etype == "assistant.message" and payload.get("final")
                and mission_id in self._pending_chats):
            self._pending_chats.discard(mission_id)
            await self._send(payload.get("text") or "(no reply)")
            return

        if etype not in FORWARDED_EVENTS:
            return
        mission = self.ledger.get_mission(mission_id) if mission_id else None
        title = (mission or {}).get("title") or mission_id or "?"

        if etype == "approval.requested":
            ap_id = payload.get("approval_id", "")
            text = (f"🔐 Approval needed — {title}\n"
                    f"[tier {payload.get('tier')}] {payload.get('action')}\n\n"
                    f"{payload.get('description', '')[:1500]}")
            buttons = {"inline_keyboard": [[
                {"text": "✅ Approve", "callback_data": f"apv:{ap_id}:approve"},
                {"text": "❌ Deny", "callback_data": f"apv:{ap_id}:deny"},
            ]]}
            await self._send(text, reply_markup=buttons)
        elif etype == "mission.completed":
            if (mission or {}).get("mode") == "chat":
                return  # chat replies arrive via assistant.message, not sitreps
            await self._send(f"✅ {title}\n\n{payload.get('result_summary') or ''}")
        elif etype == "mission.failed":
            self._pending_chats.discard(mission_id)
            await self._send(f"❌ {title}\n\n{payload.get('error') or ''}")

    # ── inbound: phone -> core ───────────────────────────────────────────────

    async def _inbound_loop(self) -> None:
        offset = 0
        backoff = 5.0
        while True:
            result = await self._call("getUpdates", offset=offset,
                                      timeout=POLL_TIMEOUT,
                                      allowed_updates=["message", "callback_query"])
            if result is None:
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, ERROR_BACKOFF_MAX)
                continue
            backoff = 5.0
            for update in result:
                # ack first: a crash must not replay (PHASE-5.md §7)
                offset = max(offset, update.get("update_id", 0) + 1)
                try:
                    await self._handle_update(update)
                except Exception:
                    logger.debug("Telegram update handler failed", exc_info=True)

    async def _handle_update(self, update: dict) -> None:
        if "callback_query" in update:
            await self._handle_callback(update["callback_query"])
            return
        message = update.get("message") or {}
        chat_id = str((message.get("chat") or {}).get("id", ""))
        text = (message.get("text") or "").strip()
        if chat_id != self.chat_id or not text:
            if text:
                logger.debug("Dropping Telegram message from unauthorized chat %s", chat_id)
            return
        await self._handle_command(text)

    async def _handle_callback(self, callback: dict) -> None:
        chat_id = str(((callback.get("message") or {}).get("chat") or {}).get("id", ""))
        data = callback.get("data") or ""
        if chat_id != self.chat_id or not data.startswith("apv:"):
            return
        _, ap_id, decision = (data.split(":") + ["", ""])[:3]
        if decision not in ("approve", "deny"):
            return
        row = self.broker.resolve(ap_id, decision, resolved_by="telegram")
        outcome = ("✅ approved" if decision == "approve" else "❌ denied") \
            if row is not None else "⚠️ already resolved or expired"
        await self._call("answerCallbackQuery",
                         callback_query_id=callback.get("id"), text=outcome)
        msg = callback.get("message") or {}
        if msg.get("message_id"):
            await self._call("editMessageText", chat_id=self.chat_id,
                             message_id=msg["message_id"],
                             text=f"{(msg.get('text') or '')[:1500]}\n\n→ {outcome}")

    async def _handle_command(self, text: str) -> None:
        loop = asyncio.get_running_loop()
        if text.startswith("/start") or text.startswith("/help"):
            await self._send(HELP_TEXT)
            return
        if text.startswith("/status"):
            missions = self.ledger.list_missions()[-5:]
            lines = [f"{m['status']:>10}  {m['id'][:14]}…  {m['title'][:40]}"
                     for m in missions] or ["no missions yet"]
            await self._send("\n".join(lines))
            return
        if text.startswith("/cancel"):
            prefix = text.partition(" ")[2].strip()
            target = next((m for m in reversed(self.ledger.list_missions())
                           if m["id"].startswith(prefix or "m_")
                           and m["status"] in ("queued", "planning",
                                               "awaiting_approval", "running")), None)
            if target is None:
                await self._send("No matching cancellable mission.")
                return
            outcome = await loop.run_in_executor(None, self.manager.cancel, target["id"])
            state = "cancelled" if outcome["cancelled"] else \
                "stopping at next safe point" if outcome["pending"] else "not cancellable"
            await self._send(f"{target['title'][:50]} — {state}")
            return
        if text.startswith("/mission") or text.startswith("/research"):
            mode = "mission" if text.startswith("/mission") else "research"
            prompt = text.partition(" ")[2].strip()
            if not prompt:
                await self._send(f"Usage: /{mode} <prompt>")
                return
            mission = await loop.run_in_executor(
                None, lambda: self.manager.create(prompt, mode=mode))
            await self._send(f"🚀 {mode} launched: {mission['title']}\n{mission['id']}")
            return
        # plain text -> chat turn; reply comes via the outbound loop
        mission = await loop.run_in_executor(
            None, lambda: self.manager.create(text, mode="chat"))
        self._pending_chats.add(mission["id"])
