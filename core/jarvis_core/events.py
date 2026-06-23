from __future__ import annotations

import asyncio
import threading
import uuid
from datetime import datetime, timezone

from .ledger import Ledger


def make_envelope(type_: str, payload: dict, mission_id: str | None,
                  agent_id: str | None) -> dict:
    return {
        "v": 1,
        "id": f"evt_{uuid.uuid4()}",
        "ts": datetime.now(timezone.utc).isoformat(),
        "mission_id": mission_id,
        "agent_id": agent_id,
        "type": type_,
        "payload": payload,
    }


class EventHub:
    """Persists every event to the ledger and fans it out to WebSocket
    subscribers. emit() is safe from any thread — engine workers included."""

    def __init__(self, ledger: Ledger):
        self._ledger = ledger
        self._subscribers: set[asyncio.Queue] = set()
        self._loop: asyncio.AbstractEventLoop | None = None
        self._sub_lock = threading.Lock()

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        with self._sub_lock:
            self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        with self._sub_lock:
            self._subscribers.discard(q)

    def emit(self, type_: str, payload: dict, mission_id: str | None = None,
             agent_id: str | None = None) -> dict:
        event = make_envelope(type_, payload, mission_id, agent_id)
        self._ledger.insert_event(event)
        if self._loop is not None:
            self._loop.call_soon_threadsafe(self._broadcast, event)
        return event

    def _broadcast(self, event: dict) -> None:
        with self._sub_lock:
            subscribers = list(self._subscribers)
        for q in subscribers:
            q.put_nowait(event)
