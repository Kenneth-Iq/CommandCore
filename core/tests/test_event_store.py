from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.events import Event, EventType
from commandcore.eventstore import EventStream, InMemoryEventStore


def make_event(
    event_id: str,
    *,
    event_type: EventType = EventType.DOMAIN,
    source: str = "tests.event_store",
    correlation_id: str | None = None,
    payload: dict[str, object] | None = None,
) -> Event:
    return Event(
        id=event_id,
        type=event_type,
        source=source,
        payload=payload or {"event_name": f"evt-{event_id}"},
        correlation_id=correlation_id,
    )


def test_append_and_read_all_preserve_order_and_sequence():
    store = InMemoryEventStore()
    first = make_event("evt-1", correlation_id="stream-alpha")
    second = make_event("evt-2", event_type=EventType.SYSTEM, correlation_id="stream-beta")

    stored_first = store.append(first)
    stored_second = store.append(second)

    assert stored_first.sequence == 0
    assert stored_first.stream_id == "stream-alpha"
    assert stored_second.sequence == 1
    assert stored_second.stream_id == "stream-beta"
    assert [stored.event.id for stored in store.read_all()] == ["evt-1", "evt-2"]


def test_append_many_returns_stored_events_in_order():
    store = InMemoryEventStore()
    events = [
        make_event("evt-1", correlation_id="stream-alpha"),
        make_event("evt-2", correlation_id="stream-alpha"),
        make_event("evt-3", correlation_id="stream-beta"),
    ]

    stored_events = store.append_many(events)

    assert [stored.sequence for stored in stored_events] == [0, 1, 2]
    assert [stored.event.id for stored in stored_events] == ["evt-1", "evt-2", "evt-3"]


def test_read_stream_returns_named_stream_and_matching_events():
    store = InMemoryEventStore()
    store.append_many(
        [
            make_event("evt-1", correlation_id="stream-alpha"),
            make_event("evt-2", correlation_id="stream-alpha"),
            make_event("evt-3", correlation_id="stream-beta"),
        ]
    )

    stream = store.read_stream("stream-alpha")

    assert isinstance(stream, EventStream)
    assert stream.stream_id == "stream-alpha"
    assert [stored.event.id for stored in stream.events] == ["evt-1", "evt-2"]


def test_read_filters_support_type_source_and_correlation():
    store = InMemoryEventStore()
    first = make_event("evt-1", event_type=EventType.DOMAIN, source="tests.alpha", correlation_id="corr-1")
    second = make_event("evt-2", event_type=EventType.LIFECYCLE, source="tests.beta", correlation_id="corr-1")
    third = make_event("evt-3", event_type=EventType.DOMAIN, source="tests.alpha", correlation_id="corr-2")
    store.append_many([first, second, third])

    assert [stored.event.id for stored in store.read_by_type(EventType.DOMAIN)] == ["evt-1", "evt-3"]
    assert [stored.event.id for stored in store.read_by_source("tests.alpha")] == ["evt-1", "evt-3"]
    assert [stored.event.id for stored in store.read_by_correlation("corr-1")] == ["evt-1", "evt-2"]


def test_stream_id_falls_back_to_payload_then_source_when_correlation_absent():
    store = InMemoryEventStore()
    payload_stream_event = make_event(
        "evt-1",
        source="tests.alpha",
        payload={"event_name": "evt-1", "stream_id": "payload-stream"},
    )
    source_stream_event = make_event("evt-2", source="tests.beta")

    stored_payload_stream_event = store.append(payload_stream_event)
    stored_source_stream_event = store.append(source_stream_event)

    assert stored_payload_stream_event.stream_id == "payload-stream"
    assert stored_source_stream_event.stream_id == "tests.beta"


def test_clear_removes_all_stored_events():
    store = InMemoryEventStore()
    store.append(make_event("evt-1", correlation_id="stream-alpha"))
    store.append(make_event("evt-2", correlation_id="stream-beta"))

    store.clear()

    assert store.read_all() == []
    assert store.read_stream("stream-alpha").events == []
