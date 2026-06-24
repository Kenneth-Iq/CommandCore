"""In-memory audit trail primitives for CommandCore."""

from __future__ import annotations

from dataclasses import dataclass, field

from commandcore.events import Event, EventType, InMemoryEventBus


@dataclass(slots=True)
class InMemoryAuditTrail:
    """Store published events as an in-memory audit log."""

    _entries: list[Event] = field(default_factory=list)

    def record_event(self, event: Event) -> Event:
        """Append one event to the audit trail."""

        self._entries.append(event)
        return event

    def list_entries(self) -> list[Event]:
        """Return all recorded audit entries in insertion order."""

        return list(self._entries)

    def list_by_event_type(self, event_type: EventType) -> list[Event]:
        """Return audit entries that match the given event type."""

        return [entry for entry in self._entries if entry.type == event_type]

    def list_by_source(self, source: str) -> list[Event]:
        """Return audit entries that match the given event source."""

        return [entry for entry in self._entries if entry.source == source]

    def clear(self) -> None:
        """Remove all recorded audit entries."""

        self._entries.clear()


def attach_audit_trail(
    event_bus: InMemoryEventBus,
    audit_trail: InMemoryAuditTrail,
) -> InMemoryAuditTrail:
    """Subscribe an audit trail to all event types on one event bus."""

    for event_type in EventType:
        event_bus.subscribe(event_type, audit_trail.record_event)
    return audit_trail
