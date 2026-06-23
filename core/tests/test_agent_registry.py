from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.contracts import (
    Agent,
    AgentRuntimeStatus,
    Ownership,
    OwnershipKind,
    PermissionLevel,
    Status,
)
from commandcore.registries.agent_registry import (
    AgentNotFoundError,
    AgentRegistry,
    DuplicateAgentIdError,
)


def make_ownership() -> Ownership:
    return Ownership(
        kind=OwnershipKind.DOMAIN,
        reference="commandcore.architecture",
        display_name="CommandCore Architecture",
    )


def make_agent(
    agent_id: str,
    *,
    name: str = "Hermes Worker",
    status: Status = Status.ACTIVE,
    runtime_status: AgentRuntimeStatus = AgentRuntimeStatus.AVAILABLE,
    capability_ids: list[str] | None = None,
) -> Agent:
    return Agent(
        id=agent_id,
        name=name,
        role="engineering",
        status=status,
        ownership=make_ownership(),
        runtime_status=runtime_status,
        permission_level=PermissionLevel.OPERATE,
        capability_ids=capability_ids or [],
    )


def test_register_and_get_agent():
    registry = AgentRegistry()
    agent = make_agent("agent-hermes")

    registry.register_agent(agent)

    assert registry.get_agent("agent-hermes") == agent


def test_register_duplicate_agent_id_raises():
    registry = AgentRegistry()
    agent = make_agent("agent-hermes")
    registry.register_agent(agent)

    with pytest.raises(DuplicateAgentIdError):
        registry.register_agent(agent)


def test_get_missing_agent_raises():
    registry = AgentRegistry()

    with pytest.raises(AgentNotFoundError):
        registry.get_agent("missing-agent")


def test_list_agents_returns_registered_values():
    registry = AgentRegistry()
    agent_a = make_agent("agent-hermes")
    agent_b = make_agent("agent-athena", name="Athena Worker")

    registry.register_agent(agent_a)
    registry.register_agent(agent_b)

    assert registry.list_agents() == [agent_a, agent_b]


def test_find_by_name_is_case_insensitive():
    registry = AgentRegistry()
    agent = make_agent("agent-hermes", name="Hermes Worker")
    registry.register_agent(agent)

    results = registry.find_by_name("hermes worker")

    assert results == [agent]


def test_find_by_status_filters_agents():
    registry = AgentRegistry()
    active_agent = make_agent("agent-active", status=Status.ACTIVE)
    blocked_agent = make_agent("agent-blocked", status=Status.BLOCKED)
    registry.register_agent(active_agent)
    registry.register_agent(blocked_agent)

    results = registry.find_by_status(Status.BLOCKED)

    assert results == [blocked_agent]


def test_find_by_runtime_status_filters_agents():
    registry = AgentRegistry()
    available_agent = make_agent(
        "agent-available", runtime_status=AgentRuntimeStatus.AVAILABLE
    )
    offline_agent = make_agent(
        "agent-offline", runtime_status=AgentRuntimeStatus.OFFLINE
    )
    registry.register_agent(available_agent)
    registry.register_agent(offline_agent)

    results = registry.find_by_runtime_status(AgentRuntimeStatus.OFFLINE)

    assert results == [offline_agent]


def test_find_by_capability_filters_agents():
    registry = AgentRegistry()
    capable_agent = make_agent(
        "agent-hermes", capability_ids=["cap-agent-task-interface"]
    )
    other_agent = make_agent("agent-athena", capability_ids=["cap-ops-review"])
    registry.register_agent(capable_agent)
    registry.register_agent(other_agent)

    results = registry.find_by_capability("cap-agent-task-interface")

    assert results == [capable_agent]


def test_add_capability_updates_agent_without_duplicates():
    registry = AgentRegistry()
    agent = make_agent("agent-hermes", capability_ids=["cap-search"])
    registry.register_agent(agent)

    updated = registry.add_capability("agent-hermes", "cap-agent-task-interface")
    registry.add_capability("agent-hermes", "cap-agent-task-interface")

    assert updated.capability_ids == ["cap-search", "cap-agent-task-interface"]
    assert registry.get_agent("agent-hermes").capability_ids == [
        "cap-search",
        "cap-agent-task-interface",
    ]


def test_remove_capability_updates_agent():
    registry = AgentRegistry()
    agent = make_agent(
        "agent-hermes",
        capability_ids=["cap-search", "cap-agent-task-interface"],
    )
    registry.register_agent(agent)

    updated = registry.remove_capability("agent-hermes", "cap-search")

    assert updated.capability_ids == ["cap-agent-task-interface"]
    assert registry.get_agent("agent-hermes").capability_ids == [
        "cap-agent-task-interface"
    ]


def test_capability_operations_raise_for_missing_agent():
    registry = AgentRegistry()

    with pytest.raises(AgentNotFoundError):
        registry.add_capability("missing-agent", "cap-search")

    with pytest.raises(AgentNotFoundError):
        registry.remove_capability("missing-agent", "cap-search")
