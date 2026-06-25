"""In-memory agent runtime foundation for the CommandCore kernel."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from commandcore.events import Event, EventType, InMemoryEventBus

from .models import (
    AgentAssignment,
    AgentExecution,
    AgentRuntimeResult,
)

if TYPE_CHECKING:
    from commandcore.registries import AgentRegistry


@dataclass(slots=True)
class InMemoryAgentRuntime:
    """Track agent assignments and executions inside one process."""

    _assignments: dict[str, AgentAssignment] = field(default_factory=dict)
    _executions: dict[str, AgentExecution] = field(default_factory=dict)
    event_bus: InMemoryEventBus | None = None
    agent_registry: "AgentRegistry | None" = None
    source: str | None = None

    default_event_source: str = "commandcore.agents.runtime"

    def assign_agent(
        self,
        *,
        assignment: AgentAssignment | None = None,
        assignment_id: str | None = None,
        agent_id: str,
        mission_id: str | None = None,
        task_id: str | None = None,
        capability_id: str | None = None,
        input_payload: dict[str, Any] | None = None,
    ) -> AgentAssignment:
        """Create one agent assignment record."""

        self._validate_agent(agent_id)
        if assignment is None:
            assignment = AgentAssignment(
                id=assignment_id or AgentAssignment(agent_id=agent_id, status="assigned").id,
                agent_id=agent_id,
                mission_id=mission_id,
                task_id=task_id,
                capability_id=capability_id,
                status="assigned",
                input_payload=dict(input_payload or {}),
            )

        if assignment.id in self._assignments:
            raise ValueError(f"Agent assignment ID already registered: {assignment.id}")

        self._assignments[assignment.id] = assignment
        self._publish(
            name="AgentAssigned",
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

    def get_assignment(self, assignment_id: str) -> AgentAssignment:
        """Return one assignment by ID."""

        try:
            return self._assignments[assignment_id]
        except KeyError as exc:
            raise KeyError(f"Agent assignment ID not found: {assignment_id}") from exc

    def list_assignments(self) -> list[AgentAssignment]:
        """Return assignments in insertion order."""

        return list(self._assignments.values())

    def start_execution(
        self,
        assignment_id: str,
        *,
        execution: AgentExecution | None = None,
        execution_id: str | None = None,
        input_payload: dict[str, Any] | None = None,
    ) -> AgentExecution:
        """Start one execution for a known assignment."""

        assignment = self.get_assignment(assignment_id)
        if execution is None:
            execution = AgentExecution(
                id=execution_id
                or AgentExecution(agent_id=assignment.agent_id, status="running").id,
                agent_id=assignment.agent_id,
                mission_id=assignment.mission_id,
                task_id=assignment.task_id,
                capability_id=assignment.capability_id,
                assignment_id=assignment.id,
                status="running",
                input_payload=dict(input_payload or assignment.input_payload),
            )

        if execution.id in self._executions:
            raise ValueError(f"Agent execution ID already registered: {execution.id}")

        self._executions[execution.id] = execution
        self._assignments[assignment.id] = assignment.model_copy(
            update={"status": "running", "updated_at": execution.updated_at}
        )
        self._publish(
            name="AgentExecutionStarted",
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

    def complete_execution(
        self,
        execution_id: str,
        *,
        output_payload: dict[str, Any] | None = None,
    ) -> AgentRuntimeResult:
        """Mark one execution completed and return its terminal result."""

        execution = self.get_execution(execution_id)
        updated = execution.model_copy(
            update={
                "status": "completed",
                "output_payload": dict(output_payload or {}),
                "error": None,
            }
        )
        self._executions[execution_id] = updated
        self._update_assignment_status(updated.assignment_id, "completed")
        self._publish(
            name="AgentExecutionCompleted",
            payload={
                "execution_id": updated.id,
                "assignment_id": updated.assignment_id,
                "agent_id": updated.agent_id,
                "mission_id": updated.mission_id,
                "task_id": updated.task_id,
                "capability_id": updated.capability_id,
                "status": updated.status,
            },
        )
        return AgentRuntimeResult(
            agent_id=updated.agent_id,
            mission_id=updated.mission_id,
            task_id=updated.task_id,
            capability_id=updated.capability_id,
            execution_id=updated.id,
            status=updated.status,
            input_payload=dict(updated.input_payload),
            output_payload=dict(updated.output_payload),
        )

    def fail_execution(
        self,
        execution_id: str,
        *,
        error: str,
        output_payload: dict[str, Any] | None = None,
    ) -> AgentRuntimeResult:
        """Mark one execution failed and return its terminal result."""

        execution = self.get_execution(execution_id)
        updated = execution.model_copy(
            update={
                "status": "failed",
                "output_payload": dict(output_payload or {}),
                "error": error,
            }
        )
        self._executions[execution_id] = updated
        self._update_assignment_status(updated.assignment_id, "failed", error=error)
        self._publish(
            name="AgentExecutionFailed",
            payload={
                "execution_id": updated.id,
                "assignment_id": updated.assignment_id,
                "agent_id": updated.agent_id,
                "mission_id": updated.mission_id,
                "task_id": updated.task_id,
                "capability_id": updated.capability_id,
                "status": updated.status,
                "error": error,
            },
        )
        return AgentRuntimeResult(
            agent_id=updated.agent_id,
            mission_id=updated.mission_id,
            task_id=updated.task_id,
            capability_id=updated.capability_id,
            execution_id=updated.id,
            status=updated.status,
            input_payload=dict(updated.input_payload),
            output_payload=dict(updated.output_payload),
            error=updated.error,
        )

    def get_execution(self, execution_id: str) -> AgentExecution:
        """Return one execution by ID."""

        try:
            return self._executions[execution_id]
        except KeyError as exc:
            raise KeyError(f"Agent execution ID not found: {execution_id}") from exc

    def list_executions(self) -> list[AgentExecution]:
        """Return executions in insertion order."""

        return list(self._executions.values())

    def list_executions_for_agent(self, agent_id: str) -> list[AgentExecution]:
        """Return executions for one agent."""

        return [
            execution
            for execution in self._executions.values()
            if execution.agent_id == agent_id
        ]

    def list_executions_for_mission(self, mission_id: str) -> list[AgentExecution]:
        """Return executions for one mission."""

        return [
            execution
            for execution in self._executions.values()
            if execution.mission_id == mission_id
        ]

    def _update_assignment_status(
        self,
        assignment_id: str | None,
        status: str,
        *,
        error: str | None = None,
    ) -> None:
        if assignment_id is None:
            return
        assignment = self.get_assignment(assignment_id)
        self._assignments[assignment_id] = assignment.model_copy(
            update={"status": status, "error": error}
        )

    def _validate_agent(self, agent_id: str) -> None:
        if self.agent_registry is None:
            return
        self.agent_registry.get_agent(agent_id)

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
