"""Read-only executive dashboard services for CommandCore."""

from __future__ import annotations

from dataclasses import dataclass

from commandcore.audit import InMemoryAuditTrail
from commandcore.executive import ExecutiveReportingService, ExecutiveStateStore

from .serializers import serialize_event


@dataclass(slots=True)
class ExecutiveDashboardService:
    """Read-only executive dashboard over governance and state services."""

    executive_reporting: ExecutiveReportingService
    state_store: ExecutiveStateStore
    audit_trail: InMemoryAuditTrail

    def objective_counts(self) -> dict[str, int]:
        objective_report = self.executive_reporting.build_objective_report()
        return {
            "total": objective_report["objective_count"],
            "with_missions": sum(
                1
                for objective in objective_report["objectives"]
                if objective["mission_count"] > 0
            ),
            "with_outcomes": sum(
                1
                for objective in objective_report["objectives"]
                if objective["outcome_count"] > 0
            ),
        }

    def decisions(self) -> dict[str, object]:
        history = self.state_store.get_decision_history()
        return {
            "count": sum(len(records) for records in history.values()),
            "by_objective": {objective_id: list(records) for objective_id, records in history.items()},
        }

    def directives(self) -> dict[str, object]:
        history = self.state_store.get_directive_history()
        return {
            "count": sum(len(records) for records in history.values()),
            "by_objective": {objective_id: list(records) for objective_id, records in history.items()},
        }

    def policy_blocks(self) -> list[dict[str, object]]:
        return [
            serialize_event(event)
            for event in self.audit_trail.list_entries()
            if event.payload.get("event_name") == "ExecutivePolicyGateChecked"
            and event.payload.get("status") == "blocked"
        ]

    def policy_warnings(self) -> list[dict[str, object]]:
        return [
            serialize_event(event)
            for event in self.audit_trail.list_entries()
            if event.payload.get("event_name") == "ExecutivePolicyGateChecked"
            and event.payload.get("status") == "allowed_with_warnings"
        ]

    def executive_outcomes(self) -> dict[str, object]:
        history = self.state_store.get_outcome_history()
        return {
            "count": sum(len(records) for records in history.values()),
            "by_objective": {objective_id: list(records) for objective_id, records in history.items()},
        }

    def build_dashboard(self) -> dict[str, object]:
        return {
            "objective_counts": self.objective_counts(),
            "decisions": self.decisions(),
            "directives": self.directives(),
            "policy_blocks": self.policy_blocks(),
            "policy_warnings": self.policy_warnings(),
            "executive_outcomes": self.executive_outcomes(),
        }

