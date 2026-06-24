"""In-memory executive policy engine for CommandCore."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from commandcore.events import Event, EventType, InMemoryEventBus

from .models import ApprovalRequest, Directive, MissionRequest, Objective


class PolicyDecision(StrEnum):
    """Possible executive policy outcomes."""

    ALLOW = "allow"
    WARN = "warn"
    BLOCK = "block"


class PolicyRule(BaseModel):
    """Single in-memory executive governance rule."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    id: str = Field(min_length=1)
    target_type: Literal["objective", "directive", "mission_request", "approval_request", "all"]
    field_name: str = Field(min_length=1)
    operator: Literal["equals", "contains"] = "equals"
    expected_value: Any
    decision: PolicyDecision
    message: str = Field(min_length=1)


class PolicyEvaluationResult(BaseModel):
    """Evaluation result for one executive record."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    target_type: str = Field(min_length=1)
    target_id: str = Field(min_length=1)
    decision: PolicyDecision
    matched_rule_ids: list[str] = Field(default_factory=list)
    messages: list[str] = Field(default_factory=list)


@dataclass(slots=True)
class ExecutivePolicyEngine:
    """Evaluate executive records against in-memory governance rules."""

    _rules: dict[str, PolicyRule] = field(default_factory=dict)
    event_bus: InMemoryEventBus | None = None
    source: str | None = None

    default_event_source: str = "commandcore.executive.policies"

    def add_rule(self, rule: PolicyRule) -> PolicyRule:
        """Store a policy rule by ID."""

        if rule.id in self._rules:
            raise ValueError(f"Policy rule ID already registered: {rule.id}")
        self._rules[rule.id] = rule
        return rule

    def remove_rule(self, rule_id: str) -> PolicyRule:
        """Remove and return a policy rule by ID."""

        try:
            return self._rules.pop(rule_id)
        except KeyError as exc:
            raise KeyError(f"Policy rule ID not found: {rule_id}") from exc

    def list_rules(self) -> list[PolicyRule]:
        """Return all policy rules in insertion order."""

        return list(self._rules.values())

    def evaluate_objective(self, objective: Objective) -> PolicyEvaluationResult:
        return self._evaluate("objective", objective.id, objective)

    def evaluate_directive(self, directive: Directive) -> PolicyEvaluationResult:
        return self._evaluate("directive", directive.id, directive)

    def evaluate_mission_request(
        self, mission_request: MissionRequest
    ) -> PolicyEvaluationResult:
        return self._evaluate("mission_request", mission_request.id, mission_request)

    def evaluate_approval_request(
        self, approval_request: ApprovalRequest
    ) -> PolicyEvaluationResult:
        return self._evaluate("approval_request", approval_request.id, approval_request)

    def _evaluate(self, target_type: str, target_id: str, record: Any) -> PolicyEvaluationResult:
        matched_rules = [
            rule
            for rule in self._rules.values()
            if rule.target_type in {target_type, "all"} and self._matches(rule, record)
        ]
        decision = self._combined_decision(matched_rules)
        result = PolicyEvaluationResult(
            target_type=target_type,
            target_id=target_id,
            decision=decision,
            matched_rule_ids=[rule.id for rule in matched_rules],
            messages=[rule.message for rule in matched_rules],
        )
        self._publish(result)
        return result

    @staticmethod
    def _matches(rule: PolicyRule, record: Any) -> bool:
        value = getattr(record, rule.field_name, None)
        if rule.operator == "equals":
            return value == rule.expected_value
        if rule.operator == "contains":
            if isinstance(value, (list, tuple, set)):
                return rule.expected_value in value
            if isinstance(value, str):
                return str(rule.expected_value) in value
            return False
        return False

    @staticmethod
    def _combined_decision(rules: list[PolicyRule]) -> PolicyDecision:
        if any(rule.decision == PolicyDecision.BLOCK for rule in rules):
            return PolicyDecision.BLOCK
        if any(rule.decision == PolicyDecision.WARN for rule in rules):
            return PolicyDecision.WARN
        return PolicyDecision.ALLOW

    def _publish(self, result: PolicyEvaluationResult) -> None:
        if self.event_bus is None:
            return

        self.event_bus.publish(
            Event(
                type=EventType.DOMAIN,
                source=self.source or self.default_event_source,
                payload={
                    "event_name": "ExecutivePolicyEvaluated",
                    "target_type": result.target_type,
                    "target_id": result.target_id,
                    "decision": result.decision,
                    "matched_rule_ids": list(result.matched_rule_ids),
                    "message_count": len(result.messages),
                },
            )
        )
