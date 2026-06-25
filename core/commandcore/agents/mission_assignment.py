"""Mission-to-agent assignment helpers over the in-memory agent runtime."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from commandcore.events import Event, EventType, InMemoryEventBus

from .models import AgentAssignment, AgentExecution, AgentRuntimeResult
from .runtime import InMemoryAgentRuntime

if TYPE_CHECKING:
    from commandcore.mission import MissionEngine
    from commandcore.registries import AgentRegistry


@dataclass(slots=True)
class AgentMissionAssignmentService:
    """Coordinate mission-scoped agent assignments and executions."""

    agent_runtime: InMemoryAgentRuntime
    agent_registry: "AgentRegistry | None" = None
    mission_engine: "MissionEngine | None" = None
    event_bus: InMemoryEventBus | None = None
    source: str | None = None

    default_event_source: str = "commandcore.agents.mission_assignment"

    def assign_agent_to_mission(
        self,
        agent_id: str,
        mission_id: str,
        task_id: str | None = None,
        capability_id: str | None = None,
    ) -> AgentAssignment:
        """Assign one agent to one mission through the runtime."""

        self._validate_agent(agent_id)
        self._validate_mission(mission_id)
        assignment = self.agent_runtime.assign_agent(
            agent_id=agent_id,
            mission_id=mission_id,
            task_id=task_id,
            capability_id=capability_id,
        )
        self._publish(
            name="AgentMissionAssigned",
            payload={
                "assignment_id": assignment.id,
                "agent_id": assignment.agent_id,
                "mission_id": assignment.mission_id,
                "task_id": assignment.task_id,
                "capability_id": assignment.capability_id,
                "status": assignment.status,
            },
        )
        return assignment

    def list_mission_assignments(self, mission_id: str) -> list[AgentAssignment]:
        """Return assignments for one mission."""

        self._validate_mission(mission_id)
        return [
            assignment
            for assignment in self.agent_runtime.list_assignments()
            if assignment.mission_id == mission_id
        ]

    def list_agent_mission_assignments(self, agent_id: str) -> list[AgentAssignment]:
        """Return mission-linked assignments for one agent."""

        self._validate_agent(agent_id)
        return [
            assignment
            for assignment in self.agent_runtime.list_assignments()
            if assignment.agent_id == agent_id and assignment.mission_id is not None
        ]

    def start_mission_task_execution(
        self,
        assignment_id: str,
        input_payload: dict[str, Any] | None = None,
    ) -> AgentExecution:
        """Start one mission-scoped execution for a known assignment."""

        assignment = self.agent_runtime.get_assignment(assignment_id)
        execution = self.agent_runtime.start_execution(
            assignment.id,
            input_payload=input_payload,
        )
        self._publish(
            name="AgentMissionExecutionStarted",
            payload={
                "execution_id": execution.id,
                "assignment_id": assignment.id,
                "agent_id": execution.agent_id,
                "mission_id": execution.mission_id,
                "task_id": execution.task_id,
                "capability_id": execution.capability_id,
                "status": execution.status,
            },
        )
        return execution

    def complete_mission_task_execution(
        self,
        execution_id: str,
        output_payload: dict[str, Any] | None = None,
    ) -> AgentRuntimeResult:
        """Complete one mission-scoped execution."""

        result = self.agent_runtime.complete_execution(
            execution_id,
            output_payload=output_payload,
        )
        self._publish(
            name="AgentMissionExecutionCompleted",
            payload={
                "execution_id": result.execution_id,
                "agent_id": result.agent_id,
                "mission_id": result.mission_id,
                "task_id": result.task_id,
                "capability_id": result.capability_id,
                "status": result.status,
            },
        )
        return result

    def fail_mission_task_execution(
        self,
        execution_id: str,
        error: str,
    ) -> AgentRuntimeResult:
        """Fail one mission-scoped execution."""

        result = self.agent_runtime.fail_execution(execution_id, error=error)
        self._publish(
            name="AgentMissionExecutionFailed",
            payload={
                "execution_id": result.execution_id,
                "agent_id": result.agent_id,
                "mission_id": result.mission_id,
                "task_id": result.task_id,
                "capability_id": result.capability_id,
                "status": result.status,
                "error": result.error,
            },
        )
        return result

    def _validate_agent(self, agent_id: str) -> None:
        if self.agent_registry is None:
            return
        self.agent_registry.get_agent(agent_id)

    def _validate_mission(self, mission_id: str) -> None:
        if self.mission_engine is None:
            return
        self.mission_engine.get_mission(mission_id)

    def _publish(self, *, name: str, payload: dict[str, Any]) -> None:
        if self.event_bus is None:
            return
        self.event_bus.publish(
            Event(
                type=EventType.DOMAIN,
                source=self.source or self.default_event_source,
                payload={"event_name": name, **payload},
            )
        )
