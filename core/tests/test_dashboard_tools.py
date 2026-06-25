from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.bootstrap import create_in_memory_kernel
from commandcore.dashboard import ToolDashboardService
from commandcore.tools import ToolPermission


def test_tool_dashboard_service_summarises_registry_and_runtime_state():
    kernel = create_in_memory_kernel()

    safe_tool = kernel.tool_registry.register_tool(
        tool_id="tool-safe",
        name="Knowledge Search",
        description="Search knowledge assets.",
        permission_level=ToolPermission.SAFE,
        agent_id="agent-hermes",
    )
    restricted_tool = kernel.tool_registry.register_tool(
        tool_id="tool-restricted",
        name="Mission Planner",
        description="Prepare mission plans.",
        permission_level=ToolPermission.RESTRICTED,
        agent_id="agent-claw",
    )

    running = kernel.tool_runtime.create_invocation(
        safe_tool.id,
        invocation_id="invoke-running",
        input_payload={"query": "alpha"},
    )
    kernel.tool_runtime.start_invocation(running.id)

    completed = kernel.tool_runtime.create_invocation(
        safe_tool.id,
        invocation_id="invoke-completed",
        input_payload={"query": "beta"},
    )
    kernel.tool_runtime.start_invocation(completed.id)
    kernel.tool_runtime.complete_invocation(
        completed.id,
        output_payload={"matches": 2},
    )

    failed = kernel.tool_runtime.create_invocation(
        restricted_tool.id,
        invocation_id="invoke-failed",
    )
    kernel.tool_runtime.start_invocation(failed.id)
    kernel.tool_runtime.fail_invocation(
        failed.id,
        error="Execution disabled in in-memory foundation.",
    )

    dashboard = ToolDashboardService(
        tool_registry=kernel.tool_registry,
        tool_runtime=kernel.tool_runtime,
        audit_trail=kernel.audit_trail,
    ).build_dashboard()

    assert dashboard["tool_counts"] == {"total": 2, "registered": 2}
    assert dashboard["invocation_counts"] == {
        "total": 3,
        "pending": 0,
        "running": 1,
        "completed": 1,
        "failed": 1,
    }
    assert dashboard["tools_by_permission"] == {"safe": 1, "restricted": 1}
    assert dashboard["active_invocations"][0]["invocation_id"] == "invoke-running"
    assert dashboard["completed_invocations"][0]["invocation_id"] == "invoke-completed"
    assert dashboard["failed_invocations"][0]["invocation_id"] == "invoke-failed"
    assert any(
        event["event_name"] == "ToolInvocationFailed"
        for event in dashboard["recent_tool_activity"]
    )
