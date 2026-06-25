"""Read-only agent dashboard services for CommandCore."""

from __future__ import annotations

from dataclasses import dataclass

from commandcore.agents import InMemoryAgentRuntime
from commandcore.audit import InMemoryAuditTrail
from commandcore.registries import AgentRegistry

AGENT_ACTIVITY_EVENTS = {
    "AgentAssigned",
    "AgentExecutionStarted",
    "AgentExecutionCompleted",
    "AgentExecutionFailed",
}


@dataclass(slots=True)
class AgentDashboardService:
    """Read-only dashboard over agent registry and runtime state."""

    agent_registry: AgentRegistry
    agent_runtime: InMemoryAgentRuntime
    audit_trail: InMemoryAuditTrail

    def agent_counts(self) -> dict[str, int]:
        agents = self.agent_registry.list_agents()
        return {
            "total": len(agents),
            "available": len(
                [agent for agent in agents if str(agent.runtime_status) == "available"]
            ),
            "busy": len(
                [agent for agent in agents if str(agent.runtime_status) == "busy"]
            ),
            "offline": len(
                [agent for agent in agents if str(agent.runtime_status) == "offline"]
            ),
        }

    def assignment_counts(self) -> dict[str, int]:
        assignments = self.agent_runtime.list_assignments()
        return {
            "total": len(assignments),
            "assigned": len([item for item in assignments if item.status == "assigned"]),
            "running": len([item for item in assignments if item.status == "running"]),
            "completed": len([item for item in assignments if item.status == "completed"]),
            "failed": len([item for item in assignments if item.status == "failed"]),
        }

    def execution_counts(self) -> dict[str, int]:
        executions = self.agent_runtime.list_executions()
        return {
            "total": len(executions),
            "running": len([item for item in executions if item.status == "running"]),
            "completed": len([item for item in executions if item.status == "completed"]),
            "failed": len([item for item in executions if item.status == "failed"]),
        }

    def active_executions(self) -> list[dict[str, object]]:
        return [
            self._serialize_execution(execution)
            for execution in self.agent_runtime.list_executions()
            if execution.status == "running"
        ]

    def completed_executions(self) -> list[dict[str, object]]:
        return [
            self._serialize_execution(execution)
            for execution in self.agent_runtime.list_executions()
            if execution.status == "completed"
        ]

    def failed_executions(self) -> list[dict[str, object]]:
        return [
            self._serialize_execution(execution)
            for execution in self.agent_runtime.list_executions()
            if execution.status == "failed"
        ]

    def recent_agent_activity(self, limit: int = 10) -> list[dict[str, object]]:
        events = [
            self._serialize_event(event)
            for event in self.audit_trail.list_entries()
            if event.payload.get("event_name") in AGENT_ACTIVITY_EVENTS
        ]
        return events[-limit:]

    def build_dashboard(self) -> dict[str, object]:
        return {
            "agent_counts": self.agent_counts(),
            "assignment_counts": self.assignment_counts(),
            "execution_counts": self.execution_counts(),
            "active_executions": self.active_executions(),
            "completed_executions": self.completed_executions(),
            "failed_executions": self.failed_executions(),
            "recent_agent_activity": self.recent_agent_activity(),
        }

    @staticmethod
    def _serialize_execution(execution: object) -> dict[str, object]:
        return {
            "execution_id": getattr(execution, "id"),
            "assignment_id": getattr(execution, "assignment_id"),
            "agent_id": getattr(execution, "agent_id"),
            "mission_id": getattr(execution, "mission_id"),
            "task_id": getattr(execution, "task_id"),
            "capability_id": getattr(execution, "capability_id"),
            "status": getattr(execution, "status"),
            "error": getattr(execution, "error"),
            "input_payload": dict(getattr(execution, "input_payload")),
            "output_payload": dict(getattr(execution, "output_payload")),
        }

    @staticmethod
    def _serialize_event(event: object) -> dict[str, object]:
        return {
            "event_id": getattr(event, "id"),
            "event_name": getattr(event, "payload").get("event_name"),
            "event_type": getattr(event, "type"),
            "source": getattr(event, "source"),
            "occurred_at": getattr(event, "occurred_at"),
            "payload": dict(getattr(event, "payload")),
        }
