"""Read-only tool dashboard services for CommandCore."""

from __future__ import annotations

from dataclasses import dataclass

from commandcore.audit import InMemoryAuditTrail

from .serializers import serialize_event
from commandcore.tools import InMemoryToolRegistry, InMemoryToolRuntime, ToolRuntimeStatus

TOOL_ACTIVITY_EVENTS = {
    "ToolRegistered",
    "ToolInvocationCreated",
    "ToolInvocationStarted",
    "ToolInvocationCompleted",
    "ToolInvocationFailed",
}


@dataclass(slots=True)
class ToolDashboardService:
    """Read-only dashboard over tool registry and runtime state."""

    tool_registry: InMemoryToolRegistry
    tool_runtime: InMemoryToolRuntime
    audit_trail: InMemoryAuditTrail

    def tool_counts(self) -> dict[str, int]:
        tools = self.tool_registry.list_tools()
        return {
            "total": len(tools),
            "registered": len(
                [tool for tool in tools if tool.status == ToolRuntimeStatus.REGISTERED]
            ),
        }

    def invocation_counts(self) -> dict[str, int]:
        invocations = self.tool_runtime.list_invocations()
        return {
            "total": len(invocations),
            "pending": len(
                [item for item in invocations if item.status == ToolRuntimeStatus.PENDING]
            ),
            "running": len(
                [item for item in invocations if item.status == ToolRuntimeStatus.RUNNING]
            ),
            "completed": len(
                [item for item in invocations if item.status == ToolRuntimeStatus.COMPLETED]
            ),
            "failed": len(
                [item for item in invocations if item.status == ToolRuntimeStatus.FAILED]
            ),
        }

    def active_invocations(self) -> list[dict[str, object]]:
        return [
            self._serialize_invocation(invocation)
            for invocation in self.tool_runtime.list_invocations()
            if invocation.status == ToolRuntimeStatus.RUNNING
        ]

    def completed_invocations(self) -> list[dict[str, object]]:
        return [
            self._serialize_invocation(invocation)
            for invocation in self.tool_runtime.list_invocations()
            if invocation.status == ToolRuntimeStatus.COMPLETED
        ]

    def failed_invocations(self) -> list[dict[str, object]]:
        return [
            self._serialize_invocation(invocation)
            for invocation in self.tool_runtime.list_invocations()
            if invocation.status == ToolRuntimeStatus.FAILED
        ]

    def tools_by_permission(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for tool in self.tool_registry.list_tools():
            key = tool.permission_level.value
            counts[key] = counts.get(key, 0) + 1
        return counts

    def tools(self) -> list[dict[str, object]]:
        return [self._serialize_tool(tool) for tool in self.tool_registry.list_tools()]

    def recent_tool_activity(self, limit: int = 10) -> list[dict[str, object]]:
        events = [
            serialize_event(event)
            for event in self.audit_trail.list_entries()
            if event.payload.get("event_name") in TOOL_ACTIVITY_EVENTS
        ]
        return events[-limit:]

    def build_dashboard(self) -> dict[str, object]:
        return {
            "tool_counts": self.tool_counts(),
            "invocation_counts": self.invocation_counts(),
            "active_invocations": self.active_invocations(),
            "completed_invocations": self.completed_invocations(),
            "failed_invocations": self.failed_invocations(),
            "tools_by_permission": self.tools_by_permission(),
            "tools": self.tools(),
            "recent_tool_activity": self.recent_tool_activity(),
        }

    @staticmethod
    def _serialize_tool(tool: object) -> dict[str, object]:
        return {
            "tool_id": getattr(tool, "id"),
            "name": getattr(tool, "name"),
            "description": getattr(tool, "description"),
            "capability_id": getattr(tool, "capability_id"),
            "agent_id": getattr(tool, "agent_id"),
            "permission_level": getattr(tool, "permission_level").value,
            "status": getattr(tool, "status").value,
        }

    @staticmethod
    def _serialize_invocation(invocation: object) -> dict[str, object]:
        return {
            "invocation_id": getattr(invocation, "id"),
            "tool_id": getattr(invocation, "tool_id"),
            "capability_id": getattr(invocation, "capability_id"),
            "agent_id": getattr(invocation, "agent_id"),
            "permission_level": getattr(invocation, "permission_level").value,
            "status": getattr(invocation, "status").value,
            "error": getattr(invocation, "error"),
            "input_payload": dict(getattr(invocation, "input_payload")),
            "output_payload": dict(getattr(invocation, "output_payload")),
        }

