from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.contracts import (
    Agent,
    AgentRuntimeStatus,
    Capability,
    CapabilityCertificationStatus,
    Company,
    LifecycleState,
    Ownership,
    OwnershipKind,
    PermissionLevel,
    Project,
    Status,
    Workspace,
)
from commandcore.events import InMemoryEventBus
from commandcore.registries import (
    AgentRegistry,
    CapabilityRegistry,
    CompanyRegistry,
    ProjectRegistry,
    WorkspaceRegistry,
)


def make_ownership() -> Ownership:
    return Ownership(
        kind=OwnershipKind.DOMAIN,
        reference="commandcore.architecture",
        display_name="CommandCore Architecture",
    )


def test_capability_registry_publishes_registered_event_with_custom_source():
    bus = InMemoryEventBus()
    capability = Capability(
        id="cap-search",
        name="Universal Search Index",
        description="Reusable search and retrieval capability.",
        status=Status.ACTIVE,
        lifecycle_state=LifecycleState.PROMOTED,
        ownership=make_ownership(),
        version="1.0.0",
        certification_status=CapabilityCertificationStatus.CERTIFIED,
        permission_level=PermissionLevel.OPERATE,
    )

    CapabilityRegistry(event_bus=bus, source="custom.registry.source").register_capability(
        capability
    )

    [event] = bus.list_events()
    assert event.source == "custom.registry.source"
    assert event.payload["event_name"] == "CapabilityRegistered"
    assert event.payload["entity_id"] == "cap-search"
    assert event.payload["name"] == "Universal Search Index"
    assert event.payload["status"] == "active"
    assert event.payload["ownership"]["reference"] == "commandcore.architecture"


def test_agent_registry_publishes_registered_event():
    bus = InMemoryEventBus()
    agent = Agent(
        id="agent-hermes",
        name="Hermes Worker",
        role="engineering",
        status=Status.ACTIVE,
        ownership=make_ownership(),
        runtime_status=AgentRuntimeStatus.AVAILABLE,
        permission_level=PermissionLevel.OPERATE,
    )

    AgentRegistry(event_bus=bus).register_agent(agent)

    [event] = bus.list_events()
    assert event.source == "commandcore.registries.agent"
    assert event.payload["event_name"] == "AgentRegistered"
    assert event.payload["entity_id"] == "agent-hermes"
    assert event.payload["name"] == "Hermes Worker"
    assert event.payload["status"] == "active"


def test_company_registry_publishes_created_event():
    bus = InMemoryEventBus()
    company = Company(
        id="mindx",
        name="MindX",
        mission="Advance the education platform mission.",
        status=Status.ACTIVE,
        lifecycle_state=LifecycleState.ACTIVE,
        ownership=make_ownership(),
    )

    CompanyRegistry(event_bus=bus).register_company(company)

    [event] = bus.list_events()
    assert event.source == "commandcore.registries.company"
    assert event.payload["event_name"] == "CompanyCreated"
    assert event.payload["entity_id"] == "mindx"
    assert event.payload["name"] == "MindX"
    assert event.payload["status"] == "active"


def test_project_registry_publishes_created_event():
    bus = InMemoryEventBus()
    project = Project(
        id="proj-jarvis",
        name="Jarvis",
        status=Status.ACTIVE,
        lifecycle_state=LifecycleState.ACTIVE,
        ownership=make_ownership(),
        company_id="mindx",
    )

    ProjectRegistry(event_bus=bus).register_project(project)

    [event] = bus.list_events()
    assert event.source == "commandcore.registries.project"
    assert event.payload["event_name"] == "ProjectCreated"
    assert event.payload["entity_id"] == "proj-jarvis"
    assert event.payload["name"] == "Jarvis"
    assert event.payload["status"] == "active"


def test_workspace_registry_publishes_created_event():
    bus = InMemoryEventBus()
    workspace = Workspace(
        id="ws-local",
        name="CommandCore Local Workspace",
        status=Status.ACTIVE,
        ownership=make_ownership(),
    )

    WorkspaceRegistry(event_bus=bus).register_workspace(workspace)

    [event] = bus.list_events()
    assert event.source == "commandcore.registries.workspace"
    assert event.payload["event_name"] == "WorkspaceCreated"
    assert event.payload["entity_id"] == "ws-local"
    assert event.payload["name"] == "CommandCore Local Workspace"
    assert event.payload["status"] == "active"
