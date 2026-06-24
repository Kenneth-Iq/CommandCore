from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.contracts import MissionStatus
from commandcore.events import InMemoryEventBus
from commandcore.executive import (
    ExecutiveMissionOrchestrator,
    ExecutivePolicyEngine,
    ExecutivePolicyGate,
    ExecutiveRuntime,
    ExecutiveStateStore,
    Objective,
    PolicyDecision,
    PolicyRule,
)
from commandcore.mission import MissionEngine


def make_objective(objective_id: str, *, title: str = "Resolve project blockers") -> Objective:
    return Objective(
        id=objective_id,
        title=title,
        summary="Review active blockers and recommend next actions.",
        requested_by="jarvis",
        scope=["company:mindx", "project:proj-jarvis"],
        priority="high",
    )


def make_policy_gate(bus: InMemoryEventBus | None = None) -> ExecutivePolicyGate:
    return ExecutivePolicyGate(policy_engine=ExecutivePolicyEngine(event_bus=bus), event_bus=bus)


def test_submit_objective_creates_mission_request_and_mission():
    bus = InMemoryEventBus()
    runtime = ExecutiveRuntime(event_bus=bus)
    mission_engine = MissionEngine(event_bus=bus)
    orchestrator = ExecutiveMissionOrchestrator(
        executive_runtime=runtime,
        mission_engine=mission_engine,
        event_bus=bus,
    )

    result = orchestrator.submit_objective(make_objective("obj-1"))

    assert result.status == "allowed"
    assert result.mission_id == "mission-mr-obj-1"
    assert result.mission_request_id == "mr-obj-1"
    assert result.warnings == []
    assert runtime.get_objective("obj-1").title == "Resolve project blockers"
    assert mission_engine.get_mission(result.mission_id).id == result.mission_id
    assert orchestrator.get_mission_for_objective("obj-1").id == result.mission_id
    assert orchestrator.get_mission_status_for_objective("obj-1") == MissionStatus.REQUESTED


def test_submit_objective_returns_blocked_result_without_creating_mission():
    bus = InMemoryEventBus()
    runtime = ExecutiveRuntime(event_bus=bus)
    mission_engine = MissionEngine(event_bus=bus)
    policy_gate = make_policy_gate(bus)
    policy_gate.policy_engine.add_rule(
        PolicyRule(
            id="block-secret",
            target_type="objective",
            field_name="title",
            operator="contains",
            expected_value="secret",
            decision=PolicyDecision.BLOCK,
            message="Objectives containing secret work are blocked.",
        )
    )
    orchestrator = ExecutiveMissionOrchestrator(
        executive_runtime=runtime,
        mission_engine=mission_engine,
        policy_gate=policy_gate,
        event_bus=bus,
    )

    result = orchestrator.submit_objective(
        make_objective("obj-1", title="Review secret access pathway")
    )

    assert result.status == "blocked"
    assert result.mission_id is None
    assert result.mission_request_id is None
    assert result.warnings == ["Objectives containing secret work are blocked."]
    assert runtime.list_objectives() == []
    assert mission_engine.list_missions() == []
    event_names = [event.payload["event_name"] for event in bus.list_events()]
    assert "ExecutivePolicyGateChecked" in event_names
    assert "ExecutiveMissionCreated" not in event_names


def test_submit_objective_preserves_policy_warnings_and_records_state():
    bus = InMemoryEventBus()
    runtime = ExecutiveRuntime(event_bus=bus)
    mission_engine = MissionEngine(event_bus=bus)
    policy_gate = make_policy_gate(bus)
    policy_gate.policy_engine.add_rule(
        PolicyRule(
            id="warn-high-priority",
            target_type="objective",
            field_name="priority",
            expected_value="high",
            decision=PolicyDecision.WARN,
            message="High-priority objectives require review.",
        )
    )
    state_store = ExecutiveStateStore(event_bus=bus)
    orchestrator = ExecutiveMissionOrchestrator(
        executive_runtime=runtime,
        mission_engine=mission_engine,
        policy_gate=policy_gate,
        state_store=state_store,
        event_bus=bus,
    )

    result = orchestrator.submit_objective(make_objective("obj-1"))
    mission_engine.complete_mission(result.mission_id, result_summary="Done")
    status = orchestrator.get_mission_status_for_objective("obj-1")

    assert result.status == "allowed_with_warnings"
    assert result.warnings == ["High-priority objectives require review."]
    assert status == MissionStatus.COMPLETED
    assert list(state_store.get_objective_history()) == ["obj-1"]
    assert state_store.get_mission_history("obj-1") == [result.mission_id]
    assert [outcome.outcome for outcome in state_store.get_outcome_history("obj-1")] == ["Done"]


