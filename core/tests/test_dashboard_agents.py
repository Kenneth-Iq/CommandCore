from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.bootstrap import create_in_memory_kernel
from commandcore.contracts import (
    Agent,
    AgentRuntimeStatus,
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


def test_agent_dashboard_service_reports_counts_and_recent_activity():
    kernel = create_in_memory_kernel()
    kernel.agent_registry.register_agent(make_agent("agent-hermes", runtime_status=AgentRuntimeStatus.AVAILABLE))
    kernel.agent_registry.register_agent(make_agent("agent-athena", runtime_status=AgentRuntimeStatus.OFFLINE))
    running_assignment = kernel.agent_runtime.assign_agent(
        assignment_id="assign-1",
        agent_id="agent-hermes",
        mission_id="mission-1",
    )
    running_execution = kernel.agent_runtime.start_execution(running_assignment.id, execution_id="exec-1")
    completed_assignment = kernel.agent_runtime.assign_agent(
        assignment_id="assign-2",
        agent_id="agent-hermes",
        mission_id="mission-2",
    )
    completed_execution = kernel.agent_runtime.start_execution(completed_assignment.id, execution_id="exec-2")
    kernel.agent_runtime.complete_execution(completed_execution.id, output_payload={"summary": "done"})
    failed_assignment = kernel.agent_runtime.assign_agent(
        assignment_id="assign-3",
        agent_id="agent-hermes",
        mission_id="mission-3",
    )
    failed_execution = kernel.agent_runtime.start_execution(failed_assignment.id, execution_id="exec-3")
    kernel.agent_runtime.fail_execution(failed_execution.id, error="blocked")

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
    assert dashboard.execution_counts() == {
        "total": 3,
        "running": 1,
        "completed": 1,
        "failed": 1,
    }
    assert [item["execution_id"] for item in dashboard.active_executions()] == [running_execution.id]
    assert [item["execution_id"] for item in dashboard.completed_executions()] == [completed_execution.id]
    assert [item["execution_id"] for item in dashboard.failed_executions()] == [failed_execution.id]
    assert any(event["event_name"] == "AgentExecutionCompleted" for event in dashboard.recent_agent_activity())
    built = dashboard.build_dashboard()
    assert built["execution_counts"]["failed"] == 1
