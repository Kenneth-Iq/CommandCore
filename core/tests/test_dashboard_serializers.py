from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.dashboard import serialize_event
from commandcore.events import Event, EventType


def make_event(event_id: str = "evt-1") -> Event:
    return Event(
        id=event_id,
        type=EventType.DOMAIN,
        source="commandcore.tests",
        payload={"event_name": "TestEventHappened", "detail": "value"},
    )


def test_serialize_event_returns_consistent_shape():
    event = make_event()

    serialized = serialize_event(event)

    assert serialized == {
        "event_id": event.id,
        "event_name": "TestEventHappened",
        "event_type": EventType.DOMAIN,
        "source": "commandcore.tests",
        "occurred_at": event.occurred_at,
        "payload": {"event_name": "TestEventHappened", "detail": "value"},
    }


def test_serialize_event_payload_is_a_copy_not_a_reference():
    event = make_event()

    serialized = serialize_event(event)
    serialized["payload"]["mutated"] = True

    assert "mutated" not in event.payload


def test_every_dashboard_service_uses_the_shared_serializer():
    """Regression guard: every dashboard module should delegate to the shared
    serializer instead of redefining its own ``_serialize_event``. This is
    what caused executive.py and workspaces.py to silently omit
    ``event_type`` before the shared helper existed."""

    import commandcore.dashboard.agents as agents_module
    import commandcore.dashboard.conversations as conversations_module
    import commandcore.dashboard.executive as executive_module
    import commandcore.dashboard.kernel as kernel_module
    import commandcore.dashboard.missions as missions_module
    import commandcore.dashboard.tools as tools_module
    import commandcore.dashboard.workspaces as workspaces_module

    for module in (
        agents_module,
        conversations_module,
        executive_module,
        kernel_module,
        missions_module,
        tools_module,
        workspaces_module,
    ):
        assert module.serialize_event is serialize_event
