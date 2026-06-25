"""In-memory tool runtime foundation for the CommandCore kernel."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from commandcore.events import Event, EventType, InMemoryEventBus

from .models import ToolInvocation, ToolRuntimeResult, ToolRuntimeStatus
from .registry import InMemoryToolRegistry


@dataclass(slots=True)
class InMemoryToolRuntime:
    """Track tool invocations inside one process."""

    _invocations: dict[str, ToolInvocation] = field(default_factory=dict)
    tool_registry: InMemoryToolRegistry | None = None
    event_bus: InMemoryEventBus | None = None
    source: str | None = None

    default_event_source: str = "commandcore.tools.runtime"

    def create_invocation(
        self,
        tool_id: str,
        *,
        invocation: ToolInvocation | None = None,
        invocation_id: str | None = None,
        agent_id: str | None = None,
        input_payload: dict[str, Any] | None = None,
    ) -> ToolInvocation:
        """Create one invocation record for a known tool."""

        tool = self._get_registered_tool(tool_id)
        if invocation is None:
            invocation = ToolInvocation(
                id=invocation_id or ToolInvocation(tool_id=tool.id).id,
                tool_id=tool.id,
                capability_id=tool.capability_id,
                agent_id=agent_id or tool.agent_id,
                permission_level=tool.permission_level,
                status=ToolRuntimeStatus.PENDING,
                input_payload=dict(input_payload or {}),
            )

        if invocation.id in self._invocations:
            raise ValueError(f"Tool invocation ID already registered: {invocation.id}")

        self._invocations[invocation.id] = invocation
        self._publish(
            name="ToolInvocationCreated",
            payload={
                "invocation_id": invocation.id,
                "tool_id": invocation.tool_id,
                "tool_name": tool.name,
                "capability_id": invocation.capability_id,
                "agent_id": invocation.agent_id,
                "permission_level": invocation.permission_level.value,
                "status": invocation.status.value,
            },
        )
        return invocation

    def get_invocation(self, invocation_id: str) -> ToolInvocation:
        """Return one invocation by ID."""

        try:
            return self._invocations[invocation_id]
        except KeyError as exc:
            raise KeyError(f"Tool invocation ID not found: {invocation_id}") from exc

    def list_invocations(self) -> list[ToolInvocation]:
        """Return invocations in insertion order."""

        return list(self._invocations.values())

    def start_invocation(self, invocation_id: str) -> ToolInvocation:
        """Mark one invocation as running."""

        invocation = self.get_invocation(invocation_id)
        updated = invocation.model_copy(update={"status": ToolRuntimeStatus.RUNNING})
        self._invocations[invocation_id] = updated
        tool = self._get_registered_tool(updated.tool_id)
        self._publish(
            name="ToolInvocationStarted",
            payload={
                "invocation_id": updated.id,
                "tool_id": updated.tool_id,
                "tool_name": tool.name,
                "capability_id": updated.capability_id,
                "agent_id": updated.agent_id,
                "permission_level": updated.permission_level.value,
                "status": updated.status.value,
            },
        )
        return updated

    def complete_invocation(
        self,
        invocation_id: str,
        *,
        output_payload: dict[str, Any] | None = None,
    ) -> ToolRuntimeResult:
        """Mark one invocation completed and return its terminal result."""

        invocation = self.get_invocation(invocation_id)
        updated = invocation.model_copy(
            update={
                "status": ToolRuntimeStatus.COMPLETED,
                "output_payload": dict(output_payload or {}),
                "error": None,
            }
        )
        self._invocations[invocation_id] = updated
        tool = self._get_registered_tool(updated.tool_id)
        self._publish(
            name="ToolInvocationCompleted",
            payload={
                "invocation_id": updated.id,
                "tool_id": updated.tool_id,
                "tool_name": tool.name,
                "capability_id": updated.capability_id,
                "agent_id": updated.agent_id,
                "permission_level": updated.permission_level.value,
                "status": updated.status.value,
            },
        )
        return ToolRuntimeResult(
            tool_id=updated.tool_id,
            capability_id=updated.capability_id,
            agent_id=updated.agent_id,
            invocation_id=updated.id,
            permission_level=updated.permission_level,
            status=updated.status,
            input_payload=dict(updated.input_payload),
            output_payload=dict(updated.output_payload),
        )

    def fail_invocation(
        self,
        invocation_id: str,
        *,
        error: str,
        output_payload: dict[str, Any] | None = None,
    ) -> ToolRuntimeResult:
        """Mark one invocation failed and return its terminal result."""

        invocation = self.get_invocation(invocation_id)
        updated = invocation.model_copy(
            update={
                "status": ToolRuntimeStatus.FAILED,
                "output_payload": dict(output_payload or {}),
                "error": error,
            }
        )
        self._invocations[invocation_id] = updated
        tool = self._get_registered_tool(updated.tool_id)
        self._publish(
            name="ToolInvocationFailed",
            payload={
                "invocation_id": updated.id,
                "tool_id": updated.tool_id,
                "tool_name": tool.name,
                "capability_id": updated.capability_id,
                "agent_id": updated.agent_id,
                "permission_level": updated.permission_level.value,
                "status": updated.status.value,
                "error": error,
            },
        )
        return ToolRuntimeResult(
            tool_id=updated.tool_id,
            capability_id=updated.capability_id,
            agent_id=updated.agent_id,
            invocation_id=updated.id,
            permission_level=updated.permission_level,
            status=updated.status,
            input_payload=dict(updated.input_payload),
            output_payload=dict(updated.output_payload),
            error=updated.error,
        )

    def list_invocations_for_tool(self, tool_id: str) -> list[ToolInvocation]:
        """Return invocations for one tool."""

        return [
            invocation
            for invocation in self._invocations.values()
            if invocation.tool_id == tool_id
        ]

    def list_invocations_for_agent(self, agent_id: str) -> list[ToolInvocation]:
        """Return invocations for one agent."""

        return [
            invocation
            for invocation in self._invocations.values()
            if invocation.agent_id == agent_id
        ]

    def _get_registered_tool(self, tool_id: str):
        if self.tool_registry is None:
            raise ValueError("Tool runtime requires a tool registry.")
        return self.tool_registry.get_tool(tool_id)

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
