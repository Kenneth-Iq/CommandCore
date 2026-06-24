from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.events import InMemoryEventBus
from commandcore.executive import (
    ApprovalRequest,
    Decision,
    Directive,
    ExecutiveRuntime,
    MissionRequest,
    Objective,
)


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


def make_approval_request(request_id: str) -> ApprovalRequest:
    return ApprovalRequest(
        id=request_id,
        summary="Approve cross-project blocker review mission.",
        requested_by="jarvis",
        reviewer_reference="user:kenneth",
        approval_type="mission",
    )


def make_mission_request(request_id: str) -> MissionRequest:
    return MissionRequest(
        id=request_id,
        title="Summarize blocker context",
        requested_by="jarvis",
        scope=["project:proj-jarvis", "knowledge:blockers"],
        capability_ids=["cap-search"],
        required_output="Cited blocker summary",
        approval_required=True,
    )


def test_submit_get_and_list_objectives():
    runtime = ExecutiveRuntime()
    objective = make_objective("obj-1")

    runtime.submit_objective(objective)

    assert runtime.get_objective("obj-1") == objective
    assert runtime.list_objectives() == [objective]


def test_submit_duplicate_objective_raises():
    runtime = ExecutiveRuntime()
    objective = make_objective("obj-1")
    runtime.submit_objective(objective)

    with pytest.raises(ValueError):
        runtime.submit_objective(objective)


def test_get_missing_objective_raises():
    runtime = ExecutiveRuntime()

    with pytest.raises(KeyError):
        runtime.get_objective("missing-objective")


def test_create_directive_and_list_directives():
    runtime = ExecutiveRuntime()
    objective = runtime.submit_objective(make_objective("obj-1"))
    directive = make_directive("dir-1")

    runtime.create_directive(objective.id, directive)

    assert runtime.list_directives(objective.id) == [directive]


def test_create_decision_and_list_decisions():
    runtime = ExecutiveRuntime()
    objective = runtime.submit_objective(make_objective("obj-1"))
    decision = make_decision("dec-1")

    runtime.create_decision(objective.id, decision)

    assert runtime.list_decisions(objective.id) == [decision]


def test_request_approval_and_create_mission_request():
    runtime = ExecutiveRuntime()
    objective = runtime.submit_objective(make_objective("obj-1"))
    approval_request = make_approval_request("apr-1")
    mission_request = make_mission_request("mr-1")

    approved = runtime.request_approval(objective.id, approval_request)
    created = runtime.create_mission_request(objective.id, mission_request)

    assert approved == approval_request
    assert created == mission_request


def test_child_operations_raise_for_missing_objective():
    runtime = ExecutiveRuntime()

    with pytest.raises(KeyError):
        runtime.create_directive("missing", make_directive("dir-1"))

    with pytest.raises(KeyError):
        runtime.create_decision("missing", make_decision("dec-1"))

    with pytest.raises(KeyError):
        runtime.request_approval("missing", make_approval_request("apr-1"))

    with pytest.raises(KeyError):
        runtime.create_mission_request("missing", make_mission_request("mr-1"))


def test_events_are_published_when_event_bus_is_provided():
    bus = InMemoryEventBus()
    runtime = ExecutiveRuntime(event_bus=bus, source="custom.executive.source")
    objective = make_objective("obj-1")
    directive = make_directive("dir-1")
    decision = make_decision("dec-1")
    approval_request = make_approval_request("apr-1")
    mission_request = make_mission_request("mr-1")

    runtime.submit_objective(objective)
    runtime.create_directive(objective.id, directive)
    runtime.create_decision(objective.id, decision)
    runtime.request_approval(objective.id, approval_request)
    runtime.create_mission_request(objective.id, mission_request)

    events = bus.list_events()
    assert [event.payload["event_name"] for event in events] == [
        "ExecutiveObjectiveSubmitted",
        "ExecutiveDirectiveCreated",
        "ExecutiveDecisionCreated",
        "ExecutiveApprovalRequested",
        "ExecutiveMissionRequested",
    ]
    assert all(event.source == "custom.executive.source" for event in events)
    assert events[0].payload["objective_id"] == "obj-1"
    assert events[1].payload["directive_id"] == "dir-1"
    assert events[2].payload["decision_id"] == "dec-1"
    assert events[3].payload["approval_request_id"] == "apr-1"
    assert events[4].payload["mission_request_id"] == "mr-1"


def test_behavior_is_unchanged_without_event_bus():
    runtime = ExecutiveRuntime()
    objective = make_objective("obj-1")

    runtime.submit_objective(objective)
    runtime.create_directive(objective.id, make_directive("dir-1"))
    runtime.create_decision(objective.id, make_decision("dec-1"))
    runtime.request_approval(objective.id, make_approval_request("apr-1"))
    runtime.create_mission_request(objective.id, make_mission_request("mr-1"))

    assert runtime.get_objective("obj-1") == objective
    assert len(runtime.list_directives("obj-1")) == 1
    assert len(runtime.list_decisions("obj-1")) == 1
