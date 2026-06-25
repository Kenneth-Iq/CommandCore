from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.bootstrap import create_in_memory_kernel
from commandcore.contracts import (
    Agent,
    AgentRuntimeStatus,
    KnowledgeAsset,
    LifecycleState,
    MissionStatus,
    Ownership,
    OwnershipKind,
    PermissionLevel,
    Status,
    Workspace,
)
from commandcore.dashboard import KernelOverviewDashboardService
from commandcore.executive import Objective, PolicyDecision, PolicyRule
from commandcore.tools import ToolPermission


def make_ownership() -> Ownership:
    return Ownership(
        kind=OwnershipKind.DOMAIN,
        reference="commandcore.architecture",
        display_name="CommandCore Architecture",
    )


def make_objective(objective_id: str, *, title: str, priority: str = "normal") -> Objective:
    return Objective(
        id=objective_id,
        title=title,
        summary="Drive the next executive action.",
        requested_by="jarvis",
        scope=["company:mindx", "project:proj-commandcore"],
        priority=priority,
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


def test_kernel_overview_dashboard_service_aggregates_all_sections():
    kernel = create_in_memory_kernel()
    kernel.workspace_registry.register_workspace(
        Workspace(
            id="ws-local",
            name="Local Workspace",
            status=Status.ACTIVE,
            ownership=make_ownership(),
        )
    )
    kernel.knowledge_engine.add_asset(
        KnowledgeAsset(
            id="know-local",
            title="Local Runbook",
            asset_type="runbook",
            ownership=make_ownership(),
            lifecycle_state=LifecycleState.ACTIVE,
            workspace_id="ws-local",
            safe_to_query=True,
        )
    )
    kernel.agent_registry.register_agent(make_agent("agent-hermes"))
    assignment = kernel.agent_runtime.assign_agent(
        assignment_id="assign-1",
        agent_id="agent-hermes",
        mission_id="mission-1",
    )
    kernel.agent_runtime.start_execution(assignment.id, execution_id="exec-1")
    tool = kernel.tool_registry.register_tool(
        tool_id="tool-search",
        name="Knowledge Search",
        description="Search knowledge assets.",
        permission_level=ToolPermission.SAFE,
        agent_id="agent-hermes",
    )
    tool_invocation = kernel.tool_runtime.create_invocation(
        tool.id,
        invocation_id="invoke-1",
        input_payload={"query": "overview"},
    )
    kernel.tool_runtime.start_invocation(tool_invocation.id)
    conversation = kernel.conversation_engine.create_conversation(
        conversation_id="conv-1",
        workspace_id="ws-local",
        participant_ids=["jarvis"],
    )
    thread = kernel.conversation_engine.create_thread(conversation.id, thread_id="thread-1")
    kernel.conversation_engine.add_message(
        conversation.id,
        thread.id,
        message_id="msg-1",
        participant_id="jarvis",
        role="assistant",
        content="Prepare the overview dashboard summary.",
    )
    kernel.executive_policy_engine.add_rule(
        PolicyRule(
            id="warn-high-priority",
            target_type="objective",
            field_name="priority",
            expected_value="high",
            decision=PolicyDecision.WARN,
            message="High-priority objectives require review.",
        )
    )
    result = kernel.executive_orchestrator.submit_objective(
        make_objective("obj-1", title="Prepare rollout review", priority="high")
    )
    kernel.mission_engine.complete_mission(result.mission_id, result_summary="Rollout review completed.")
    assert kernel.executive_orchestrator.get_mission_status_for_objective("obj-1") == MissionStatus.COMPLETED

    overview = KernelOverviewDashboardService(kernel).build_overview()

    assert overview["executive_dashboard"]["objective_counts"] == {
        "total": 1,
        "with_missions": 1,
        "with_outcomes": 1,
    }
    assert overview["mission_dashboard"]["mission_counts"]["completed"] == 1
    assert overview["workspace_dashboard"]["workspace_counts"]["total"] == 1
    assert overview["conversation_dashboard"]["conversation_counts"] == {"total": 1}
    assert overview["agent_dashboard"]["agent_counts"]["total"] == 1
    assert overview["agent_dashboard"]["assignment_counts"]["running"] == 1
    assert overview["agent_dashboard"]["execution_counts"]["running"] == 1
    assert overview["tool_dashboard"]["tool_counts"] == {"total": 1, "registered": 1}
    assert overview["tool_dashboard"]["invocation_counts"]["running"] == 1
    assert overview["knowledge_counts"] == {"asset_count": 1, "relationship_count": 0}
    assert overview["health_snapshot"]["executive_report_available"] is True
    assert overview["audit_summary"]["entry_count"] == len(kernel.audit_trail.list_entries())
    assert any(
        entry["event_name"] == "ExecutiveMissionCompleted"
        for entry in overview["audit_summary"]["recent_entries"]
    )
