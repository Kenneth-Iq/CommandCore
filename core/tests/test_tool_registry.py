from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.events import InMemoryEventBus
from commandcore.eventstore import InMemoryEventStore
from commandcore.tools import InMemoryToolRegistry, ToolPermission


def test_tool_registry_registers_and_finds_tools():
    event_store = InMemoryEventStore()
    event_bus = InMemoryEventBus(event_store=event_store)
    registry = InMemoryToolRegistry(event_bus=event_bus)

    safe_tool = registry.register_tool(
        tool_id="tool-safe",
        name="Local Search",
        description="Search local indexed data.",
        capability_id="cap-search",
        agent_id="agent-hermes",
        permission_level=ToolPermission.SAFE,
    )
    restricted_tool = registry.register_tool(
        tool_id="tool-restricted",
        name="Connector Lookup",
        description="Inspect connector metadata.",
        capability_id="cap-connectors",
        agent_id="agent-claw",
        permission_level=ToolPermission.RESTRICTED,
    )

    assert registry.get_tool("tool-safe") == safe_tool
    assert registry.list_tools() == [safe_tool, restricted_tool]
    assert registry.find_by_capability("cap-search") == [safe_tool]
    assert registry.find_by_agent("agent-claw") == [restricted_tool]
    assert registry.find_by_permission(ToolPermission.SAFE) == [safe_tool]

    event_names = [event.payload["event_name"] for event in event_bus.list_events()]
    assert event_names == ["ToolRegistered", "ToolRegistered"]
    assert [stored.event for stored in event_store.read_all()] == event_bus.list_events()


def test_tool_registry_remove_tool_returns_removed_definition():
    registry = InMemoryToolRegistry()
    tool = registry.register_tool(
        tool_id="tool-1",
        name="Planner",
        description="Prepare execution plans.",
    )

    removed = registry.remove_tool(tool.id)

    assert removed == tool
    assert registry.list_tools() == []
