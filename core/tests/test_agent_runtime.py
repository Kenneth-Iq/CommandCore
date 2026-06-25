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


def make_agent(agent_id: str, *, runtime_status: AgentRuntimeStatus = AgentRuntimeStatus.AVAILABLE) -> Agent:
    return Agent(
        id=agent_id,
        name="Hermes Worker",
        role="engineering",
        status=Status.ACTIVE,
        ownership=make_ownership(),
        runtime_status=runtime_status,
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


def test_assign_start_complete_and_list_runtime_records():
    registry = AgentRegistry()
    registry.register_agent(make_agent("agent-hermes"))
    runtime = InMemoryAgentRuntime(agent_registry=registry)

    assignment = runtime.assign_agent(
        assignment_id="assign-1",
        agent_id="agent-hermes",
        mission_id="mission-1",
        task_id="task-1",
        capability_id="cap-search",
        input_payload={"objective": "review"},
    )
    execution = runtime.start_execution(
        assignment.id,
        execution_id="exec-1",
    )
    result = runtime.complete_execution(
        execution.id,
        output_payload={"summary": "completed"},
    )

    assert runtime.get_assignment("assign-1").status == "completed"
    assert runtime.list_assignments() == [runtime.get_assignment("assign-1")]
    assert runtime.get_execution("exec-1").status == "completed"
    assert runtime.list_executions() == [runtime.get_execution("exec-1")]
    assert runtime.list_executions_for_agent("agent-hermes") == [runtime.get_execution("exec-1")]
    assert runtime.list_executions_for_mission("mission-1") == [runtime.get_execution("exec-1")]
    assert result.execution_id == "exec-1"
    assert result.status == "completed"
    assert result.output_payload == {"summary": "completed"}


def test_fail_execution_marks_assignment_and_execution_failed():
    registry = AgentRegistry()
    registry.register_agent(make_agent("agent-hermes"))
    runtime = InMemoryAgentRuntime(agent_registry=registry)
    assignment = runtime.assign_agent(assignment_id="assign-1", agent_id="agent-hermes")
    execution = runtime.start_execution(assignment.id, execution_id="exec-1")

    result = runtime.fail_execution(execution.id, error="Runtime unavailable")

    assert runtime.get_assignment("assign-1").status == "failed"
    assert runtime.get_execution("exec-1").status == "failed"
    assert runtime.get_execution("exec-1").error == "Runtime unavailable"
    assert result.status == "failed"
    assert result.error == "Runtime unavailable"


def test_assign_agent_validates_known_agent_when_registry_is_provided():
    runtime = InMemoryAgentRuntime(agent_registry=AgentRegistry())

    with pytest.raises(KeyError):
        runtime.assign_agent(assignment_id="assign-1", agent_id="missing-agent")


def test_events_are_published_only_when_event_bus_is_provided():
    registry = AgentRegistry()
    registry.register_agent(make_agent("agent-hermes"))
    bus = InMemoryEventBus()
    runtime = InMemoryAgentRuntime(event_bus=bus, agent_registry=registry)

    assignment = runtime.assign_agent(assignment_id="assign-1", agent_id="agent-hermes")
    execution = runtime.start_execution(assignment.id, execution_id="exec-1")
    runtime.complete_execution(execution.id, output_payload={"summary": "done"})
    second_assignment = runtime.assign_agent(assignment_id="assign-2", agent_id="agent-hermes")
    second_execution = runtime.start_execution(second_assignment.id, execution_id="exec-2")
    runtime.fail_execution(second_execution.id, error="failure")

    assert [event.payload["event_name"] for event in bus.list_events()] == [
        "AgentAssigned",
        "AgentExecutionStarted",
        "AgentExecutionCompleted",
        "AgentAssigned",
        "AgentExecutionStarted",
        "AgentExecutionFailed",
    ]


def test_no_events_are_published_without_event_bus():
    runtime = InMemoryAgentRuntime()
    assignment = runtime.assign_agent(assignment_id="assign-1", agent_id="agent-hermes")
    execution = runtime.start_execution(assignment.id, execution_id="exec-1")

    runtime.complete_execution(execution.id)

    assert runtime.get_execution("exec-1").status == "completed"


def test_runtime_works_with_mission_assignment_service_for_mission_execution_flow():
    registry = AgentRegistry()
    registry.register_agent(make_agent("agent-hermes"))
    mission_engine = MissionEngine()
    mission_engine.create_mission(make_mission("mission-1"))
    runtime = InMemoryAgentRuntime(agent_registry=registry)
    service = AgentMissionAssignmentService(
        agent_runtime=runtime,
        agent_registry=registry,
        mission_engine=mission_engine,
    )

    assignment = service.assign_agent_to_mission("agent-hermes", "mission-1")
    execution = service.start_mission_task_execution(assignment.id)
    service.complete_mission_task_execution(execution.id, output_payload={"summary": "done"})

    assert runtime.list_executions_for_mission("mission-1")[0].status == "completed"
