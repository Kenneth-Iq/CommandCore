from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.bootstrap import create_in_memory_kernel
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
from commandcore.dashboard import AgentDashboardService


def make_ownership() -> Ownership:
    return Ownership(
        kind=OwnershipKind.DOMAIN,
        reference="commandcore.architecture",
        display_name="CommandCore Architecture",
    )


def make_agent(agent_id: str, *, runtime_status: AgentRuntimeStatus) -> Agent:
    return Agent(
        id=agent_id,
        name=agent_id,
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
        title=mission_id,
        status=MissionStatus.REQUESTED,
        ownership=make_ownership(),
        requested_by="jarvis",
        scope=["project:proj-jarvis"],
        capability_ids=["cap-search"],
        approval_required=True,
        required_output="summary",
    )


def test_agent_dashboard_service_reports_counts_and_recent_activity():
    kernel = create_in_memory_kernel()
    kernel.agent_registry.register_agent(make_agent("agent-hermes", runtime_status=AgentRuntimeStatus.AVAILABLE))
    kernel.agent_registry.register_agent(make_agent("agent-athena", runtime_status=AgentRuntimeStatus.OFFLINE))
    kernel.mission_engine.create_mission(make_mission("mission-1"))
    kernel.mission_engine.create_mission(make_mission("mission-2"))
    kernel.mission_engine.create_mission(make_mission("mission-3"))
    running_assignment = kernel.agent_mission_assignment_service.assign_agent_to_mission(
        "agent-hermes",
        "mission-1",
    )
    running_execution = kernel.agent_mission_assignment_service.start_mission_task_execution(running_assignment.id)
    completed_assignment = kernel.agent_mission_assignment_service.assign_agent_to_mission(
        "agent-hermes",
        "mission-2",
    )
    completed_execution = kernel.agent_mission_assignment_service.start_mission_task_execution(completed_assignment.id)
    kernel.agent_mission_assignment_service.complete_mission_task_execution(completed_execution.id, output_payload={"summary": "done"})
    failed_assignment = kernel.agent_mission_assignment_service.assign_agent_to_mission(
        "agent-hermes",
        "mission-3",
    )
    failed_execution = kernel.agent_mission_assignment_service.start_mission_task_execution(failed_assignment.id)
    kernel.agent_mission_assignment_service.fail_mission_task_execution(failed_execution.id, error="blocked")

    dashboard = AgentDashboardService(
        agent_registry=kernel.agent_registry,
        agent_runtime=kernel.agent_runtime,
        audit_trail=kernel.audit_trail,
    )

    assert dashboard.agent_counts() == {
        "total": 2,
        "available": 1,
        "busy": 0,
        "offline": 1,
    }
    assert dashboard.assignment_counts() == {
        "total": 3,
        "assigned": 0,
        "running": 1,
        "completed": 1,
        "failed": 1,
    }
    assert dashboard.mission_assignment_counts() == {
        "total": 3,
        "distinct_missions": 3,
    }
    assert dashboard.execution_counts() == {
        "total": 3,
        "running": 1,
        "completed": 1,
        "failed": 1,
    }
    assert dashboard.executions_by_mission() == {
        "mission-1": {"total": 1, "running": 1, "completed": 0, "failed": 0},
        "mission-2": {"total": 1, "running": 0, "completed": 1, "failed": 0},
        "mission-3": {"total": 1, "running": 0, "completed": 0, "failed": 1},
    }
    assert [item["execution_id"] for item in dashboard.active_executions()] == [running_execution.id]
    assert [item["execution_id"] for item in dashboard.completed_executions()] == [completed_execution.id]
    assert [item["execution_id"] for item in dashboard.failed_executions()] == [failed_execution.id]
    assert any(event["event_name"] == "AgentMissionExecutionCompleted" for event in dashboard.recent_agent_activity())
    built = dashboard.build_dashboard()
    assert built["execution_counts"]["failed"] == 1
