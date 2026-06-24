from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.contracts import (
    Agent,
    AgentRuntimeStatus,
    Capability,
    CapabilityCertificationStatus,
    Company,
    KnowledgeAsset,
    LifecycleState,
    Mission,
    MissionStatus,
    Ownership,
    OwnershipKind,
    PermissionLevel,
    Project,
    Status,
    Task,
    Workspace,
)
from commandcore.events import InMemoryEventBus
from commandcore.knowledge import InMemoryKnowledgeEngine
from commandcore.mission import MissionEngine
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


def test_kernel_integration_smoke():
    bus = InMemoryEventBus()

    capability_registry = CapabilityRegistry(event_bus=bus)
    agent_registry = AgentRegistry(event_bus=bus)
    company_registry = CompanyRegistry(event_bus=bus)
    project_registry = ProjectRegistry(event_bus=bus)
    workspace_registry = WorkspaceRegistry(event_bus=bus)
    knowledge_engine = InMemoryKnowledgeEngine(event_bus=bus)
    mission_engine = MissionEngine(event_bus=bus)

    workspace = Workspace(
        id="ws-local",
        name="CommandCore Local Workspace",
        status=Status.ACTIVE,
        ownership=make_ownership(),
    )
    company = Company(
        id="mindx",
        name="MindX",
        mission="Advance the education platform mission.",
        status=Status.ACTIVE,
        lifecycle_state=LifecycleState.ACTIVE,
        ownership=make_ownership(),
    )
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
    agent = Agent(
        id="agent-hermes",
        name="Hermes Worker",
        role="engineering",
        status=Status.ACTIVE,
        ownership=make_ownership(),
        runtime_status=AgentRuntimeStatus.AVAILABLE,
        permission_level=PermissionLevel.OPERATE,
        capability_ids=["cap-search"],
    )
    project = Project(
        id="proj-jarvis",
        name="Jarvis",
        status=Status.ACTIVE,
        lifecycle_state=LifecycleState.ACTIVE,
        ownership=make_ownership(),
        company_id="mindx",
        capability_ids=["cap-search"],
        agent_ids=["agent-hermes"],
    )
    knowledge_asset = KnowledgeAsset(
        id="know-runbook",
        title="Launch Runbook",
        asset_type="runbook",
        ownership=make_ownership(),
        lifecycle_state=LifecycleState.ACTIVE,
        workspace_id="ws-local",
        company_id="mindx",
        project_id="proj-jarvis",
        safe_to_query=True,
    )
    mission = Mission(
        id="mission-1",
        title="Prepare capability review",
        status=MissionStatus.REQUESTED,
        ownership=make_ownership(),
        requested_by="jarvis",
        scope=["project:jarvis", "knowledge:innovation-lab"],
        capability_ids=["cap-search"],
        approval_required=True,
        required_output="Cited review summary",
    )
    task = Task(
        id="task-1",
        objective="Prepare review context",
        status=MissionStatus.REQUESTED,
        ownership=make_ownership(),
        project_id="proj-jarvis",
        capability_id="cap-search",
        scope=["knowledge", "project-context"],
        constraints=["no-secret-access"],
        expected_output="Capability review packet",
    )

    workspace_registry.register_workspace(workspace)
    company_registry.register_company(company)
    capability_registry.register_capability(capability)
    agent_registry.register_agent(agent)
    project_registry.register_project(project)
    knowledge_engine.add_asset(knowledge_asset)
    mission_engine.create_mission(mission)
    mission_engine.assign_agent(mission.id, agent.id)
    mission_engine.add_task(mission.id, task)
    mission_engine.complete_mission(
        mission.id, result_summary="Capability review completed."
    )

    assert workspace_registry.get_workspace("ws-local") == workspace
    assert company_registry.get_company("mindx") == company
    assert capability_registry.get_capability("cap-search") == capability
    assert agent_registry.get_agent("agent-hermes") == agent
    assert project_registry.get_project("proj-jarvis") == project
    assert knowledge_engine.get_asset("know-runbook") == knowledge_asset
    assert mission_engine.get_mission("mission-1").status == MissionStatus.COMPLETED
    assert mission_engine.list_tasks("mission-1") == [task]

    event_names = [event.payload["event_name"] for event in bus.list_events()]
    for expected_event in [
        "WorkspaceCreated",
        "CompanyCreated",
        "CapabilityRegistered",
        "AgentRegistered",
        "ProjectCreated",
        "KnowledgeAssetCreated",
        "MissionCreated",
        "MissionAgentAssigned",
        "MissionTaskAdded",
        "MissionCompleted",
    ]:
        assert expected_event in event_names
