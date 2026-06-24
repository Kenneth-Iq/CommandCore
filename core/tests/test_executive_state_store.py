from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.events import InMemoryEventBus
from commandcore.executive import Decision, Directive, ExecutiveStateStore, Objective


def make_objective(objective_id: str) -> Objective:
    return Objective(
        id=objective_id,
        title="Resolve project blockers",
        summary="Review active blockers and recommend next actions.",
        requested_by="jarvis",
        scope=["company:mindx", "project:proj-jarvis"],
        priority="high",
    )


def make_directive(directive_id: str) -> Directive:
    return Directive(
        id=directive_id,
        summary="Prepare an executive-ready blocker summary.",
        issued_by="athena",
        directive_type="operations",
    )


def make_decision(decision_id: str) -> Decision:
    return Decision(
        id=decision_id,
        summary="Prioritize missing runbook remediation first.",
        decided_by="jarvis",
        decision_type="priority",
        rationale="Missing operational guidance is blocking execution.",
    )


def test_record_and_query_histories():
    store = ExecutiveStateStore()
    objective = make_objective("obj-1")
    directive = make_directive("dir-1")
    decision = make_decision("dec-1")

    store.record_objective(objective)
    store.record_directive(objective.id, directive)
    store.record_decision(objective.id, decision)
    recorded_mission_id = store.record_mission(objective.id, "mission-1")
    outcome = store.record_outcome(objective.id, "Mission completed.")

    assert store.get_objective_history() == {"obj-1": [objective]}
    assert store.get_directive_history(objective.id) == [directive]
    assert store.get_decision_history(objective.id) == [decision]
    assert store.get_mission_history(objective.id) == ["mission-1"]
    assert recorded_mission_id == "mission-1"
    assert outcome.outcome == "Mission completed."
    assert store.get_outcome_history(objective.id) == [outcome]


def test_global_queries_return_all_grouped_histories():
    store = ExecutiveStateStore()
    objective_a = make_objective("obj-1")
    objective_b = make_objective("obj-2")
    store.record_objective(objective_a)
    store.record_objective(objective_b)
    directive = make_directive("dir-1")
    decision = make_decision("dec-1")
    store.record_directive(objective_a.id, directive)
    store.record_decision(objective_b.id, decision)
    store.record_mission(objective_a.id, "mission-1")
    outcome = store.record_outcome(objective_b.id, "Mission failed.")

    assert store.get_directive_history() == {"obj-1": [directive]}
    assert store.get_decision_history() == {"obj-2": [decision]}
    assert store.get_mission_history() == {"obj-1": ["mission-1"]}
    assert store.get_outcome_history() == {"obj-2": [outcome]}


def test_recording_for_missing_objective_raises():
    store = ExecutiveStateStore()

    with pytest.raises(KeyError):
        store.record_directive("missing", make_directive("dir-1"))

    with pytest.raises(KeyError):
        store.record_decision("missing", make_decision("dec-1"))

    with pytest.raises(KeyError):
        store.record_mission("missing", "mission-1")

    with pytest.raises(KeyError):
        store.record_outcome("missing", "Mission completed.")


def test_state_events_are_published_when_event_bus_is_provided():
    bus = InMemoryEventBus()
    store = ExecutiveStateStore(event_bus=bus, source="custom.executive.state")
    objective = make_objective("obj-1")

    store.record_objective(objective)
    store.record_directive(objective.id, make_directive("dir-1"))
    store.record_decision(objective.id, make_decision("dec-1"))
    store.record_mission(objective.id, "mission-1")
    store.record_outcome(objective.id, "Mission completed.")

    events = bus.list_events()
    assert [event.payload["event_name"] for event in events] == [
        "ExecutiveStateUpdated",
        "ExecutiveStateUpdated",
        "ExecutiveStateUpdated",
        "ExecutiveStateUpdated",
        "ExecutiveOutcomeRecorded",
    ]
    assert all(event.source == "custom.executive.state" for event in events)
    assert events[0].payload["record_type"] == "objective"
    assert events[1].payload["record_type"] == "directive"
    assert events[2].payload["record_type"] == "decision"
    assert events[3].payload["record_type"] == "mission"
    assert events[4].payload["outcome"] == "Mission completed."


def test_queries_return_empty_history_when_no_records_exist():
    store = ExecutiveStateStore()

    assert store.get_objective_history() == {}
    assert store.get_mission_history("missing") == []
    assert store.get_decision_history("missing") == []
    assert store.get_directive_history("missing") == []
    assert store.get_outcome_history("missing") == []
