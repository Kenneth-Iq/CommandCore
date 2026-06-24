"""In-memory event replay helpers for CommandCore."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from commandcore.events import EventType

from .models import EventReplayResult, StoredEvent
from .store import InMemoryEventStore

StoredEventHandler = Callable[[StoredEvent], None]


@dataclass(slots=True)
class EventReplayer:
    """Replay stored events from an in-memory event store."""

    event_store: InMemoryEventStore

    def replay_all(self, handler: StoredEventHandler) -> EventReplayResult:
        """Replay all stored events in insertion order."""

        stored_events = self.event_store.read_all()
        self._deliver(stored_events, handler)
        return EventReplayResult(replayed_count=len(stored_events))

    def replay_stream(self, stream_id: str, handler: StoredEventHandler) -> EventReplayResult:
        """Replay all stored events from one stream."""

        stream = self.event_store.read_stream(stream_id)
        self._deliver(stream.events, handler)
        return EventReplayResult(replayed_count=len(stream.events), stream_id=stream_id)

    def replay_by_type(
        self,
        event_type: EventType,
        handler: StoredEventHandler,
    ) -> EventReplayResult:
        """Replay all stored events matching one event type."""

        stored_events = self.event_store.read_by_type(event_type)
        self._deliver(stored_events, handler)
        return EventReplayResult(
            replayed_count=len(stored_events),
            event_type=event_type.value,
        )

    def replay_by_correlation(
        self,
        correlation_id: str,
        handler: StoredEventHandler,
    ) -> EventReplayResult:
        """Replay all stored events matching one correlation ID."""

        stored_events = self.event_store.read_by_correlation(correlation_id)
        self._deliver(stored_events, handler)
        return EventReplayResult(
            replayed_count=len(stored_events),
            correlation_id=correlation_id,
        )

    @staticmethod
    def _deliver(stored_events: list[StoredEvent], handler: StoredEventHandler) -> None:
        for stored_event in stored_events:
            handler(stored_event)
