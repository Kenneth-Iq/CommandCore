from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore_core.contracts import (
    Capability,
    CapabilityCertificationStatus,
    LifecycleState,
    Ownership,
    OwnershipKind,
    PermissionLevel,
    Status,
)
from commandcore_core.registries import (
    CapabilityNotFoundError,
    CapabilityRegistry,
    DuplicateCapabilityIdError,
)


def make_ownership() -> Ownership:
    return Ownership(
        kind=OwnershipKind.DOMAIN,
        reference="commandcore.architecture",
        display_name="CommandCore Architecture",
    )


def make_capability(
    capability_id: str,
    *,
    name: str = "Universal Search Index",
    status: Status = Status.ACTIVE,
    certification_status: CapabilityCertificationStatus = (
        CapabilityCertificationStatus.CERTIFIED
    ),
    consumers: list[str] | None = None,
) -> Capability:
    return Capability(
        id=capability_id,
        name=name,
        description="Reusable search and retrieval capability.",
        status=status,
        lifecycle_state=LifecycleState.PROMOTED,
        ownership=make_ownership(),
        version="1.0.0",
        certification_status=certification_status,
        permission_level=PermissionLevel.OPERATE,
        consumers=consumers or [],
    )


def test_register_and_get_capability():
    registry = CapabilityRegistry()
    capability = make_capability("cap-search")

    registry.register_capability(capability)

    assert registry.get_capability("cap-search") == capability


def test_register_duplicate_capability_id_raises():
    registry = CapabilityRegistry()
    capability = make_capability("cap-search")
    registry.register_capability(capability)

    with pytest.raises(DuplicateCapabilityIdError):
        registry.register_capability(capability)


def test_get_missing_capability_raises():
    registry = CapabilityRegistry()

    with pytest.raises(CapabilityNotFoundError):
        registry.get_capability("missing-capability")


def test_list_capabilities_returns_registered_values():
    registry = CapabilityRegistry()
    capability_a = make_capability("cap-search")
    capability_b = make_capability("cap-runbook", name="Runbook Template")

    registry.register_capability(capability_a)
    registry.register_capability(capability_b)

    assert registry.list_capabilities() == [capability_a, capability_b]


def test_find_by_name_is_case_insensitive():
    registry = CapabilityRegistry()
    capability = make_capability("cap-search", name="Universal Search Index")
    registry.register_capability(capability)

    results = registry.find_by_name("universal search index")

    assert results == [capability]


def test_find_by_status_filters_capabilities():
    registry = CapabilityRegistry()
    active_capability = make_capability("cap-active", status=Status.ACTIVE)
    blocked_capability = make_capability("cap-blocked", status=Status.BLOCKED)
    registry.register_capability(active_capability)
    registry.register_capability(blocked_capability)

    results = registry.find_by_status(Status.BLOCKED)

    assert results == [blocked_capability]


def test_find_by_certification_filters_capabilities():
    registry = CapabilityRegistry()
    certified = make_capability(
        "cap-certified",
        certification_status=CapabilityCertificationStatus.CERTIFIED,
    )
    conditional = make_capability(
        "cap-conditional",
        certification_status=CapabilityCertificationStatus.CONDITIONAL,
    )
    registry.register_capability(certified)
    registry.register_capability(conditional)

    results = registry.find_by_certification(
        CapabilityCertificationStatus.CONDITIONAL
    )

    assert results == [conditional]


def test_find_consumers_returns_registered_consumers():
    registry = CapabilityRegistry()
    capability = make_capability(
        "cap-search", consumers=["company:mindx", "project:jarvis"]
    )
    registry.register_capability(capability)

    assert registry.find_consumers("cap-search") == [
        "company:mindx",
        "project:jarvis",
    ]


def test_add_consumer_updates_capability_without_duplicates():
    registry = CapabilityRegistry()
    capability = make_capability("cap-search", consumers=["company:mindx"])
    registry.register_capability(capability)

    updated = registry.add_consumer("cap-search", "project:jarvis")
    registry.add_consumer("cap-search", "project:jarvis")

    assert updated.consumers == ["company:mindx", "project:jarvis"]
    assert registry.find_consumers("cap-search") == [
        "company:mindx",
        "project:jarvis",
    ]


def test_remove_consumer_updates_capability():
    registry = CapabilityRegistry()
    capability = make_capability(
        "cap-search", consumers=["company:mindx", "project:jarvis"]
    )
    registry.register_capability(capability)

    updated = registry.remove_consumer("cap-search", "project:jarvis")

    assert updated.consumers == ["company:mindx"]
    assert registry.find_consumers("cap-search") == ["company:mindx"]


def test_consumer_operations_raise_for_missing_capability():
    registry = CapabilityRegistry()

    with pytest.raises(CapabilityNotFoundError):
        registry.add_consumer("missing-capability", "company:mindx")

    with pytest.raises(CapabilityNotFoundError):
        registry.remove_consumer("missing-capability", "company:mindx")
