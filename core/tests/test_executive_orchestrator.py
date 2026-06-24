from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.contracts import MissionStatus
from commandcore.events import InMemoryEventBus
from commandcore.executive import ExecutiveMissionOrchestrator, ExecutiveRuntime, Objective
from commandcore.mission import MissionEngine


def make_objective(objective_id: str) -> Objective:
    return Objective(
        id=objective_id,
        title="Resolve project blockers",
        summary="Review active blockers and recommend next actions.",
        requested_by="jarvis",
        scope=["company:mindx", "project:proj-jarvis"],
        priority="high",
    )


def test_submit_objective_creates_mission_request_and_mission():
    bus = InMemoryEventBus()
    runtime = ExecutiveRuntime(event_bus=bus)
    mission_engine = MissionEngine(event_bus=bus)
    orchestrator = ExecutiveMissionOrchestrator(
        executive_runtime=runtime,
        mission_engine=mission_engine,
        event_bus=bus,
    )

    mission = orchestrator.submit_objective(make_objective("obj-1"))

    assert runtime.get_objective("obj-1").title == "Resolve project blockers"
    assert mission.id == "mission-mr-obj-1"
    assert mission_engine.get_mission(mission.id) == mission
    assert orchestrator.get_mission_for_objective("obj-1") == mission
    assert orchestrator.get_mission_status_for_objective("obj-1") == MissionStatus.REQUESTED


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

    mission = orchestrator.submit_objective(make_objective("obj-1"))
    mission_engine.complete_mission(mission.id, result_summary="Done")
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
    orchestrator = ExecutiveMissionOrchestrator(
        executive_runtime=runtime,
        mission_engine=mission_engine,
        event_bus=bus,
    )

    mission = orchestrator.submit_objective(make_objective("obj-1"))
    mission_engine.fail_mission(mission.id, reason="Missing approved context.")
    status = orchestrator.get_mission_status_for_objective("obj-1")

    assert status == MissionStatus.FAILED
    assert bus.list_events()[-1].payload["event_name"] == "ExecutiveMissionFailed"
    assert bus.list_events()[-1].payload["objective_id"] == "obj-1"


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
