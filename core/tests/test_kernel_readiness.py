from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.bootstrap import create_in_memory_kernel
from commandcore.contracts import KnowledgeAsset, LifecycleState, MissionStatus, Ownership, OwnershipKind, Status, Workspace
from commandcore.executive import Objective, PolicyDecision, PolicyRule
from commandcore.health import build_kernel_readiness_report


def make_ownership() -> Ownership:
    return Ownership(
        kind=OwnershipKind.DOMAIN,
        reference="commandcore.architecture",
        display_name="CommandCore Architecture",
    )


def test_build_kernel_readiness_report_returns_warning_for_empty_kernel():
    kernel = create_in_memory_kernel()

    report = build_kernel_readiness_report(kernel)

    assert report["status"] == "warning"
    assert report["checks"]["event_bus"] is True
    assert report["checks"]["dashboards"] is True
    assert report["blocking_issues"] == []
    assert "No workspaces are registered in the kernel." in report["warnings"]
    assert report["summary_counts"]["workspace_count"] == 0


def test_build_kernel_readiness_report_returns_ready_for_populated_kernel():
    kernel = create_in_memory_kernel()
    kernel.workspace_registry.register_workspace(
        Workspace(
            id="ws-local",
            name="CommandCore Local Workspace",
            status=Status.ACTIVE,
            ownership=make_ownership(),
        )
    )
    kernel.knowledge_engine.add_asset(
        KnowledgeAsset(
            id="know-runbook",
            title="Alpha-3 Launch Runbook",
            asset_type="runbook",
            ownership=make_ownership(),
            lifecycle_state=LifecycleState.ACTIVE,
            workspace_id="ws-local",
            safe_to_query=True,
        )
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
        Objective(
            id="obj-1",
            title="Prepare Alpha-3 release review",
            summary="Review readiness and produce release summary.",
            requested_by="jarvis",
            scope=["project:proj-commandcore"],
            priority="high",
        )
    )
    kernel.mission_engine.complete_mission(result.mission_id, result_summary="Release review completed.")
    assert kernel.executive_orchestrator.get_mission_status_for_objective("obj-1") == MissionStatus.COMPLETED

    report = build_kernel_readiness_report(kernel)

    assert report["status"] == "ready"
    assert report["warnings"] == []
    assert report["blocking_issues"] == []
    assert report["summary_counts"]["workspace_count"] == 1
    assert report["summary_counts"]["mission_count"] == 1
    assert report["summary_counts"]["executive_objective_count"] == 1
    assert report["dashboard_availability"]["executive_reporting"] is True
    assert report["kernel_overview_available"] is True


def test_build_kernel_readiness_report_returns_blocked_when_required_component_missing():
    kernel = create_in_memory_kernel()
    object.__setattr__(kernel, "executive_policy_gate", None)

    report = build_kernel_readiness_report(kernel)

    assert report["status"] == "blocked"
    assert report["checks"]["policy_gate"] is False
    assert "Missing required kernel component: policy_gate." in report["blocking_issues"]
