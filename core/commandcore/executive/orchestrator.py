"""In-memory executive mission orchestrator for CommandCore."""

from __future__ import annotations

from dataclasses import dataclass, field

from commandcore.contracts import Mission, MissionStatus, Ownership, OwnershipKind
from commandcore.events import Event, EventType, InMemoryEventBus
from commandcore.mission import MissionEngine

from .models import MissionRequest, Objective
from .runtime import ExecutiveRuntime


@dataclass(slots=True)
class ExecutiveMissionOrchestrator:
    """Coordinate executive objectives into mission requests and missions."""

    executive_runtime: ExecutiveRuntime
    mission_engine: MissionEngine
    event_bus: InMemoryEventBus | None = None
    source: str | None = None
    _objective_to_mission_request_id: dict[str, str] = field(default_factory=dict)
    _objective_to_mission_id: dict[str, str] = field(default_factory=dict)
    _last_seen_mission_status: dict[str, MissionStatus] = field(default_factory=dict)

    default_event_source: str = "commandcore.executive.orchestrator"

    def __post_init__(self) -> None:
        if self.event_bus is None:
            self.event_bus = self.executive_runtime.event_bus or self.mission_engine.event_bus

    def submit_objective(self, objective: Objective) -> Mission:
        """Accept an objective, create a mission request, and create a mission."""

        self.executive_runtime.submit_objective(objective)
        self._publish(
            name="ExecutiveObjectiveAccepted",
            payload={
                "objective_id": objective.id,
                "title": objective.title,
                "requested_by": objective.requested_by,
                "scope": list(objective.scope),
                "priority": objective.priority,
            },
        )

        mission_request = self.convert_objective_into_mission_request(objective)
        self.executive_runtime.create_mission_request(objective.id, mission_request)
        self._objective_to_mission_request_id[objective.id] = mission_request.id

        mission = self.mission_engine.create_mission(self._mission_from_request(mission_request))
        self._objective_to_mission_id[objective.id] = mission.id
        self._last_seen_mission_status[objective.id] = mission.status
        self._publish(
            name="ExecutiveMissionCreated",
            payload={
                "objective_id": objective.id,
                "mission_request_id": mission_request.id,
                "mission_id": mission.id,
                "title": mission.title,
                "status": self._status_value(mission.status),
            },
        )
        return mission

    def convert_objective_into_mission_request(self, objective: Objective) -> MissionRequest:
        """Derive a deterministic mission request from an executive objective."""

        return MissionRequest(
            id=f"mr-{objective.id}",
            title=objective.title,
            requested_by=objective.requested_by,
            scope=list(objective.scope),
            capability_ids=[],
            required_output=objective.summary,
            approval_required=True,
        )

    def get_mission_status_for_objective(self, objective_id: str) -> MissionStatus:
        """Return and track the current mission status for one objective."""

        mission = self.get_mission_for_objective(objective_id)
        current_status = mission.status
        previous_status = self._last_seen_mission_status.get(objective_id)
        if current_status != previous_status:
            self._last_seen_mission_status[objective_id] = current_status
            if current_status == MissionStatus.COMPLETED:
                self._publish(
                    name="ExecutiveMissionCompleted",
                    payload={
                        "objective_id": objective_id,
                        "mission_id": mission.id,
                        "status": self._status_value(current_status),
                    },
                )
            elif current_status == MissionStatus.FAILED:
                self._publish(
                    name="ExecutiveMissionFailed",
                    payload={
                        "objective_id": objective_id,
                        "mission_id": mission.id,
                        "status": self._status_value(current_status),
                    },
                )
        return current_status

    def get_mission_for_objective(self, objective_id: str) -> Mission:
        """Return the created mission for one objective."""

        self.executive_runtime.get_objective(objective_id)
        try:
            mission_id = self._objective_to_mission_id[objective_id]
        except KeyError as exc:
            raise KeyError(f"Mission not found for objective ID: {objective_id}") from exc
        return self.mission_engine.get_mission(mission_id)

    def _mission_from_request(self, mission_request: MissionRequest) -> Mission:
        return Mission(
            id=f"mission-{mission_request.id}",
            title=mission_request.title,
            status=MissionStatus.REQUESTED,
            ownership=Ownership(
                kind=OwnershipKind.DOMAIN,
                reference="commandcore.executive",
                display_name="CommandCore Executive Runtime",
            ),
            requested_by=mission_request.requested_by,
            scope=list(mission_request.scope),
            capability_ids=list(mission_request.capability_ids),
            approval_required=mission_request.approval_required,
            required_output=mission_request.required_output,
        )

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

    @staticmethod
    def _status_value(status: MissionStatus) -> str:
        return status.value if hasattr(status, "value") else str(status)
