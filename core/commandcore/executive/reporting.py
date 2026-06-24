"""In-memory executive reporting helpers for CommandCore."""

from __future__ import annotations

from dataclasses import dataclass

from commandcore.mission import MissionEngine

from .policies import ExecutivePolicyEngine
from .runtime import ExecutiveRuntime
from .state import ExecutiveStateStore


@dataclass(slots=True)
class ExecutiveReportingService:
    """Bound executive reporting service over in-memory kernel components."""

    executive_runtime: ExecutiveRuntime
    mission_engine: MissionEngine
    policy_engine: ExecutivePolicyEngine
    state_store: ExecutiveStateStore | None = None

    def build_objective_report(self) -> dict[str, object]:
        return build_objective_report(
            self.executive_runtime,
            state_store=self.state_store,
        )

    def build_mission_report(self) -> dict[str, object]:
        return build_mission_report(self.mission_engine)

    def build_policy_report(self) -> dict[str, object]:
        return build_policy_report(self.policy_engine)

    def build_executive_summary(self) -> dict[str, object]:
        return build_executive_summary(
            self.executive_runtime,
            self.mission_engine,
            self.policy_engine,
            state_store=self.state_store,
        )


def build_objective_report(
    executive_runtime: ExecutiveRuntime,
    state_store: ExecutiveStateStore | None = None,
) -> dict[str, object]:
    """Build a read-only report of tracked executive objectives."""

    objectives = executive_runtime.list_objectives()
    objective_histories = (
        state_store.get_objective_history() if state_store is not None else {}
    )
    mission_histories = (
        state_store.get_mission_history() if state_store is not None else {}
    )
    outcome_histories = (
        state_store.get_outcome_history() if state_store is not None else {}
    )

    return {
        "objective_count": len(objectives),
        "objectives": [
            {
                "objective_id": objective.id,
                "title": objective.title,
                "requested_by": objective.requested_by,
                "priority": objective.priority,
                "scope": list(objective.scope),
                "directive_count": len(executive_runtime.list_directives(objective.id)),
                "decision_count": len(executive_runtime.list_decisions(objective.id)),
                "objective_revision_count": len(objective_histories.get(objective.id, [])),
                "mission_count": len(mission_histories.get(objective.id, [])),
                "outcome_count": len(outcome_histories.get(objective.id, [])),
            }
            for objective in objectives
        ],
    }


def build_mission_report(mission_engine: MissionEngine) -> dict[str, object]:
    """Build a read-only report of tracked missions."""

    missions = mission_engine.list_missions()
    return {
        "mission_count": len(missions),
        "missions": [
            {
                "mission_id": mission.id,
                "title": mission.title,
                "status": mission.status,
                "requested_by": mission.requested_by,
                "assigned_agent_id": mission.assigned_agent_id,
                "scope": list(mission.scope),
                "capability_ids": list(mission.capability_ids),
                "task_count": len(mission_engine.list_tasks(mission.id)),
                "result_summary": mission_engine.get_result_summary(mission.id),
                "failure_reason": mission_engine.get_failure_reason(mission.id),
            }
            for mission in missions
        ],
    }


def build_policy_report(policy_engine: ExecutivePolicyEngine) -> dict[str, object]:
    """Build a read-only report of configured executive policy rules."""

    rules = policy_engine.list_rules()
    return {
        "policy_rule_count": len(rules),
        "rules": [
            {
                "rule_id": rule.id,
                "target_type": rule.target_type,
                "field_name": rule.field_name,
                "operator": rule.operator,
                "expected_value": rule.expected_value,
                "decision": rule.decision,
                "message": rule.message,
            }
            for rule in rules
        ],
        "rules_by_decision": {
            "allow": sum(1 for rule in rules if rule.decision.value == "allow"),
            "warn": sum(1 for rule in rules if rule.decision.value == "warn"),
            "block": sum(1 for rule in rules if rule.decision.value == "block"),
        },
    }


def build_executive_summary(
    executive_runtime: ExecutiveRuntime,
    mission_engine: MissionEngine,
    policy_engine: ExecutivePolicyEngine,
    state_store: ExecutiveStateStore | None = None,
) -> dict[str, object]:
    """Build a combined executive observability summary."""

    objective_report = build_objective_report(executive_runtime, state_store=state_store)
    mission_report = build_mission_report(mission_engine)
    policy_report = build_policy_report(policy_engine)
    return {
        "objective_count": objective_report["objective_count"],
        "mission_count": mission_report["mission_count"],
        "policy_rule_count": policy_report["policy_rule_count"],
        "completed_mission_count": sum(
            1
            for mission in mission_report["missions"]
            if getattr(mission["status"], "value", mission["status"]) == "completed"
        ),
        "failed_mission_count": sum(
            1
            for mission in mission_report["missions"]
            if getattr(mission["status"], "value", mission["status"]) == "failed"
        ),
        "objective_report": objective_report,
        "mission_report": mission_report,
        "policy_report": policy_report,
    }
