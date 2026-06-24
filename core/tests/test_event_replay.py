from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.events import Event, EventType
from commandcore.eventstore import EventReplayer, InMemoryEventStore


def make_event(
    event_id: str,
    *,
    event_type: EventType = EventType.DOMAIN,
    source: str = "tests.event_replay",
    correlation_id: str | None = None,
) -> Event:
    return Event(
        id=event_id,
        type=event_type,
        source=source,
        payload={"event_name": f"evt-{event_id}"},
        correlation_id=correlation_id,
    )


def test_replay_all_delivers_all_stored_events_in_order():
    store = InMemoryEventStore()
    store.append_many(
        [
            make_event("evt-1", correlation_id="stream-alpha"),
            make_event("evt-2", correlation_id="stream-beta"),
        ]
    )
    replayed_ids: list[str] = []

    result = EventReplayer(store).replay_all(lambda stored_event: replayed_ids.append(stored_event.event.id))

    assert replayed_ids == ["evt-1", "evt-2"]
    assert result.replayed_count == 2
    assert result.stream_id is None


def test_replay_stream_delivers_only_matching_stream_events():
    store = InMemoryEventStore()
    store.append_many(
        [
            make_event("evt-1", correlation_id="stream-alpha"),
            make_event("evt-2", correlation_id="stream-alpha"),
            make_event("evt-3", correlation_id="stream-beta"),
        ]
    )
    replayed_ids: list[str] = []

    result = EventReplayer(store).replay_stream(
        "stream-alpha",
        lambda stored_event: replayed_ids.append(stored_event.event.id),
    )

    assert replayed_ids == ["evt-1", "evt-2"]
    assert result.replayed_count == 2
    assert result.stream_id == "stream-alpha"


def test_replay_by_type_delivers_only_matching_event_type():
    store = InMemoryEventStore()
    store.append_many(
        [
            make_event("evt-1", event_type=EventType.DOMAIN, correlation_id="corr-1"),
            make_event("evt-2", event_type=EventType.SYSTEM, correlation_id="corr-1"),
            make_event("evt-3", event_type=EventType.DOMAIN, correlation_id="corr-2"),
        ]
    )
    replayed_ids: list[str] = []

    result = EventReplayer(store).replay_by_type(
        EventType.DOMAIN,
        lambda stored_event: replayed_ids.append(stored_event.event.id),
    )

    assert replayed_ids == ["evt-1", "evt-3"]
    assert result.replayed_count == 2
    assert result.event_type == "domain"


def test_replay_by_correlation_delivers_only_matching_correlation_events():
    store = InMemoryEventStore()
    store.append_many(
        [
            make_event("evt-1", correlation_id="corr-1"),
            make_event("evt-2", correlation_id="corr-1"),
            make_event("evt-3", correlation_id="corr-2"),
        ]
    )
    replayed_sequences: list[int] = []

    result = EventReplayer(store).replay_by_correlation(
        "corr-1",
        lambda stored_event: replayed_sequences.append(stored_event.sequence),
    )

    assert replayed_sequences == [0, 1]
    assert result.replayed_count == 2
    assert result.correlation_id == "corr-1"


def test_replay_methods_return_zero_counts_for_no_matches():
    store = InMemoryEventStore()
    store.append(make_event("evt-1", correlation_id="corr-1"))
    replayed_ids: list[str] = []
    replayer = EventReplayer(store)

    stream_result = replayer.replay_stream("missing-stream", lambda stored_event: replayed_ids.append(stored_event.event.id))
    type_result = replayer.replay_by_type(EventType.SYSTEM, lambda stored_event: replayed_ids.append(stored_event.event.id))
    correlation_result = replayer.replay_by_correlation("missing-corr", lambda stored_event: replayed_ids.append(stored_event.event.id))

    assert replayed_ids == []
    assert stream_result.replayed_count == 0
    assert type_result.replayed_count == 0
    assert correlation_result.replayed_count == 0
