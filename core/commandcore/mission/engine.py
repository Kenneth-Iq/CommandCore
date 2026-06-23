"""Mission engine skeleton for the first CommandCore Mission Engine.

This module provides the first non-executing, in-memory skeleton of the
CommandCore Mission Engine described by the locked domain and architecture
documents. It stores canonical Mission and Task contracts in process memory
only and deliberately avoids planning, execution, persistence, APIs, agent
runtime calls, capability registry calls, and Jarvis integration changes.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from commandcore.contracts import Mission, MissionStatus, Task


class DuplicateMissionIdError(ValueError):
    """Raised when attempting to create a mission with an existing ID."""


class MissionNotFoundError(KeyError):
    """Raised when a mission ID does not exist in the engine."""


@dataclass(slots=True)
class MissionEngine:
    """In-memory non-executing skeleton for canonical Mission contracts.

    This is the first implementation of the CommandCore Mission Engine
    skeleton. It owns only mission registration, mission state updates, agent
    assignment, and task attachment behavior for `Mission` and `Task`
    contracts.
    """

    _missions: dict[str, Mission] = field(default_factory=dict)
    _tasks: dict[str, list[Task]] = field(default_factory=dict)
    _result_summaries: dict[str, str] = field(default_factory=dict)
    _failure_reasons: dict[str, str] = field(default_factory=dict)

    def create_mission(self, mission: Mission) -> Mission:
        """Create a mission by canonical mission ID.

        Raises:
            DuplicateMissionIdError: If the mission ID is already present.
        """

        if mission.id in self._missions:
            raise DuplicateMissionIdError(
                f"Mission ID already registered: {mission.id}"
            )

        self._missions[mission.id] = mission
        self._tasks[mission.id] = []
        return mission

    def get_mission(self, mission_id: str) -> Mission:
        """Return a mission by ID.

        Raises:
            MissionNotFoundError: If the mission ID is unknown.
        """

        try:
            return self._missions[mission_id]
        except KeyError as exc:
            raise MissionNotFoundError(f"Mission ID not found: {mission_id}") from exc

    def list_missions(self) -> list[Mission]:
        """Return all registered missions in insertion order."""

        return list(self._missions.values())

    def update_status(self, mission_id: str, status: MissionStatus) -> Mission:
        """Update the status of a mission."""

        mission = self.get_mission(mission_id)
        updated = mission.model_copy(update={"status": status})
        self._missions[mission_id] = updated
        return updated

    def assign_agent(self, mission_id: str, agent_id: str) -> Mission:
        """Assign an agent ID to a mission."""

        mission = self.get_mission(mission_id)
        updated = mission.model_copy(update={"assigned_agent_id": agent_id})
        self._missions[mission_id] = updated
        return updated

    def add_task(self, mission_id: str, task: Task) -> Task:
        """Attach a task to a mission without executing it."""

        self.get_mission(mission_id)
        self._tasks[mission_id].append(task)
        return task

    def list_tasks(self, mission_id: str) -> list[Task]:
        """Return all tasks attached to a mission."""

        self.get_mission(mission_id)
        return list(self._tasks[mission_id])

    def complete_mission(
        self, mission_id: str, result_summary: str | None = None
    ) -> Mission:
        """Mark a mission as completed and optionally store a result summary."""

        self.get_mission(mission_id)
        if result_summary is not None:
            self._result_summaries[mission_id] = result_summary
        self._failure_reasons.pop(mission_id, None)
        return self.update_status(mission_id, MissionStatus.COMPLETED)

    def fail_mission(self, mission_id: str, reason: str) -> Mission:
        """Mark a mission as failed and store a failure reason."""

        self.get_mission(mission_id)
        self._failure_reasons[mission_id] = reason
        self._result_summaries.pop(mission_id, None)
        return self.update_status(mission_id, MissionStatus.FAILED)
