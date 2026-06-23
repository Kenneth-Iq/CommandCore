from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.contracts import Ownership, OwnershipKind, Status, Workspace
from commandcore.registries.workspace_registry import (
    DuplicateWorkspaceIdError,
    WorkspaceNotFoundError,
    WorkspaceRegistry,
)


def make_ownership() -> Ownership:
    return Ownership(
        kind=OwnershipKind.DOMAIN,
        reference="commandcore.architecture",
        display_name="CommandCore Architecture",
    )


def make_workspace(
    workspace_id: str,
    *,
    name: str = "CommandCore Local Workspace",
    status: Status = Status.ACTIVE,
    company_ids: list[str] | None = None,
    project_ids: list[str] | None = None,
    agent_ids: list[str] | None = None,
    capability_ids: list[str] | None = None,
) -> Workspace:
    return Workspace(
        id=workspace_id,
        name=name,
        status=status,
        ownership=make_ownership(),
        company_ids=company_ids or [],
        project_ids=project_ids or [],
        agent_ids=agent_ids or [],
        capability_ids=capability_ids or [],
    )


def test_register_and_get_workspace():
    registry = WorkspaceRegistry()
    workspace = make_workspace("ws-1")

    registry.register_workspace(workspace)

    assert registry.get_workspace("ws-1") == workspace


def test_register_duplicate_workspace_id_raises():
    registry = WorkspaceRegistry()
    workspace = make_workspace("ws-1")
    registry.register_workspace(workspace)

    with pytest.raises(DuplicateWorkspaceIdError):
        registry.register_workspace(workspace)


def test_get_missing_workspace_raises():
    registry = WorkspaceRegistry()

    with pytest.raises(WorkspaceNotFoundError):
        registry.get_workspace("missing-workspace")


def test_list_workspaces_returns_registered_values():
    registry = WorkspaceRegistry()
    workspace_a = make_workspace("ws-1")
    workspace_b = make_workspace("ws-2", name="Partner Workspace")
    registry.register_workspace(workspace_a)
    registry.register_workspace(workspace_b)

    assert registry.list_workspaces() == [workspace_a, workspace_b]


def test_find_by_name_is_case_insensitive():
    registry = WorkspaceRegistry()
    workspace = make_workspace("ws-1", name="CommandCore Local Workspace")
    registry.register_workspace(workspace)

    results = registry.find_by_name("commandcore local workspace")

    assert results == [workspace]


def test_find_by_status_filters_workspaces():
    registry = WorkspaceRegistry()
    active_workspace = make_workspace("ws-1", status=Status.ACTIVE)
    blocked_workspace = make_workspace("ws-2", name="Blocked", status=Status.BLOCKED)
    registry.register_workspace(active_workspace)
    registry.register_workspace(blocked_workspace)

    results = registry.find_by_status(Status.BLOCKED)

    assert results == [blocked_workspace]


def test_add_company_updates_workspace_without_duplicates():
    registry = WorkspaceRegistry()
    workspace = make_workspace("ws-1", company_ids=["mindx"])
    registry.register_workspace(workspace)

    updated = registry.add_company("ws-1", "tirra")
    registry.add_company("ws-1", "tirra")

    assert updated.company_ids == ["mindx", "tirra"]
    assert registry.get_workspace("ws-1").company_ids == ["mindx", "tirra"]


def test_remove_company_updates_workspace():
    registry = WorkspaceRegistry()
    workspace = make_workspace("ws-1", company_ids=["mindx", "tirra"])
    registry.register_workspace(workspace)

    updated = registry.remove_company("ws-1", "mindx")

    assert updated.company_ids == ["tirra"]
    assert registry.get_workspace("ws-1").company_ids == ["tirra"]


def test_add_project_updates_workspace_without_duplicates():
    registry = WorkspaceRegistry()
    workspace = make_workspace("ws-1", project_ids=["proj-alpha"])
    registry.register_workspace(workspace)

    updated = registry.add_project("ws-1", "proj-beta")
    registry.add_project("ws-1", "proj-beta")

    assert updated.project_ids == ["proj-alpha", "proj-beta"]
    assert registry.get_workspace("ws-1").project_ids == ["proj-alpha", "proj-beta"]


def test_remove_project_updates_workspace():
    registry = WorkspaceRegistry()
    workspace = make_workspace("ws-1", project_ids=["proj-alpha", "proj-beta"])
    registry.register_workspace(workspace)

    updated = registry.remove_project("ws-1", "proj-alpha")

    assert updated.project_ids == ["proj-beta"]
    assert registry.get_workspace("ws-1").project_ids == ["proj-beta"]


def test_add_agent_updates_workspace_without_duplicates():
    registry = WorkspaceRegistry()
    workspace = make_workspace("ws-1", agent_ids=["agent-hermes"])
    registry.register_workspace(workspace)

    updated = registry.add_agent("ws-1", "agent-athena")
    registry.add_agent("ws-1", "agent-athena")

    assert updated.agent_ids == ["agent-hermes", "agent-athena"]
    assert registry.get_workspace("ws-1").agent_ids == [
        "agent-hermes",
        "agent-athena",
    ]


def test_remove_agent_updates_workspace():
    registry = WorkspaceRegistry()
    workspace = make_workspace("ws-1", agent_ids=["agent-hermes", "agent-athena"])
    registry.register_workspace(workspace)

    updated = registry.remove_agent("ws-1", "agent-hermes")

    assert updated.agent_ids == ["agent-athena"]
    assert registry.get_workspace("ws-1").agent_ids == ["agent-athena"]


def test_add_capability_updates_workspace_without_duplicates():
    registry = WorkspaceRegistry()
    workspace = make_workspace("ws-1", capability_ids=["cap-search"])
    registry.register_workspace(workspace)

    updated = registry.add_capability("ws-1", "cap-runbook")
    registry.add_capability("ws-1", "cap-runbook")

    assert updated.capability_ids == ["cap-search", "cap-runbook"]
    assert registry.get_workspace("ws-1").capability_ids == [
        "cap-search",
        "cap-runbook",
    ]


def test_remove_capability_updates_workspace():
    registry = WorkspaceRegistry()
    workspace = make_workspace("ws-1", capability_ids=["cap-search", "cap-runbook"])
    registry.register_workspace(workspace)

    updated = registry.remove_capability("ws-1", "cap-search")

    assert updated.capability_ids == ["cap-runbook"]
    assert registry.get_workspace("ws-1").capability_ids == ["cap-runbook"]


def test_membership_operations_raise_for_missing_workspace():
    registry = WorkspaceRegistry()

    with pytest.raises(WorkspaceNotFoundError):
        registry.add_company("missing-workspace", "mindx")

    with pytest.raises(WorkspaceNotFoundError):
        registry.remove_company("missing-workspace", "mindx")

    with pytest.raises(WorkspaceNotFoundError):
        registry.add_project("missing-workspace", "proj-alpha")

    with pytest.raises(WorkspaceNotFoundError):
        registry.remove_project("missing-workspace", "proj-alpha")

    with pytest.raises(WorkspaceNotFoundError):
        registry.add_agent("missing-workspace", "agent-hermes")

    with pytest.raises(WorkspaceNotFoundError):
        registry.remove_agent("missing-workspace", "agent-hermes")

    with pytest.raises(WorkspaceNotFoundError):
        registry.add_capability("missing-workspace", "cap-search")

    with pytest.raises(WorkspaceNotFoundError):
        registry.remove_capability("missing-workspace", "cap-search")
