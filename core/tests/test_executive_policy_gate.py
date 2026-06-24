from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.events import InMemoryEventBus
from commandcore.executive import (
    ApprovalRequest,
    Directive,
    ExecutivePolicyEngine,
    ExecutivePolicyGate,
    MissionRequest,
    Objective,
    PolicyDecision,
    PolicyRule,
)


def make_objective(objective_id: str, priority: str | None = "normal") -> Objective:
    return Objective(
        id=objective_id,
        title="Resolve project blockers",
        summary="Review active blockers and recommend next actions.",
        requested_by="jarvis",
        scope=["company:mindx", "project:proj-jarvis"],
        priority=priority,
    )


def make_directive(directive_id: str, directive_type: str = "operations") -> Directive:
    return Directive(
        id=directive_id,
        summary="Prepare an executive-ready blocker summary.",
        issued_by="athena",
        directive_type=directive_type,
    )


def make_mission_request(request_id: str) -> MissionRequest:
    return MissionRequest(
        id=request_id,
        title="Summarize blocker context",
        requested_by="jarvis",
        scope=["project:proj-jarvis", "knowledge:blockers"],
        capability_ids=["cap-search"],
        required_output="Cited blocker summary",
        approval_required=True,
    )


def make_approval_request(request_id: str) -> ApprovalRequest:
    return ApprovalRequest(
        id=request_id,
        summary="Approve cross-project blocker review mission.",
        requested_by="jarvis",
        reviewer_reference="user:kenneth",
        approval_type="mission",
    )


def test_check_objective_returns_allowed_when_policy_allows():
    gate = ExecutivePolicyGate(policy_engine=ExecutivePolicyEngine())

    result = gate.check_objective(make_objective("obj-1"))

    assert result.status == "allowed"
    assert result.evaluation.decision == PolicyDecision.ALLOW


def test_check_directive_returns_allowed_with_warnings_when_policy_warns():
    engine = ExecutivePolicyEngine()
    engine.add_rule(
        PolicyRule(
            id="rule-directive",
            target_type="directive",
            field_name="directive_type",
            expected_value="operations",
            decision=PolicyDecision.WARN,
            message="Operations directives should be reviewed.",
        )
    )
    gate = ExecutivePolicyGate(policy_engine=engine)

    result = gate.check_directive(make_directive("dir-1"))

    assert result.status == "allowed_with_warnings"
    assert result.evaluation.decision == PolicyDecision.WARN
    assert result.evaluation.matched_rule_ids == ["rule-directive"]


def test_check_mission_request_returns_blocked_when_policy_blocks():
    engine = ExecutivePolicyEngine()
    engine.add_rule(
        PolicyRule(
            id="rule-scope",
            target_type="mission_request",
            field_name="scope",
            operator="contains",
            expected_value="knowledge:blockers",
            decision=PolicyDecision.BLOCK,
            message="Blocker knowledge missions require manual approval.",
        )
    )
    gate = ExecutivePolicyGate(policy_engine=engine)

    result = gate.check_mission_request(make_mission_request("mr-1"))

    assert result.status == "blocked"
    assert result.evaluation.decision == PolicyDecision.BLOCK


def test_check_approval_request_publishes_gate_event_when_bus_is_provided():
    bus = InMemoryEventBus()
    engine = ExecutivePolicyEngine(event_bus=bus)
    engine.add_rule(
        PolicyRule(
            id="rule-all",
            target_type="all",
            field_name="requested_by",
            expected_value="jarvis",
            decision=PolicyDecision.WARN,
            message="Jarvis-originated requests should be visible for review.",
        )
    )
    gate = ExecutivePolicyGate(
        policy_engine=engine,
        event_bus=bus,
        source="custom.executive.policy_gate",
    )

    result = gate.check_approval_request(make_approval_request("apr-1"))

    assert result.status == "allowed_with_warnings"
    events = bus.list_events()
    event = events[-1]
    assert event.source == "custom.executive.policy_gate"
    assert event.payload["event_name"] == "ExecutivePolicyGateChecked"
    assert event.payload["target_type"] == "approval_request"
    assert event.payload["target_id"] == "apr-1"
    assert event.payload["decision"] == PolicyDecision.WARN
    assert event.payload["status"] == "allowed_with_warnings"
