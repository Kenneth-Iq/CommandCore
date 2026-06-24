"""In-memory event store foundation for CommandCore."""

from __future__ import annotations

from dataclasses import dataclass, field

from commandcore.events import Event, EventType

from .models import EventStream, StoredEvent


@dataclass(slots=True)
class InMemoryEventStore:
    """Store canonical events in ordered in-memory streams."""

    _events: list[StoredEvent] = field(default_factory=list)

    def append(self, event: Event) -> StoredEvent:
        """Append one event and return its stored envelope."""

        stored_event = StoredEvent(
            sequence=len(self._events),
            stream_id=self._stream_id_for(event),
            event=event,
        )
        self._events.append(stored_event)
        return stored_event

    def append_many(self, events: list[Event]) -> list[StoredEvent]:
        """Append many events in order and return their stored envelopes."""

        return [self.append(event) for event in events]

    def read_all(self) -> list[StoredEvent]:
        """Return all stored events in insertion order."""

        return list(self._events)

    def read_stream(self, stream_id: str) -> EventStream:
        """Return one event stream by stream ID."""

        return EventStream(
            stream_id=stream_id,
            events=[stored_event for stored_event in self._events if stored_event.stream_id == stream_id],
        )

    def read_by_type(self, event_type: EventType) -> list[StoredEvent]:
        """Return stored events matching one event type."""

        return [stored_event for stored_event in self._events if stored_event.event.type == event_type]

    def read_by_source(self, source: str) -> list[StoredEvent]:
        """Return stored events matching one event source."""

        return [stored_event for stored_event in self._events if stored_event.event.source == source]

    def read_by_correlation(self, correlation_id: str) -> list[StoredEvent]:
        """Return stored events matching one correlation ID."""

        return [
            stored_event
            for stored_event in self._events
            if stored_event.event.correlation_id == correlation_id
        ]

    def clear(self) -> None:
        """Remove all stored events."""

        self._events.clear()

    @staticmethod
    def _stream_id_for(event: Event) -> str:
        return event.correlation_id or str(event.payload.get("stream_id") or event.source)
