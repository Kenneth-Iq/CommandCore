from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.events import InMemoryEventBus
from commandcore.executive import (
    ApprovalRequest,
    Directive,
    ExecutivePolicyEngine,
    MissionRequest,
    Objective,
    PolicyDecision,
    PolicyRule,
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


def make_directive(directive_id: str) -> Directive:
    return Directive(
        id=directive_id,
        summary="Prepare an executive-ready blocker summary.",
        issued_by="athena",
        directive_type="operations",
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


def test_add_remove_and_list_rules():
    engine = ExecutivePolicyEngine()
    rule = PolicyRule(
        id="rule-1",
        target_type="objective",
        field_name="priority",
        expected_value="high",
        decision=PolicyDecision.WARN,
        message="High-priority objectives require review.",
    )

    engine.add_rule(rule)

    assert engine.list_rules() == [rule]
    assert engine.remove_rule("rule-1") == rule
    assert engine.list_rules() == []


def test_add_duplicate_rule_raises_and_remove_missing_rule_raises():
    engine = ExecutivePolicyEngine()
    rule = PolicyRule(
        id="rule-1",
        target_type="objective",
        field_name="priority",
        expected_value="high",
        decision=PolicyDecision.WARN,
        message="High-priority objectives require review.",
    )
    engine.add_rule(rule)

    with pytest.raises(ValueError):
        engine.add_rule(rule)

    with pytest.raises(KeyError):
        engine.remove_rule("missing-rule")


def test_evaluate_objective_defaults_to_allow_without_matching_rules():
    engine = ExecutivePolicyEngine()

    result = engine.evaluate_objective(make_objective("obj-1"))

    assert result.decision == PolicyDecision.ALLOW
    assert result.matched_rule_ids == []
    assert result.messages == []


def test_evaluate_directive_can_warn():
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

    result = engine.evaluate_directive(make_directive("dir-1"))

    assert result.decision == PolicyDecision.WARN
    assert result.matched_rule_ids == ["rule-directive"]
    assert result.messages == ["Operations directives should be reviewed."]


def test_evaluate_mission_request_can_block_and_contains_rule_can_match():
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

    result = engine.evaluate_mission_request(make_mission_request("mr-1"))

    assert result.decision == PolicyDecision.BLOCK
    assert result.matched_rule_ids == ["rule-scope"]


def test_evaluate_approval_request_can_use_global_rule():
    engine = ExecutivePolicyEngine()
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

    result = engine.evaluate_approval_request(make_approval_request("apr-1"))

    assert result.decision == PolicyDecision.WARN
    assert result.matched_rule_ids == ["rule-all"]


def test_policy_events_are_published_when_event_bus_is_provided():
    bus = InMemoryEventBus()
    engine = ExecutivePolicyEngine(event_bus=bus, source="custom.executive.policies")
    engine.add_rule(
        PolicyRule(
            id="rule-1",
            target_type="objective",
            field_name="priority",
            expected_value="high",
            decision=PolicyDecision.WARN,
            message="High-priority objectives require review.",
        )
    )

    result = engine.evaluate_objective(make_objective("obj-1"))

    assert result.decision == PolicyDecision.WARN
    [event] = bus.list_events()
    assert event.source == "custom.executive.policies"
    assert event.payload["event_name"] == "ExecutivePolicyEvaluated"
    assert event.payload["target_type"] == "objective"
    assert event.payload["target_id"] == "obj-1"
    assert event.payload["decision"] == PolicyDecision.WARN
    assert event.payload["matched_rule_ids"] == ["rule-1"]
    assert event.payload["message_count"] == 1
