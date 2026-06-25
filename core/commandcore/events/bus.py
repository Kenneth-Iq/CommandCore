"""Synchronous in-memory event bus for the CommandCore kernel."""

from __future__ import annotations

from collections import defaultdict
from typing import TYPE_CHECKING

from .models import Event, EventHandler, EventType

if TYPE_CHECKING:
    from commandcore.eventstore import InMemoryEventStore


class InMemoryEventBus:
    """Store and dispatch events synchronously within one process."""

    def __init__(self, event_store: "InMemoryEventStore | None" = None) -> None:
        self._events: list[Event] = []
        self._handlers: dict[EventType, list[EventHandler]] = defaultdict(list)
        self.event_store = event_store

    def publish(self, event: Event) -> Event:
        """Store an event and synchronously notify subscribed handlers."""

        self._events.append(event)
        if self.event_store is not None:
            self.event_store.append(event)
        for handler in list(self._handlers[event.type]):
            handler(event)
        return event

    def subscribe(self, event_type: EventType, handler: EventHandler) -> EventHandler:
        """Register a handler for the given event type if not already present."""

        if handler not in self._handlers[event_type]:
            self._handlers[event_type].append(handler)
        return handler

    def unsubscribe(
        self, event_type: EventType, handler: EventHandler
    ) -> EventHandler:
        """Remove a handler for the given event type if it is present."""

        handlers = self._handlers[event_type]
        if handler in handlers:
            handlers.remove(handler)
            if not handlers:
                del self._handlers[event_type]
        return handler

    def list_events(self) -> list[Event]:
        """Return all published events in insertion order."""

        return list(self._events)

    def list_events_by_type(self, event_type: EventType) -> list[Event]:
        """Return published events matching the given event type."""

        return [event for event in self._events if event.type == event_type]

    def clear(self) -> None:
        """Reset the in-memory event log and all subscriptions."""

        self._events.clear()
        self._handlers.clear()
