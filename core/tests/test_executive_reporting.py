from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.contracts import Mission, MissionStatus, Ownership, OwnershipKind
from commandcore.executive import (
    Decision,
    Directive,
    ExecutivePolicyEngine,
    ExecutiveRuntime,
    ExecutiveStateStore,
    Objective,
    PolicyDecision,
    PolicyRule,
    build_executive_summary,
    build_mission_report,
    build_objective_report,
    build_policy_report,
)
from commandcore.mission import MissionEngine


def make_ownership() -> Ownership:
    return Ownership(
        kind=OwnershipKind.DOMAIN,
        reference="commandcore.architecture",
        display_name="CommandCore Architecture",
    )


def make_objective(objective_id: str) -> Objective:
    return Objective(
        id=objective_id,
        title="Resolve project blockers",
        summary="Review active blockers and recommend next actions.",
        requested_by="jarvis",
        scope=["company:mindx", "project:proj-jarvis"],
        priority="high",
    )


def make_mission(mission_id: str) -> Mission:
    return Mission(
        id=mission_id,
        title="Prepare executive mission",
        status=MissionStatus.REQUESTED,
        ownership=make_ownership(),
        requested_by="jarvis",
        scope=["project:proj-jarvis"],
        capability_ids=["cap-search"],
        approval_required=True,
        required_output="Executive-ready summary",
    )


def test_build_objective_report_includes_runtime_and_state_counts():
    runtime = ExecutiveRuntime()
    state_store = ExecutiveStateStore()
    objective = make_objective("obj-1")
    runtime.submit_objective(objective)
    runtime.create_directive(
        objective.id,
        Directive(
            id="dir-1",
            summary="Prepare an executive-ready blocker summary.",
            issued_by="athena",
            directive_type="operations",
        ),
    )
    runtime.create_decision(
        objective.id,
        Decision(
            id="dec-1",
            summary="Prioritize remediation first.",
            decided_by="jarvis",
            decision_type="priority",
            rationale="Operational guidance is blocking execution.",
        ),
    )
    state_store.record_objective(objective)
    state_store.record_mission(objective.id, "mission-1")
    state_store.record_outcome(objective.id, "Mission completed.")

    report = build_objective_report(runtime, state_store=state_store)

    assert report["objective_count"] == 1
    assert report["objectives"] == [
        {
            "objective_id": "obj-1",
            "title": "Resolve project blockers",
            "requested_by": "jarvis",
            "priority": "high",
            "scope": ["company:mindx", "project:proj-jarvis"],
            "directive_count": 1,
            "decision_count": 1,
            "objective_revision_count": 1,
            "mission_count": 1,
            "outcome_count": 1,
        }
    ]


def test_build_mission_report_includes_task_and_outcome_fields():
    mission_engine = MissionEngine()
    mission = mission_engine.create_mission(make_mission("mission-1"))
    mission_engine.complete_mission(mission.id, result_summary="Capability review completed.")

    report = build_mission_report(mission_engine)

    assert report["mission_count"] == 1
    assert report["missions"] == [
        {
            "mission_id": "mission-1",
            "title": "Prepare executive mission",
            "status": MissionStatus.COMPLETED,
            "requested_by": "jarvis",
            "assigned_agent_id": None,
            "scope": ["project:proj-jarvis"],
            "capability_ids": ["cap-search"],
            "task_count": 0,
            "result_summary": "Capability review completed.",
            "failure_reason": None,
        }
    ]


def test_build_policy_report_summarizes_rules_by_decision():
    policy_engine = ExecutivePolicyEngine()
    policy_engine.add_rule(
        PolicyRule(
            id="warn-priority",
            target_type="objective",
            field_name="priority",
            expected_value="high",
            decision=PolicyDecision.WARN,
            message="High-priority objectives require review.",
        )
    )
    policy_engine.add_rule(
        PolicyRule(
            id="block-secret",
            target_type="objective",
            field_name="title",
            operator="contains",
            expected_value="secret",
            decision=PolicyDecision.BLOCK,
            message="Secret work requires manual handling.",
        )
    )

    report = build_policy_report(policy_engine)

    assert report["policy_rule_count"] == 2
    assert report["rules_by_decision"] == {"allow": 0, "warn": 1, "block": 1}
    assert [rule["rule_id"] for rule in report["rules"]] == ["warn-priority", "block-secret"]


def test_build_executive_summary_combines_reports():
    runtime = ExecutiveRuntime()
    mission_engine = MissionEngine()
    policy_engine = ExecutivePolicyEngine()
    state_store = ExecutiveStateStore()
    objective = make_objective("obj-1")

    runtime.submit_objective(objective)
    state_store.record_objective(objective)
    state_store.record_mission(objective.id, "mission-1")
    state_store.record_outcome(objective.id, "Mission completed.")
    mission = mission_engine.create_mission(make_mission("mission-1"))
    mission_engine.complete_mission(mission.id, result_summary="Capability review completed.")
    policy_engine.add_rule(
        PolicyRule(
            id="warn-priority",
            target_type="objective",
            field_name="priority",
            expected_value="high",
            decision=PolicyDecision.WARN,
            message="High-priority objectives require review.",
        )
    )

    summary = build_executive_summary(
        runtime,
        mission_engine,
        policy_engine,
        state_store=state_store,
    )

    assert summary["objective_count"] == 1
    assert summary["mission_count"] == 1
    assert summary["policy_rule_count"] == 1
    assert summary["completed_mission_count"] == 1
    assert summary["failed_mission_count"] == 0
    assert summary["objective_report"]["objective_count"] == 1
    assert summary["mission_report"]["mission_count"] == 1
    assert summary["policy_report"]["policy_rule_count"] == 1
