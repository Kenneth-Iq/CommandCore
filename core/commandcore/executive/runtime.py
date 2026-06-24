"""In-memory executive runtime foundation for CommandCore."""

from __future__ import annotations

from dataclasses import dataclass, field

from commandcore.events import Event, EventType, InMemoryEventBus

from .models import ApprovalRequest, Decision, Directive, MissionRequest, Objective


@dataclass(slots=True)
class ExecutiveRuntime:
    """Store executive runtime records in memory only."""

    _objectives: dict[str, Objective] = field(default_factory=dict)
    _directives: dict[str, list[Directive]] = field(default_factory=dict)
    _decisions: dict[str, list[Decision]] = field(default_factory=dict)
    _approval_requests: dict[str, list[ApprovalRequest]] = field(default_factory=dict)
    _mission_requests: dict[str, list[MissionRequest]] = field(default_factory=dict)
    event_bus: InMemoryEventBus | None = None
    source: str | None = None

    default_event_source: str = "commandcore.executive.runtime"

    def submit_objective(self, objective: Objective) -> Objective:
        """Store an executive objective by ID."""

        if objective.id in self._objectives:
            raise ValueError(f"Objective ID already registered: {objective.id}")

        self._objectives[objective.id] = objective
        self._directives[objective.id] = []
        self._decisions[objective.id] = []
        self._approval_requests[objective.id] = []
        self._mission_requests[objective.id] = []
        self._publish(
            name="ExecutiveObjectiveSubmitted",
            payload={
                "objective_id": objective.id,
                "title": objective.title,
                "summary": objective.summary,
                "requested_by": objective.requested_by,
                "scope": list(objective.scope),
                "priority": objective.priority,
            },
        )
        return objective

    def get_objective(self, objective_id: str) -> Objective:
        """Return an objective by ID."""

        try:
            return self._objectives[objective_id]
        except KeyError as exc:
            raise KeyError(f"Objective ID not found: {objective_id}") from exc

    def list_objectives(self) -> list[Objective]:
        """Return all submitted objectives in insertion order."""

        return list(self._objectives.values())

    def create_directive(self, objective_id: str, directive: Directive) -> Directive:
        """Attach a directive to an objective."""

        self._ensure_unique_child(self.list_directives(objective_id), directive.id, "Directive")
        self._directives[objective_id].append(directive)
        self._publish(
            name="ExecutiveDirectiveCreated",
            payload={
                "objective_id": objective_id,
                "directive_id": directive.id,
                "summary": directive.summary,
                "issued_by": directive.issued_by,
                "directive_type": directive.directive_type,
            },
        )
        return directive

    def list_directives(self, objective_id: str) -> list[Directive]:
        """Return directives for an objective."""

        self.get_objective(objective_id)
        return list(self._directives[objective_id])

    def create_decision(self, objective_id: str, decision: Decision) -> Decision:
        """Attach a decision to an objective."""

        self._ensure_unique_child(self.list_decisions(objective_id), decision.id, "Decision")
        self._decisions[objective_id].append(decision)
        self._publish(
            name="ExecutiveDecisionCreated",
            payload={
                "objective_id": objective_id,
                "decision_id": decision.id,
                "summary": decision.summary,
                "decided_by": decision.decided_by,
                "decision_type": decision.decision_type,
                "rationale": decision.rationale,
            },
        )
        return decision

    def list_decisions(self, objective_id: str) -> list[Decision]:
        """Return decisions for an objective."""

        self.get_objective(objective_id)
        return list(self._decisions[objective_id])

    def request_approval(
        self, objective_id: str, approval_request: ApprovalRequest
    ) -> ApprovalRequest:
        """Attach an approval request to an objective."""

        existing = self._list_approval_requests(objective_id)
        self._ensure_unique_child(existing, approval_request.id, "Approval request")
        self._approval_requests[objective_id].append(approval_request)
        self._publish(
            name="ExecutiveApprovalRequested",
            payload={
                "objective_id": objective_id,
                "approval_request_id": approval_request.id,
                "summary": approval_request.summary,
                "requested_by": approval_request.requested_by,
                "reviewer_reference": approval_request.reviewer_reference,
                "approval_type": approval_request.approval_type,
            },
        )
        return approval_request

    def create_mission_request(
        self, objective_id: str, mission_request: MissionRequest
    ) -> MissionRequest:
        """Attach a mission request to an objective."""

        existing = self._list_mission_requests(objective_id)
        self._ensure_unique_child(existing, mission_request.id, "Mission request")
        self._mission_requests[objective_id].append(mission_request)
        self._publish(
            name="ExecutiveMissionRequested",
            payload={
                "objective_id": objective_id,
                "mission_request_id": mission_request.id,
                "title": mission_request.title,
                "requested_by": mission_request.requested_by,
                "scope": list(mission_request.scope),
                "capability_ids": list(mission_request.capability_ids),
                "required_output": mission_request.required_output,
                "approval_required": mission_request.approval_required,
            },
        )
        return mission_request

    def _list_approval_requests(self, objective_id: str) -> list[ApprovalRequest]:
        self.get_objective(objective_id)
        return list(self._approval_requests[objective_id])

    def _list_mission_requests(self, objective_id: str) -> list[MissionRequest]:
        self.get_objective(objective_id)
        return list(self._mission_requests[objective_id])

    @staticmethod
    def _ensure_unique_child(existing_items: list[object], item_id: str, label: str) -> None:
        if any(getattr(item, "id") == item_id for item in existing_items):
            raise ValueError(f"{label} ID already registered: {item_id}")

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
