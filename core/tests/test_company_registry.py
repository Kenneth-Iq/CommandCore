from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.contracts import (
    Company,
    LifecycleState,
    Ownership,
    OwnershipKind,
    Status,
)
from commandcore.registries.company_registry import (
    CompanyNotFoundError,
    CompanyRegistry,
    DuplicateCompanyIdError,
)


def make_ownership() -> Ownership:
    return Ownership(
        kind=OwnershipKind.DOMAIN,
        reference="commandcore.architecture",
        display_name="CommandCore Architecture",
    )


def make_company(
    company_id: str,
    *,
    name: str = "MindX",
    status: Status = Status.ACTIVE,
    project_ids: list[str] | None = None,
    capability_ids: list[str] | None = None,
    agent_ids: list[str] | None = None,
) -> Company:
    return Company(
        id=company_id,
        name=name,
        mission="Advance the education platform mission.",
        status=status,
        lifecycle_state=LifecycleState.ACTIVE,
        ownership=make_ownership(),
        project_ids=project_ids or [],
        capability_ids=capability_ids or [],
        agent_ids=agent_ids or [],
    )


def test_register_and_get_company():
    registry = CompanyRegistry()
    company = make_company("mindx")

    registry.register_company(company)

    assert registry.get_company("mindx") == company


def test_register_duplicate_company_id_raises():
    registry = CompanyRegistry()
    company = make_company("mindx")
    registry.register_company(company)

    with pytest.raises(DuplicateCompanyIdError):
        registry.register_company(company)


def test_get_missing_company_raises():
    registry = CompanyRegistry()

    with pytest.raises(CompanyNotFoundError):
        registry.get_company("missing-company")


def test_list_companies_returns_registered_values():
    registry = CompanyRegistry()
    company_a = make_company("mindx")
    company_b = make_company("tirra", name="Tirra")
    registry.register_company(company_a)
    registry.register_company(company_b)

    assert registry.list_companies() == [company_a, company_b]


def test_find_by_name_is_case_insensitive():
    registry = CompanyRegistry()
    company = make_company("mindx", name="MindX")
    registry.register_company(company)

    results = registry.find_by_name("mindx")

    assert results == [company]


def test_find_by_status_filters_companies():
    registry = CompanyRegistry()
    active_company = make_company("mindx", status=Status.ACTIVE)
    blocked_company = make_company("tirra", name="Tirra", status=Status.BLOCKED)
    registry.register_company(active_company)
    registry.register_company(blocked_company)

    results = registry.find_by_status(Status.BLOCKED)

    assert results == [blocked_company]


def test_add_project_updates_company_without_duplicates():
    registry = CompanyRegistry()
    company = make_company("mindx", project_ids=["proj-alpha"])
    registry.register_company(company)

    updated = registry.add_project("mindx", "proj-beta")
    registry.add_project("mindx", "proj-beta")

    assert updated.project_ids == ["proj-alpha", "proj-beta"]
    assert registry.get_company("mindx").project_ids == ["proj-alpha", "proj-beta"]


def test_remove_project_updates_company():
    registry = CompanyRegistry()
    company = make_company("mindx", project_ids=["proj-alpha", "proj-beta"])
    registry.register_company(company)

    updated = registry.remove_project("mindx", "proj-alpha")

    assert updated.project_ids == ["proj-beta"]
    assert registry.get_company("mindx").project_ids == ["proj-beta"]


def test_add_capability_updates_company_without_duplicates():
    registry = CompanyRegistry()
    company = make_company("mindx", capability_ids=["cap-search"])
    registry.register_company(company)

    updated = registry.add_capability("mindx", "cap-runbook")
    registry.add_capability("mindx", "cap-runbook")

    assert updated.capability_ids == ["cap-search", "cap-runbook"]
    assert registry.get_company("mindx").capability_ids == [
        "cap-search",
        "cap-runbook",
    ]


def test_remove_capability_updates_company():
    registry = CompanyRegistry()
    company = make_company("mindx", capability_ids=["cap-search", "cap-runbook"])
    registry.register_company(company)

    updated = registry.remove_capability("mindx", "cap-search")

    assert updated.capability_ids == ["cap-runbook"]
    assert registry.get_company("mindx").capability_ids == ["cap-runbook"]


def test_add_agent_updates_company_without_duplicates():
    registry = CompanyRegistry()
    company = make_company("mindx", agent_ids=["agent-hermes"])
    registry.register_company(company)

    updated = registry.add_agent("mindx", "agent-athena")
    registry.add_agent("mindx", "agent-athena")

    assert updated.agent_ids == ["agent-hermes", "agent-athena"]
    assert registry.get_company("mindx").agent_ids == [
        "agent-hermes",
        "agent-athena",
    ]


def test_remove_agent_updates_company():
    registry = CompanyRegistry()
    company = make_company("mindx", agent_ids=["agent-hermes", "agent-athena"])
    registry.register_company(company)

    updated = registry.remove_agent("mindx", "agent-hermes")

    assert updated.agent_ids == ["agent-athena"]
    assert registry.get_company("mindx").agent_ids == ["agent-athena"]


def test_membership_operations_raise_for_missing_company():
    registry = CompanyRegistry()

    with pytest.raises(CompanyNotFoundError):
        registry.add_project("missing-company", "proj-alpha")

    with pytest.raises(CompanyNotFoundError):
        registry.remove_project("missing-company", "proj-alpha")

    with pytest.raises(CompanyNotFoundError):
        registry.add_capability("missing-company", "cap-search")

    with pytest.raises(CompanyNotFoundError):
        registry.remove_capability("missing-company", "cap-search")

    with pytest.raises(CompanyNotFoundError):
        registry.add_agent("missing-company", "agent-hermes")

    with pytest.raises(CompanyNotFoundError):
        registry.remove_agent("missing-company", "agent-hermes")
