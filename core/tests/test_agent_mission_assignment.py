from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.agents import AgentMissionAssignmentService, InMemoryAgentRuntime
from commandcore.contracts import (
    Agent,
    AgentRuntimeStatus,
    Mission,
    MissionStatus,
    Ownership,
    OwnershipKind,
    PermissionLevel,
    Status,
)
from commandcore.events import InMemoryEventBus
from commandcore.mission import MissionEngine
from commandcore.registries import AgentRegistry


def make_ownership() -> Ownership:
    return Ownership(
        kind=OwnershipKind.DOMAIN,
        reference="commandcore.architecture",
        display_name="CommandCore Architecture",
    )


def make_agent(agent_id: str) -> Agent:
    return Agent(
        id=agent_id,
        name="Hermes Worker",
        role="engineering",
        status=Status.ACTIVE,
        ownership=make_ownership(),
        runtime_status=AgentRuntimeStatus.AVAILABLE,
        permission_level=PermissionLevel.OPERATE,
        capability_ids=["cap-search"],
    )


def make_mission(mission_id: str) -> Mission:
    return Mission(
        id=mission_id,
        title="Mission",
        status=MissionStatus.REQUESTED,
        ownership=make_ownership(),
        requested_by="jarvis",
        scope=["project:proj-jarvis"],
        capability_ids=["cap-search"],
        approval_required=True,
        required_output="summary",
    )


def test_assign_and_list_mission_assignments_and_execution_flow():
    registry = AgentRegistry()
    registry.register_agent(make_agent("agent-hermes"))
    mission_engine = MissionEngine()
    mission = mission_engine.create_mission(make_mission("mission-1"))
    bus = InMemoryEventBus()
    runtime = InMemoryAgentRuntime(event_bus=bus, agent_registry=registry)
    service = AgentMissionAssignmentService(
        agent_runtime=runtime,
        agent_registry=registry,
        mission_engine=mission_engine,
        event_bus=bus,
    )

    assignment = service.assign_agent_to_mission(
        "agent-hermes",
        mission.id,
        task_id="task-1",
        capability_id="cap-search",
    )
    execution = service.start_mission_task_execution(
        assignment.id,
        input_payload={"objective": "review"},
    )
    result = service.complete_mission_task_execution(
        execution.id,
        output_payload={"summary": "done"},
    )

    assert service.list_mission_assignments("mission-1") == [runtime.get_assignment(assignment.id)]
    assert service.list_agent_mission_assignments("agent-hermes") == [runtime.get_assignment(assignment.id)]
    assert result.status == "completed"
    assert [event.payload["event_name"] for event in bus.list_events()] == [
        "AgentAssigned",
        "AgentMissionAssigned",
        "AgentExecutionStarted",
        "AgentMissionExecutionStarted",
        "AgentExecutionCompleted",
        "AgentMissionExecutionCompleted",
    ]


def test_assignment_service_validates_known_agent_and_mission_when_provided():
    service = AgentMissionAssignmentService(
        agent_runtime=InMemoryAgentRuntime(),
        agent_registry=AgentRegistry(),
        mission_engine=MissionEngine(),
    )

    with pytest.raises(KeyError):
        service.assign_agent_to_mission("missing-agent", "missing-mission")


def test_fail_mission_task_execution_publishes_failure_event():
    registry = AgentRegistry()
    registry.register_agent(make_agent("agent-hermes"))
    mission_engine = MissionEngine()
    mission_engine.create_mission(make_mission("mission-1"))
    bus = InMemoryEventBus()
    runtime = InMemoryAgentRuntime(event_bus=bus, agent_registry=registry)
    service = AgentMissionAssignmentService(
        agent_runtime=runtime,
        agent_registry=registry,
        mission_engine=mission_engine,
        event_bus=bus,
    )

    assignment = service.assign_agent_to_mission("agent-hermes", "mission-1")
    execution = service.start_mission_task_execution(assignment.id)
    result = service.fail_mission_task_execution(execution.id, "blocked")

    assert result.status == "failed"
    assert result.error == "blocked"
    assert [event.payload["event_name"] for event in bus.list_events()][-2:] == [
        "AgentExecutionFailed",
        "AgentMissionExecutionFailed",
    ]
