from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.events import Event, EventType, InMemoryEventBus
from commandcore.eventstore import InMemoryEventStore


def test_publish_stores_event_and_notifies_subscribers():
    bus = InMemoryEventBus()
    received: list[Event] = []

    def handler(event: Event) -> None:
        received.append(event)

    event = Event(
        type=EventType.DOMAIN,
        source="tests.event_bus",
        payload={"entity_id": "cap-search"},
    )
    bus.subscribe(EventType.DOMAIN, handler)

    published = bus.publish(event)

    assert published == event
    assert received == [event]
    assert bus.list_events() == [event]


def test_publish_appends_to_event_store_when_configured():
    store = InMemoryEventStore()
    bus = InMemoryEventBus(event_store=store)
    event = Event(
        type=EventType.DOMAIN,
        source="tests.event_bus",
        payload={"entity_id": "workspace-local"},
    )

    published = bus.publish(event)

    assert published == event
    assert bus.list_events() == [event]
    assert [stored.event for stored in store.read_all()] == [event]


def test_list_events_by_type_filters_in_insertion_order():
    bus = InMemoryEventBus()
    domain_event = Event(
        type=EventType.DOMAIN,
        source="tests.event_bus",
        payload={"entity_id": "company-mindx"},
    )
    lifecycle_event = Event(
        type=EventType.LIFECYCLE,
        source="tests.event_bus",
        payload={"entity_id": "proj-jarvis"},
    )
    second_domain_event = Event(
        type=EventType.DOMAIN,
        source="tests.event_bus",
        payload={"entity_id": "agent-hermes"},
    )

    bus.publish(domain_event)
    bus.publish(lifecycle_event)
    bus.publish(second_domain_event)

    assert bus.list_events_by_type(EventType.DOMAIN) == [
        domain_event,
        second_domain_event,
    ]


def test_unsubscribe_stops_future_delivery():
    bus = InMemoryEventBus()
    received: list[Event] = []

    def handler(event: Event) -> None:
        received.append(event)

    first_event = Event(
        type=EventType.SYSTEM,
        source="tests.event_bus",
        payload={"step": "before"},
    )
    second_event = Event(
        type=EventType.SYSTEM,
        source="tests.event_bus",
        payload={"step": "after"},
    )

    bus.subscribe(EventType.SYSTEM, handler)
    bus.publish(first_event)
    bus.unsubscribe(EventType.SYSTEM, handler)
    bus.publish(second_event)

    assert received == [first_event]
    assert bus.list_events() == [first_event, second_event]


def test_clear_resets_events_and_subscriptions():
    bus = InMemoryEventBus()
    received: list[Event] = []

    def handler(event: Event) -> None:
        received.append(event)

    first_event = Event(
        type=EventType.DOMAIN,
        source="tests.event_bus",
        payload={"entity_id": "workspace-local"},
    )
    second_event = Event(
        type=EventType.DOMAIN,
        source="tests.event_bus",
        payload={"entity_id": "workspace-remote"},
    )

    bus.subscribe(EventType.DOMAIN, handler)
    bus.publish(first_event)
    bus.clear()
    bus.publish(second_event)

    assert received == [first_event]
    assert bus.list_events() == [second_event]
    assert bus.list_events_by_type(EventType.DOMAIN) == [second_event]


def test_publish_without_event_store_keeps_existing_behavior():
    bus = InMemoryEventBus()
    event = Event(
        type=EventType.SYSTEM,
        source="tests.event_bus",
        payload={"step": "no-store"},
    )

    published = bus.publish(event)

    assert published == event
    assert bus.list_events() == [event]


def test_event_supports_optional_correlation_and_causation_ids():
    event = Event(
        id="evt-1",
        type=EventType.LIFECYCLE,
        source="tests.event_bus",
        occurred_at="2026-06-24T00:00:00Z",
        payload={"state": "active"},
        correlation_id="corr-1",
        causation_id="cause-1",
    )

    assert event.id == "evt-1"
    assert event.correlation_id == "corr-1"
    assert event.causation_id == "cause-1"
