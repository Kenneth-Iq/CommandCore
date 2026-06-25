from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.audit import InMemoryAuditTrail, attach_audit_trail
from commandcore.events import InMemoryEventBus
from commandcore.eventstore import InMemoryEventStore
from commandcore.tools import (
    InMemoryToolRegistry,
    InMemoryToolRuntime,
    ToolPermission,
    ToolRuntimeStatus,
)


def test_tool_runtime_tracks_invocation_lifecycle_and_publishes_events():
    event_store = InMemoryEventStore()
    event_bus = InMemoryEventBus(event_store=event_store)
    audit_trail = attach_audit_trail(event_bus, InMemoryAuditTrail())
    registry = InMemoryToolRegistry(event_bus=event_bus)
    runtime = InMemoryToolRuntime(tool_registry=registry, event_bus=event_bus)

    tool = registry.register_tool(
        tool_id="tool-1",
        name="Knowledge Search",
        description="Search knowledge assets.",
        capability_id="cap-search",
        agent_id="agent-hermes",
        permission_level=ToolPermission.SAFE,
    )

    invocation = runtime.create_invocation(
        tool.id,
        invocation_id="invoke-1",
        input_payload={"query": "launch runbook"},
    )
    started = runtime.start_invocation(invocation.id)
    result = runtime.complete_invocation(
        started.id,
        output_payload={"matches": 3},
    )

    assert runtime.get_invocation("invoke-1").status == ToolRuntimeStatus.COMPLETED
    assert runtime.list_invocations()[-1].status == ToolRuntimeStatus.COMPLETED
    assert runtime.list_invocations_for_tool(tool.id)[0].id == "invoke-1"
    assert runtime.list_invocations_for_agent("agent-hermes")[0].id == "invoke-1"
    assert result.status == ToolRuntimeStatus.COMPLETED
    assert result.output_payload == {"matches": 3}

    event_names = [event.payload["event_name"] for event in event_bus.list_events()]
    assert event_names == [
        "ToolRegistered",
        "ToolInvocationCreated",
        "ToolInvocationStarted",
        "ToolInvocationCompleted",
    ]
    assert [stored.event for stored in event_store.read_all()] == event_bus.list_events()
    assert audit_trail.list_entries() == event_bus.list_events()


def test_tool_runtime_can_fail_invocation():
    registry = InMemoryToolRegistry()
    runtime = InMemoryToolRuntime(tool_registry=registry)
    tool = registry.register_tool(
        tool_id="tool-1",
        name="Mission Planner",
        description="Prepare mission plans.",
        permission_level=ToolPermission.RESTRICTED,
    )

    invocation = runtime.create_invocation(tool.id, invocation_id="invoke-1")
    runtime.start_invocation(invocation.id)
    result = runtime.fail_invocation(
        invocation.id,
        error="Execution disabled in in-memory foundation.",
    )

    assert runtime.get_invocation(invocation.id).status == ToolRuntimeStatus.FAILED
    assert result.status == ToolRuntimeStatus.FAILED
    assert result.error == "Execution disabled in in-memory foundation."
