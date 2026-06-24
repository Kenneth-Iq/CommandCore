from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.audit import InMemoryAuditTrail, attach_audit_trail
from commandcore.events import Event, EventType, InMemoryEventBus


def make_event(event_id: str, *, event_type: EventType, source: str) -> Event:
    return Event(
        id=event_id,
        type=event_type,
        source=source,
        payload={"event_name": f"evt-{event_id}"},
    )


def test_record_event_and_list_entries_preserve_order():
    trail = InMemoryAuditTrail()
    first = make_event("evt-1", event_type=EventType.DOMAIN, source="tests.alpha")
    second = make_event("evt-2", event_type=EventType.SYSTEM, source="tests.beta")

    recorded = trail.record_event(first)
    trail.record_event(second)

    assert recorded == first
    assert trail.list_entries() == [first, second]


def test_list_by_event_type_filters_entries():
    trail = InMemoryAuditTrail()
    domain_event = make_event("evt-1", event_type=EventType.DOMAIN, source="tests.alpha")
    lifecycle_event = make_event("evt-2", event_type=EventType.LIFECYCLE, source="tests.beta")
    second_domain_event = make_event("evt-3", event_type=EventType.DOMAIN, source="tests.gamma")

    trail.record_event(domain_event)
    trail.record_event(lifecycle_event)
    trail.record_event(second_domain_event)

    assert trail.list_by_event_type(EventType.DOMAIN) == [domain_event, second_domain_event]


def test_list_by_source_filters_entries():
    trail = InMemoryAuditTrail()
    first = make_event("evt-1", event_type=EventType.DOMAIN, source="tests.alpha")
    second = make_event("evt-2", event_type=EventType.SYSTEM, source="tests.alpha")
    third = make_event("evt-3", event_type=EventType.DOMAIN, source="tests.beta")

    trail.record_event(first)
    trail.record_event(second)
    trail.record_event(third)

    assert trail.list_by_source("tests.alpha") == [first, second]


def test_clear_removes_all_entries():
    trail = InMemoryAuditTrail()
    trail.record_event(make_event("evt-1", event_type=EventType.DOMAIN, source="tests.alpha"))
    trail.record_event(make_event("evt-2", event_type=EventType.SYSTEM, source="tests.beta"))

    trail.clear()

    assert trail.list_entries() == []
    assert trail.list_by_event_type(EventType.DOMAIN) == []
    assert trail.list_by_source("tests.alpha") == []


def test_attach_audit_trail_records_events_published_by_event_bus():
    bus = InMemoryEventBus()
    trail = attach_audit_trail(bus, InMemoryAuditTrail())
    domain_event = make_event("evt-1", event_type=EventType.DOMAIN, source="tests.alpha")
    system_event = make_event("evt-2", event_type=EventType.SYSTEM, source="tests.beta")

    bus.publish(domain_event)
    bus.publish(system_event)

    assert trail.list_entries() == [domain_event, system_event]
