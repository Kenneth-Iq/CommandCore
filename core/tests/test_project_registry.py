from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.contracts import (
    LifecycleState,
    Ownership,
    OwnershipKind,
    Project,
    Status,
)
from commandcore.registries.project_registry import (
    DuplicateProjectIdError,
    ProjectNotFoundError,
    ProjectRegistry,
)


def make_ownership() -> Ownership:
    return Ownership(
        kind=OwnershipKind.DOMAIN,
        reference="commandcore.architecture",
        display_name="CommandCore Architecture",
    )


def make_project(
    project_id: str,
    *,
    name: str = "Jarvis",
    status: Status = Status.ACTIVE,
    company_id: str | None = "mindx",
    task_ids: list[str] | None = None,
    capability_ids: list[str] | None = None,
    agent_ids: list[str] | None = None,
) -> Project:
    return Project(
        id=project_id,
        name=name,
        status=status,
        lifecycle_state=LifecycleState.ACTIVE,
        ownership=make_ownership(),
        company_id=company_id,
        task_ids=task_ids or [],
        capability_ids=capability_ids or [],
        agent_ids=agent_ids or [],
    )


def test_register_and_get_project():
    registry = ProjectRegistry()
    project = make_project("proj-jarvis")

    registry.register_project(project)

    assert registry.get_project("proj-jarvis") == project


def test_register_duplicate_project_id_raises():
    registry = ProjectRegistry()
    project = make_project("proj-jarvis")
    registry.register_project(project)

    with pytest.raises(DuplicateProjectIdError):
        registry.register_project(project)


def test_get_missing_project_raises():
    registry = ProjectRegistry()

    with pytest.raises(ProjectNotFoundError):
        registry.get_project("missing-project")


def test_list_projects_returns_registered_values():
    registry = ProjectRegistry()
    project_a = make_project("proj-jarvis")
    project_b = make_project("proj-mindx", name="MindX Platform")
    registry.register_project(project_a)
    registry.register_project(project_b)

    assert registry.list_projects() == [project_a, project_b]


def test_find_by_name_is_case_insensitive():
    registry = ProjectRegistry()
    project = make_project("proj-jarvis", name="Jarvis")
    registry.register_project(project)

    results = registry.find_by_name("jarvis")

    assert results == [project]


def test_find_by_status_filters_projects():
    registry = ProjectRegistry()
    active_project = make_project("proj-active", status=Status.ACTIVE)
    blocked_project = make_project("proj-blocked", status=Status.BLOCKED)
    registry.register_project(active_project)
    registry.register_project(blocked_project)

    results = registry.find_by_status(Status.BLOCKED)

    assert results == [blocked_project]


def test_find_by_company_filters_projects():
    registry = ProjectRegistry()
    mindx_project = make_project("proj-jarvis", company_id="mindx")
    tirra_project = make_project("proj-tirra", name="Tirra", company_id="tirra")
    registry.register_project(mindx_project)
    registry.register_project(tirra_project)

    results = registry.find_by_company("tirra")

    assert results == [tirra_project]


def test_add_task_updates_project_without_duplicates():
    registry = ProjectRegistry()
    project = make_project("proj-jarvis", task_ids=["task-1"])
    registry.register_project(project)

    updated = registry.add_task("proj-jarvis", "task-2")
    registry.add_task("proj-jarvis", "task-2")

    assert updated.task_ids == ["task-1", "task-2"]
    assert registry.get_project("proj-jarvis").task_ids == ["task-1", "task-2"]


def test_remove_task_updates_project():
    registry = ProjectRegistry()
    project = make_project("proj-jarvis", task_ids=["task-1", "task-2"])
    registry.register_project(project)

    updated = registry.remove_task("proj-jarvis", "task-1")

    assert updated.task_ids == ["task-2"]
    assert registry.get_project("proj-jarvis").task_ids == ["task-2"]


def test_add_capability_updates_project_without_duplicates():
    registry = ProjectRegistry()
    project = make_project("proj-jarvis", capability_ids=["cap-search"])
    registry.register_project(project)

    updated = registry.add_capability("proj-jarvis", "cap-runbook")
    registry.add_capability("proj-jarvis", "cap-runbook")

    assert updated.capability_ids == ["cap-search", "cap-runbook"]
    assert registry.get_project("proj-jarvis").capability_ids == [
        "cap-search",
        "cap-runbook",
    ]


def test_remove_capability_updates_project():
    registry = ProjectRegistry()
    project = make_project(
        "proj-jarvis", capability_ids=["cap-search", "cap-runbook"]
    )
    registry.register_project(project)

    updated = registry.remove_capability("proj-jarvis", "cap-search")

    assert updated.capability_ids == ["cap-runbook"]
    assert registry.get_project("proj-jarvis").capability_ids == ["cap-runbook"]


def test_add_agent_updates_project_without_duplicates():
    registry = ProjectRegistry()
    project = make_project("proj-jarvis", agent_ids=["agent-hermes"])
    registry.register_project(project)

    updated = registry.add_agent("proj-jarvis", "agent-athena")
    registry.add_agent("proj-jarvis", "agent-athena")

    assert updated.agent_ids == ["agent-hermes", "agent-athena"]
    assert registry.get_project("proj-jarvis").agent_ids == [
        "agent-hermes",
        "agent-athena",
    ]


def test_remove_agent_updates_project():
    registry = ProjectRegistry()
    project = make_project(
        "proj-jarvis", agent_ids=["agent-hermes", "agent-athena"]
    )
    registry.register_project(project)

    updated = registry.remove_agent("proj-jarvis", "agent-hermes")

    assert updated.agent_ids == ["agent-athena"]
    assert registry.get_project("proj-jarvis").agent_ids == ["agent-athena"]


def test_membership_operations_raise_for_missing_project():
    registry = ProjectRegistry()

    with pytest.raises(ProjectNotFoundError):
        registry.add_task("missing-project", "task-1")

    with pytest.raises(ProjectNotFoundError):
        registry.remove_task("missing-project", "task-1")

    with pytest.raises(ProjectNotFoundError):
        registry.add_capability("missing-project", "cap-search")

    with pytest.raises(ProjectNotFoundError):
        registry.remove_capability("missing-project", "cap-search")

    with pytest.raises(ProjectNotFoundError):
        registry.add_agent("missing-project", "agent-hermes")

    with pytest.raises(ProjectNotFoundError):
        registry.remove_agent("missing-project", "agent-hermes")
