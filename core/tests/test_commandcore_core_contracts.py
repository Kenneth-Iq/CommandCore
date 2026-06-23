from pathlib import Path
import sys

from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore_core.contracts import (
    Agent,
    AgentRuntimeStatus,
    Capability,
    CapabilityCertificationStatus,
    Company,
    Executive,
    Integration,
    KnowledgeAsset,
    LifecycleState,
    Mission,
    MissionStatus,
    ModelProvider,
    Ownership,
    OwnershipKind,
    PermissionLevel,
    Project,
    Status,
    Task,
    Workspace,
)


def make_ownership() -> Ownership:
    return Ownership(
        kind=OwnershipKind.DOMAIN,
        reference="commandcore.architecture",
        display_name="CommandCore Architecture",
    )


def test_executive_contract_instantiates():
    executive = Executive(
        id="jarvis",
        name="Jarvis",
        role_title="Chief Executive Intelligence",
        status=Status.ACTIVE,
        ownership=make_ownership(),
        mission_scope=["executive-briefing", "mission-routing"],
        permission_level=PermissionLevel.EXECUTIVE,
        responsibilities=["briefings", "recommendations"],
    )

    assert executive.name == "Jarvis"


def test_company_contract_instantiates():
    company = Company(
        id="mindx",
        name="MindX",
        mission="Advance the education platform mission.",
        vision="A durable education company world.",
        status=Status.ACTIVE,
        lifecycle_state=LifecycleState.ACTIVE,
        ownership=make_ownership(),
        goals=["Grow reusable learning workflows"],
        capability_ids=["cap-runbook-template"],
        integration_ids=["int-google-workspace"],
        operating_state="operating",
    )

    assert company.capability_ids == ["cap-runbook-template"]


def test_project_contract_instantiates():
    project = Project(
        id="proj-jarvis",
        name="Jarvis",
        status=Status.ACTIVE,
        lifecycle_state=LifecycleState.ACTIVE,
        ownership=make_ownership(),
        company_id="mindx",
        capability_ids=["cap-agent-task-interface"],
        mission="Deliver the executive intelligence surface.",
        outcome="Reusable executive workflow",
        next_action_summary="Define core contracts",
    )

    assert project.company_id == "mindx"


def test_task_contract_instantiates():
    task = Task(
        id="task-1",
        objective="Prepare capability review context.",
        status=MissionStatus.REQUESTED,
        ownership=make_ownership(),
        project_id="proj-jarvis",
        capability_id="cap-github-review-workflow",
        scope=["knowledge", "project-context"],
        constraints=["no-secret-access"],
        expected_output="Capability review packet",
    )

    assert task.expected_output == "Capability review packet"


def test_capability_contract_instantiates():
    capability = Capability(
        id="cap-search",
        name="Universal Search Index",
        description="Reusable search and retrieval capability.",
        status=Status.ACTIVE,
        lifecycle_state=LifecycleState.PROMOTED,
        ownership=make_ownership(),
        version="1.0.0",
        certification_status=CapabilityCertificationStatus.CERTIFIED,
        dependency_ids=["int-qdrant"],
        inputs=["knowledge records"],
        outputs=["search results", "source citations"],
        configuration_keys=["scope", "retrieval_mode"],
        permission_level=PermissionLevel.OPERATE,
        consumers=["company:mindx", "project:jarvis"],
        providers=["provider:commandcore"],
        marketplace_ready=True,
        documentation_notes=["Document source preservation behavior."],
        testing_notes=["Validate retrieval against known records."],
        model_provider_ids=["model-litellm"],
    )

    assert capability.marketplace_ready is True


def test_agent_contract_instantiates():
    agent = Agent(
        id="agent-hermes",
        name="Hermes Worker",
        role="engineering",
        ownership=make_ownership(),
        runtime_status=AgentRuntimeStatus.AVAILABLE,
        permission_level=PermissionLevel.OPERATE,
        model_provider_id="model-litellm",
        capability_ids=["cap-agent-task-interface"],
        mission_queue=["mission-1"],
        state_summary="ready for scoped engineering work",
    )

    assert agent.runtime_status == AgentRuntimeStatus.AVAILABLE


def test_mission_contract_instantiates():
    mission = Mission(
        id="mission-1",
        title="Prepare project capability review",
        status=MissionStatus.APPROVED,
        ownership=make_ownership(),
        requested_by="jarvis",
        scope=["project:jarvis", "knowledge:innovation-lab"],
        capability_ids=["cap-github-review-workflow"],
        assigned_agent_id="agent-hermes",
        approval_required=True,
        required_output="Cited review summary",
    )

    assert mission.assigned_agent_id == "agent-hermes"


def test_knowledge_asset_contract_instantiates():
    knowledge_asset = KnowledgeAsset(
        id="know-1",
        title="Teachfolk Local API Runbook",
        asset_type="runbook",
        ownership=make_ownership(),
        lifecycle_state=LifecycleState.ACTIVE,
        source_record_id="runbook-teachfolk-api",
        workspace_id="ws-1",
        company_id="teachfolk",
        project_id="proj-teachfolk",
        tags=["operations", "runbook"],
        citations=["runbook-teachfolk-api"],
        safe_to_query=True,
    )

    assert knowledge_asset.safe_to_query is True


def test_workspace_contract_instantiates():
    workspace = Workspace(
        id="ws-1",
        name="CommandCore Local Workspace",
        status=Status.ACTIVE,
        ownership=make_ownership(),
        member_references=["user:kenneth", "user:partner"],
        local_first=True,
        offline_capable=True,
        knowledge_boundary_summary="Workspace-scoped operational memory.",
    )

    assert workspace.local_first is True


def test_integration_contract_instantiates():
    integration = Integration(
        id="int-cloudflare",
        name="Cloudflare",
        provider_type="dns",
        status=Status.ACTIVE,
        ownership=make_ownership(),
        dependency_role="replaceable",
        access_reference="Vault item: MindX - Cloudflare - Production - Admin",
        verification_summary="Verified by operations review.",
        related_company_id="mindx",
        related_project_id="proj-mindx",
    )

    assert integration.provider_type == "dns"


def test_model_provider_contract_instantiates():
    model_provider = ModelProvider(
        id="model-litellm",
        name="LiteLLM",
        provider_class="abstraction-layer",
        ownership=make_ownership(),
        status=Status.ACTIVE,
        lifecycle_state=LifecycleState.ACTIVE,
        local_first_compatible=True,
        supports_fallback=True,
        capabilities_supported=["routing", "fallback"],
        routing_notes=["Use as provider abstraction for model-neutral access."],
    )

    assert model_provider.supports_fallback is True
    assert model_provider.updated_at.tzinfo is not None


def test_pydantic_validation_rejects_empty_required_fields():
    try:
        Executive(
            id="",
            name="Jarvis",
            role_title="Chief Executive Intelligence",
            status=Status.ACTIVE,
            ownership=make_ownership(),
            permission_level=PermissionLevel.EXECUTIVE,
        )
    except ValidationError as exc:
        assert "id" in str(exc)
    else:
        raise AssertionError("Expected ValidationError for empty required field")