def test_convert_objective_into_mission_request_is_deterministic():
    orchestrator = ExecutiveMissionOrchestrator(
        executive_runtime=ExecutiveRuntime(),
        mission_engine=MissionEngine(),
    )

    mission_request = orchestrator.convert_objective_into_mission_request(
        make_objective("obj-1")
    )

    assert mission_request.id == "mr-obj-1"
    assert mission_request.title == "Resolve project blockers"
    assert mission_request.requested_by == "jarvis"
    assert mission_request.scope == ["company:mindx", "project:proj-jarvis"]
    assert mission_request.required_output == "Review active blockers and recommend next actions."


def test_get_mission_for_missing_objective_raises():
    orchestrator = ExecutiveMissionOrchestrator(
        executive_runtime=ExecutiveRuntime(),
        mission_engine=MissionEngine(),
    )

    with pytest.raises(KeyError):
        orchestrator.get_mission_for_objective("missing-objective")


def test_orchestrator_publishes_created_and_completed_events():
    bus = InMemoryEventBus()
    runtime = ExecutiveRuntime(event_bus=bus)
    mission_engine = MissionEngine(event_bus=bus)
    orchestrator = ExecutiveMissionOrchestrator(
        executive_runtime=runtime,
        mission_engine=mission_engine,
        event_bus=bus,
        source="custom.executive.orchestrator",
    )

    result = orchestrator.submit_objective(make_objective("obj-1"))
    mission_engine.complete_mission(result.mission_id, result_summary="Done")
    status = orchestrator.get_mission_status_for_objective("obj-1")

    assert status == MissionStatus.COMPLETED
    events = bus.list_events()
    event_names = [event.payload["event_name"] for event in events]
    assert "ExecutiveObjectiveAccepted" in event_names
    assert "ExecutiveMissionCreated" in event_names
    assert "ExecutiveMissionCompleted" in event_names
    orchestration_event_names = {
        "ExecutiveObjectiveAccepted",
        "ExecutiveMissionCreated",
        "ExecutiveMissionCompleted",
    }
    orchestration_events = [
        event for event in events if event.payload["event_name"] in orchestration_event_names
    ]
    assert all(event.source == "custom.executive.orchestrator" for event in orchestration_events)


def test_orchestrator_publishes_failed_event_when_mission_fails():
    bus = InMemoryEventBus()
    runtime = ExecutiveRuntime(event_bus=bus)
    mission_engine = MissionEngine(event_bus=bus)
    state_store = ExecutiveStateStore(event_bus=bus)
    orchestrator = ExecutiveMissionOrchestrator(
        executive_runtime=runtime,
        mission_engine=mission_engine,
        state_store=state_store,
        event_bus=bus,
    )

    result = orchestrator.submit_objective(make_objective("obj-1"))
    mission_engine.fail_mission(result.mission_id, reason="Missing approved context.")
    status = orchestrator.get_mission_status_for_objective("obj-1")

    assert status == MissionStatus.FAILED
    assert bus.list_events()[-1].payload["event_name"] == "ExecutiveMissionFailed"
    assert bus.list_events()[-1].payload["objective_id"] == "obj-1"
    assert [outcome.outcome for outcome in state_store.get_outcome_history("obj-1")] == [
        "Missing approved context."
    ]


def test_orchestrator_can_use_runtime_or_mission_engine_bus_implicitly():
    bus = InMemoryEventBus()
    orchestrator = ExecutiveMissionOrchestrator(
        executive_runtime=ExecutiveRuntime(event_bus=bus),
        mission_engine=MissionEngine(),
    )

    orchestrator.submit_objective(make_objective("obj-1"))

    event_names = [event.payload["event_name"] for event in bus.list_events()]
    assert "ExecutiveObjectiveAccepted" in event_names
    assert "ExecutiveMissionCreated" in event_names
