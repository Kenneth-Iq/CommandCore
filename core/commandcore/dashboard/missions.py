"""Read-only mission dashboard services for CommandCore."""

from __future__ import annotations

from dataclasses import dataclass

from commandcore.audit import InMemoryAuditTrail
from commandcore.contracts import MissionStatus
from commandcore.events import Event
from commandcore.mission import MissionEngine


MISSION_ACTIVITY_EVENTS = {
    "MissionCreated",
    "MissionStatusChanged",
    "MissionAgentAssigned",
    "MissionTaskAdded",
    "MissionCompleted",
    "MissionFailed",
    "ExecutiveMissionCreated",
    "ExecutiveMissionCompleted",
    "ExecutiveMissionFailed",
}

ACTIVE_MISSION_STATUSES = {
    MissionStatus.REQUESTED,
    MissionStatus.APPROVED,
    MissionStatus.ASSIGNED,
    MissionStatus.BLOCKED,
}


@dataclass(slots=True)
class MissionDashboardService:
    """Read-only mission dashboard over the in-memory mission engine."""

    mission_engine: MissionEngine
    audit_trail: InMemoryAuditTrail

    def mission_counts(self) -> dict[str, int]:
        missions = self.mission_engine.list_missions()
        return {
            "total": len(missions),
            "active": len([mission for mission in missions if mission.status in ACTIVE_MISSION_STATUSES]),
            "completed": len([mission for mission in missions if mission.status == MissionStatus.COMPLETED]),
            "failed": len([mission for mission in missions if mission.status == MissionStatus.FAILED]),
        }

    def active_missions(self) -> list[dict[str, object]]:
        return [
            self._serialize_mission(mission)
            for mission in self.mission_engine.list_missions()
            if mission.status in ACTIVE_MISSION_STATUSES
        ]

    def completed_missions(self) -> list[dict[str, object]]:
        return [
            self._serialize_mission(mission)
            for mission in self.mission_engine.list_missions()
            if mission.status == MissionStatus.COMPLETED
        ]

    def failed_missions(self) -> list[dict[str, object]]:
        return [
            self._serialize_mission(mission)
            for mission in self.mission_engine.list_missions()
            if mission.status == MissionStatus.FAILED
        ]

    def mission_throughput(self) -> dict[str, int | float]:
        counts = self.mission_counts()
        terminal = counts["completed"] + counts["failed"]
        completion_rate = counts["completed"] / terminal if terminal else 0.0
        return {
            "created": counts["total"],
            "completed": counts["completed"],
            "failed": counts["failed"],
            "terminal": terminal,
            "completion_rate": completion_rate,
        }

    def recent_mission_activity(self, limit: int = 10) -> list[dict[str, object]]:
        events = [
            self._serialize_event(event)
            for event in self.audit_trail.list_entries()
            if event.payload.get("event_name") in MISSION_ACTIVITY_EVENTS
        ]
        return events[-limit:]

    def build_dashboard(self) -> dict[str, object]:
        return {
            "mission_counts": self.mission_counts(),
            "active_missions": self.active_missions(),
            "completed_missions": self.completed_missions(),
            "failed_missions": self.failed_missions(),
            "mission_throughput": self.mission_throughput(),
            "recent_mission_activity": self.recent_mission_activity(),
        }

    def _serialize_mission(self, mission: object) -> dict[str, object]:
        mission_id = getattr(mission, "id")
        return {
            "mission_id": mission_id,
            "title": getattr(mission, "title"),
            "status": getattr(mission, "status"),
            "requested_by": getattr(mission, "requested_by"),
            "assigned_agent_id": getattr(mission, "assigned_agent_id"),
            "scope": list(getattr(mission, "scope")),
            "capability_ids": list(getattr(mission, "capability_ids")),
            "task_count": len(self.mission_engine.list_tasks(mission_id)),
            "result_summary": self.mission_engine.get_result_summary(mission_id),
            "failure_reason": self.mission_engine.get_failure_reason(mission_id),
        }

    @staticmethod
    def _serialize_event(event: Event) -> dict[str, object]:
        return {
            "event_id": event.id,
            "event_name": event.payload.get("event_name"),
            "event_type": event.type,
            "source": event.source,
            "occurred_at": event.occurred_at,
            "payload": dict(event.payload),
        }
