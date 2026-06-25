"""In-memory tool registry for the CommandCore kernel."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from commandcore.events import Event, EventType, InMemoryEventBus

from .models import ToolDefinition, ToolPermission, ToolRuntimeStatus


@dataclass(slots=True)
class InMemoryToolRegistry:
    """Store in-memory tool definitions and publish registry events."""

    _tools: dict[str, ToolDefinition] = field(default_factory=dict)
    event_bus: InMemoryEventBus | None = None
    source: str | None = None

    default_event_source: str = "commandcore.tools.registry"

    def register_tool(
        self,
        *,
        tool: ToolDefinition | None = None,
        tool_id: str | None = None,
        name: str,
        description: str,
        capability_id: str | None = None,
        agent_id: str | None = None,
        input_schema: dict[str, Any] | None = None,
        output_schema: dict[str, Any] | None = None,
        permission_level: ToolPermission = ToolPermission.SAFE,
    ) -> ToolDefinition:
        """Register one tool definition."""

        if tool is None:
            tool = ToolDefinition(
                id=tool_id or ToolDefinition(name=name, description=description).id,
                name=name,
                description=description,
                capability_id=capability_id,
                agent_id=agent_id,
                input_schema=dict(input_schema or {}),
                output_schema=dict(output_schema or {}),
                permission_level=permission_level,
                status=ToolRuntimeStatus.REGISTERED,
            )

        if tool.id in self._tools:
            raise ValueError(f"Tool ID already registered: {tool.id}")

        self._tools[tool.id] = tool
        self._publish(
            name="ToolRegistered",
            payload={
                "tool_id": tool.id,
                "tool_name": tool.name,
                "capability_id": tool.capability_id,
                "agent_id": tool.agent_id,
                "permission_level": tool.permission_level.value,
                "status": tool.status.value,
            },
        )
        return tool

    def get_tool(self, tool_id: str) -> ToolDefinition:
        """Return one tool definition by ID."""

        try:
            return self._tools[tool_id]
        except KeyError as exc:
            raise KeyError(f"Tool ID not found: {tool_id}") from exc

    def list_tools(self) -> list[ToolDefinition]:
        """Return all tools in insertion order."""

        return list(self._tools.values())

    def remove_tool(self, tool_id: str) -> ToolDefinition:
        """Remove and return one tool definition."""

        try:
            return self._tools.pop(tool_id)
        except KeyError as exc:
            raise KeyError(f"Tool ID not found: {tool_id}") from exc

    def find_by_capability(self, capability_id: str) -> list[ToolDefinition]:
        """Return all tools that advertise one capability."""

        return [tool for tool in self._tools.values() if tool.capability_id == capability_id]

    def find_by_agent(self, agent_id: str) -> list[ToolDefinition]:
        """Return all tools associated with one agent."""

        return [tool for tool in self._tools.values() if tool.agent_id == agent_id]

    def find_by_permission(
        self,
        permission_level: ToolPermission,
    ) -> list[ToolDefinition]:
        """Return all tools matching one permission level."""

        return [
            tool
            for tool in self._tools.values()
            if tool.permission_level == permission_level
        ]

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
