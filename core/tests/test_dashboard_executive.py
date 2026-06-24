from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.bootstrap import create_in_memory_kernel
from commandcore.contracts import MissionStatus
from commandcore.dashboard import ExecutiveDashboardService
from commandcore.executive import Decision, Directive, Objective, PolicyDecision, PolicyRule


def make_objective(objective_id: str, *, title: str, priority: str = "normal") -> Objective:
    return Objective(
        id=objective_id,
        title=title,
        summary="Drive the next executive action.",
        requested_by="jarvis",
        scope=["company:mindx", "project:proj-commandcore"],
        priority=priority,
    )


def test_executive_dashboard_service_reports_objectives_policy_and_outcomes():
    kernel = create_in_memory_kernel()
    kernel.executive_policy_engine.add_rule(
        PolicyRule(
            id="block-restricted",
            target_type="objective",
            field_name="title",
            operator="contains",
            expected_value="restricted",
            decision=PolicyDecision.BLOCK,
            message="Restricted objectives require manual handling.",
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

    allowed = kernel.executive_orchestrator.submit_objective(
        make_objective("obj-allowed", title="Prepare weekly executive summary")
    )
    kernel.executive_state_store.record_directive(
        "obj-allowed",
        Directive(
            id="dir-1",
            summary="Prepare the board-ready briefing.",
            issued_by="athena",
            directive_type="operations",
        ),
    )
    kernel.executive_state_store.record_decision(
        "obj-allowed",
        Decision(
            id="dec-1",
            summary="Prioritize blocker remediation first.",
            decided_by="jarvis",
            decision_type="priority",
            rationale="Blockers are gating delivery.",
        ),
    )
    blocked = kernel.executive_orchestrator.submit_objective(
        make_objective("obj-blocked", title="Review restricted launch plan")
    )
    warned = kernel.executive_orchestrator.submit_objective(
        make_objective(
            "obj-warned",
            title="Prepare rollout review",
            priority="high",
        )
    )

    kernel.mission_engine.complete_mission(allowed.mission_id, result_summary="Allowed objective completed.")
    kernel.mission_engine.complete_mission(warned.mission_id, result_summary="Warning objective completed.")
    assert kernel.executive_orchestrator.get_mission_status_for_objective("obj-allowed") == MissionStatus.COMPLETED
    assert kernel.executive_orchestrator.get_mission_status_for_objective("obj-warned") == MissionStatus.COMPLETED

    dashboard = ExecutiveDashboardService(
        executive_reporting=kernel.executive_reporting,
        state_store=kernel.executive_state_store,
        audit_trail=kernel.audit_trail,
    )

    objective_counts = dashboard.objective_counts()
    decisions = dashboard.decisions()
    directives = dashboard.directives()
    policy_blocks = dashboard.policy_blocks()
    policy_warnings = dashboard.policy_warnings()
    outcomes = dashboard.executive_outcomes()

    assert allowed.status == "allowed"
    assert blocked.status == "blocked"
    assert warned.status == "allowed_with_warnings"
    assert objective_counts == {"total": 2, "with_missions": 2, "with_outcomes": 2}
    assert decisions["count"] == 1
    assert directives["count"] == 1
    assert len(policy_blocks) == 1
    assert policy_blocks[0]["payload"]["target_id"] == "obj-blocked"
    assert len(policy_warnings) == 1
    assert policy_warnings[0]["payload"]["target_id"] == "obj-warned"
    assert outcomes["count"] == 2
    assert [record.outcome for record in outcomes["by_objective"]["obj-allowed"]] == [
        "Allowed objective completed."
    ]

    built = dashboard.build_dashboard()
    assert built["objective_counts"] == objective_counts
    assert built["executive_outcomes"]["count"] == 2
