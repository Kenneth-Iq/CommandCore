"""In-memory executive policy gate for CommandCore."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from commandcore.events import Event, EventType, InMemoryEventBus

from .models import ApprovalRequest, Directive, MissionRequest, Objective
from .policies import ExecutivePolicyEngine, PolicyDecision, PolicyEvaluationResult


class PolicyGateResult(BaseModel):
    """Gate result derived from a policy evaluation."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    status: Literal["allowed", "allowed_with_warnings", "blocked"]
    evaluation: PolicyEvaluationResult


@dataclass(slots=True)
class ExecutivePolicyGate:
    """Thin gate over the executive policy engine."""

    policy_engine: ExecutivePolicyEngine
    event_bus: InMemoryEventBus | None = None
    source: str | None = None

    default_event_source: str = "commandcore.executive.policy_gate"

    def __post_init__(self) -> None:
        if self.event_bus is None:
            self.event_bus = self.policy_engine.event_bus

    def check_objective(self, objective: Objective) -> PolicyGateResult:
        return self._gate(self.policy_engine.evaluate_objective(objective))

    def check_directive(self, directive: Directive) -> PolicyGateResult:
        return self._gate(self.policy_engine.evaluate_directive(directive))

    def check_approval_request(self, approval_request: ApprovalRequest) -> PolicyGateResult:
        return self._gate(self.policy_engine.evaluate_approval_request(approval_request))

    def check_mission_request(self, mission_request: MissionRequest) -> PolicyGateResult:
        return self._gate(self.policy_engine.evaluate_mission_request(mission_request))

    def _gate(self, evaluation: PolicyEvaluationResult) -> PolicyGateResult:
        status = self._status_for(evaluation.decision)
        result = PolicyGateResult(status=status, evaluation=evaluation)
        self._publish(result)
        return result

    @staticmethod
    def _status_for(decision: PolicyDecision) -> str:
        if decision == PolicyDecision.BLOCK:
            return "blocked"
        if decision == PolicyDecision.WARN:
            return "allowed_with_warnings"
        return "allowed"

    def _publish(self, result: PolicyGateResult) -> None:
        if self.event_bus is None:
            return

        self.event_bus.publish(
            Event(
                type=EventType.DOMAIN,
                source=self.source or self.default_event_source,
                payload={
                    "event_name": "ExecutivePolicyGateChecked",
                    "target_type": result.evaluation.target_type,
                    "target_id": result.evaluation.target_id,
                    "decision": result.evaluation.decision,
                    "status": result.status,
                    "matched_rule_ids": list(result.evaluation.matched_rule_ids),
                    "message_count": len(result.evaluation.messages),
                },
            )
        )
