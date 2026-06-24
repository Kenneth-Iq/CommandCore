"""In-memory executive state store for CommandCore."""

from __future__ import annotations

from dataclasses import dataclass, field

from pydantic import BaseModel, ConfigDict, Field

from commandcore.events import Event, EventType, InMemoryEventBus

from .models import Decision, Directive, Objective


class ExecutiveOutcomeRecord(BaseModel):
    """Recorded executive outcome for one objective."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    objective_id: str = Field(min_length=1)
    outcome: str = Field(min_length=1)


@dataclass(slots=True)
class ExecutiveStateStore:
    """Append-only in-memory state history for executive runtime records."""

    _objective_history: dict[str, list[Objective]] = field(default_factory=dict)
    _decision_history: dict[str, list[Decision]] = field(default_factory=dict)
    _directive_history: dict[str, list[Directive]] = field(default_factory=dict)
    _mission_history: dict[str, list[str]] = field(default_factory=dict)
    _outcome_history: dict[str, list[ExecutiveOutcomeRecord]] = field(
        default_factory=dict
    )
    event_bus: InMemoryEventBus | None = None
    source: str | None = None

    default_event_source: str = "commandcore.executive.state"

    def record_objective(self, objective: Objective) -> Objective:
        """Append an objective snapshot to its history."""

        self._objective_history.setdefault(objective.id, []).append(objective)
        self._publish(
            name="ExecutiveStateUpdated",
            payload={
                "record_type": "objective",
                "objective_id": objective.id,
                "title": objective.title,
                "requested_by": objective.requested_by,
            },
        )
        return objective

    def record_decision(self, objective_id: str, decision: Decision) -> Decision:
        """Append a decision to one objective's history."""

        self._ensure_objective_known(objective_id)
        self._decision_history.setdefault(objective_id, []).append(decision)
        self._publish(
            name="ExecutiveStateUpdated",
            payload={
                "record_type": "decision",
                "objective_id": objective_id,
                "decision_id": decision.id,
                "decision_type": decision.decision_type,
            },
        )
        return decision

    def record_directive(self, objective_id: str, directive: Directive) -> Directive:
        """Append a directive to one objective's history."""

        self._ensure_objective_known(objective_id)
        self._directive_history.setdefault(objective_id, []).append(directive)
        self._publish(
            name="ExecutiveStateUpdated",
            payload={
                "record_type": "directive",
                "objective_id": objective_id,
                "directive_id": directive.id,
                "directive_type": directive.directive_type,
            },
        )
        return directive

    def record_mission(self, objective_id: str, mission_id: str) -> str:
        """Append a mission ID to one objective's history."""

        self._ensure_objective_known(objective_id)
        self._mission_history.setdefault(objective_id, []).append(mission_id)
        self._publish(
            name="ExecutiveStateUpdated",
            payload={
                "record_type": "mission",
                "objective_id": objective_id,
                "mission_id": mission_id,
            },
        )
        return mission_id

    def record_outcome(self, objective_id: str, outcome: str) -> ExecutiveOutcomeRecord:
        """Append an outcome record to one objective's history."""

        self._ensure_objective_known(objective_id)
        outcome_record = ExecutiveOutcomeRecord(
            objective_id=objective_id,
            outcome=outcome,
        )
        self._outcome_history.setdefault(objective_id, []).append(outcome_record)
        self._publish(
            name="ExecutiveOutcomeRecorded",
            payload={
                "objective_id": objective_id,
                "outcome": outcome,
            },
        )
        return outcome_record

    def get_objective_history(self) -> dict[str, list[Objective]]:
        """Return all recorded objective histories by objective ID."""

        return {
            objective_id: list(history)
            for objective_id, history in self._objective_history.items()
        }

    def get_mission_history(self, objective_id: str | None = None) -> dict[str, list[str]] | list[str]:
        """Return mission history for one objective or for all objectives."""

        if objective_id is None:
            return {
                key: list(history) for key, history in self._mission_history.items()
            }
        return list(self._mission_history.get(objective_id, []))

    def get_decision_history(
        self, objective_id: str | None = None
    ) -> dict[str, list[Decision]] | list[Decision]:
        """Return decision history for one objective or for all objectives."""

        if objective_id is None:
            return {
                key: list(history) for key, history in self._decision_history.items()
            }
        return list(self._decision_history.get(objective_id, []))

    def get_directive_history(
        self, objective_id: str | None = None
    ) -> dict[str, list[Directive]] | list[Directive]:
        """Return directive history for one objective or for all objectives."""

        if objective_id is None:
            return {
                key: list(history) for key, history in self._directive_history.items()
            }
        return list(self._directive_history.get(objective_id, []))

    def get_outcome_history(
        self, objective_id: str | None = None
    ) -> dict[str, list[ExecutiveOutcomeRecord]] | list[ExecutiveOutcomeRecord]:
        """Return outcome history for one objective or for all objectives."""

        if objective_id is None:
            return {
                key: list(history) for key, history in self._outcome_history.items()
            }
        return list(self._outcome_history.get(objective_id, []))

    def _ensure_objective_known(self, objective_id: str) -> None:
        if objective_id not in self._objective_history:
            raise KeyError(f"Objective ID not found: {objective_id}")

    def _publish(self, *, name: str, payload: dict[str, object]) -> None:
        if self.event_bus is None:
            return

        self.event_bus.publish(
            Event(
                type=EventType.DOMAIN,
                source=self.source or self.default_event_source,
                payload={"event_name": name, **payload},
            )
        )
