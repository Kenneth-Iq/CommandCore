from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.bootstrap import create_in_memory_kernel
from commandcore.contracts import KnowledgeAsset, LifecycleState, MissionStatus, Ownership, OwnershipKind, Status, Workspace
from commandcore.dashboard import KernelOverviewDashboardService
from commandcore.executive import Objective, PolicyDecision, PolicyRule


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
    assert overview["conversation_dashboard"]["thread_counts"] == {"total": 1}
    assert overview["conversation_dashboard"]["message_counts"] == {"total": 1}
    assert overview["knowledge_counts"] == {"asset_count": 1, "relationship_count": 0}
    assert overview["health_snapshot"]["executive_report_available"] is True
    assert overview["audit_summary"]["entry_count"] == len(kernel.audit_trail.list_entries())
    assert any(
        entry["event_name"] == "ExecutiveMissionCompleted"
        for entry in overview["audit_summary"]["recent_entries"]
    )
