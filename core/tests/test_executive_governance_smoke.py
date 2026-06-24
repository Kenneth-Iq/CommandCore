from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.bootstrap import create_in_memory_kernel
from commandcore.contracts import MissionStatus
from commandcore.executive import Objective, PolicyDecision, PolicyRule


def make_objective(objective_id: str, *, title: str, priority: str = "normal") -> Objective:
    return Objective(
        id=objective_id,
        title=title,
        summary="Drive the next executive action.",
        requested_by="jarvis",
        scope=["company:mindx", "project:proj-commandcore"],
        priority=priority,
    )


def test_executive_governance_smoke():
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
    blocked = kernel.executive_orchestrator.submit_objective(
        make_objective("obj-blocked", title="Review restricted launch plan")
    )
    warned = kernel.executive_orchestrator.submit_objective(
        make_objective(
            "obj-warned",
            title="Prepare high-priority rollout review",
            priority="high",
        )
    )

    kernel.mission_engine.complete_mission(
        allowed.mission_id,
        result_summary="Allowed objective completed.",
    )
    kernel.mission_engine.complete_mission(
        warned.mission_id,
        result_summary="Warning objective completed.",
    )

    assert kernel.executive_orchestrator.get_mission_status_for_objective("obj-allowed") == (
        MissionStatus.COMPLETED
    )
    assert kernel.executive_orchestrator.get_mission_status_for_objective("obj-warned") == (
        MissionStatus.COMPLETED
    )

    assert allowed.status == "allowed"
    assert allowed.mission_id is not None
    assert blocked.status == "blocked"
    assert blocked.mission_id is None
    assert warned.status == "allowed_with_warnings"
    assert warned.warnings == ["High-priority objectives require review."]

    assert kernel.executive_state_store.get_objective_history()["obj-allowed"][0].title == (
        "Prepare weekly executive summary"
    )
    assert kernel.executive_state_store.get_objective_history()["obj-warned"][0].title == (
        "Prepare high-priority rollout review"
    )
    assert "obj-blocked" not in kernel.executive_state_store.get_objective_history()

    assert kernel.executive_state_store.get_mission_history("obj-allowed") == [allowed.mission_id]
    assert kernel.executive_state_store.get_mission_history("obj-warned") == [warned.mission_id]
    assert kernel.executive_state_store.get_mission_history("obj-blocked") == []

    assert [
        outcome.outcome
        for outcome in kernel.executive_state_store.get_outcome_history("obj-allowed")
    ] == ["Allowed objective completed."]
    assert [
        outcome.outcome
        for outcome in kernel.executive_state_store.get_outcome_history("obj-warned")
    ] == ["Warning objective completed."]
    assert kernel.executive_state_store.get_outcome_history("obj-blocked") == []

    event_names = [event.payload["event_name"] for event in kernel.event_bus.list_events()]
    assert "ExecutivePolicyGateChecked" in event_names
    assert "ExecutiveMissionCreated" in event_names
    assert "ExecutiveStateUpdated" in event_names
    assert "ExecutiveOutcomeRecorded" in event_names

    mission_created_objectives = {
        event.payload["objective_id"]
        for event in kernel.event_bus.list_events()
        if event.payload["event_name"] == "ExecutiveMissionCreated"
    }
    assert mission_created_objectives == {"obj-allowed", "obj-warned"}
