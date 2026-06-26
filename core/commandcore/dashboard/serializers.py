"""Shared read-only serialization helpers for CommandCore dashboard services.

Every dashboard service that surfaces audit/event entries should use
``serialize_event`` so the resulting payload shape (event_id, event_name,
event_type, source, occurred_at, payload) stays identical across every
dashboard. Before this module existed, six dashboard services each defined
their own copy of this method, and two of them (executive, workspaces) had
silently drifted to omit ``event_type``.
"""

from __future__ import annotations

from commandcore.events import Event


def serialize_event(event: Event) -> dict[str, object]:
    return {
        "event_id": event.id,
        "event_name": event.payload.get("event_name"),
        "event_type": event.type,
        "source": event.source,
        "occurred_at": event.occurred_at,
        "payload": dict(event.payload),
    }
