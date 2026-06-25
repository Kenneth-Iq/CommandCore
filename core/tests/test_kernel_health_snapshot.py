from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.bootstrap import create_in_memory_kernel
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
    Workspace,
)
from commandcore.executive import Objective, PolicyDecision, PolicyRule
from commandcore.health import build_kernel_health_snapshot


def make_ownership() -> Ownership:
    return Ownership(
        kind=OwnershipKind.DOMAIN,
        reference="commandcore.architecture",
        display_name="CommandCore Architecture",
    )


def test_build_kernel_health_snapshot_counts_core_components():
    kernel = create_in_memory_kernel()

    kernel.workspace_registry.register_workspace(
        Workspace(
            id="ws-local",
            name="CommandCore Local Workspace",
            status=Status.ACTIVE,
            ownership=make_ownership(),
        )
    )
    kernel.company_registry.register_company(
        Company(
            id="mindx",
            name="MindX",
            mission="Advance the platform mission.",
            status=Status.ACTIVE,
            lifecycle_state=LifecycleState.ACTIVE,
            ownership=make_ownership(),
        )
    )
    kernel.capability_registry.register_capability(
        Capability(
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
    )
    kernel.agent_registry.register_agent(
        Agent(
            id="agent-hermes",
            name="Hermes Worker",
            role="engineering",
            status=Status.ACTIVE,
            ownership=make_ownership(),
            runtime_status=AgentRuntimeStatus.AVAILABLE,
            permission_level=PermissionLevel.OPERATE,
            capability_ids=["cap-search"],
        )
    )
    kernel.project_registry.register_project(
        Project(
            id="proj-jarvis",
            name="Jarvis",
            status=Status.ACTIVE,
            lifecycle_state=LifecycleState.ACTIVE,
            ownership=make_ownership(),
            company_id="mindx",
            capability_ids=["cap-search"],
            agent_ids=["agent-hermes"],
        )
    )
    kernel.knowledge_engine.add_asset(
        KnowledgeAsset(
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
    )
    kernel.mission_engine.create_mission(
        Mission(
            id="mission-1",
            title="Prepare capability review",
            status=MissionStatus.REQUESTED,
            ownership=make_ownership(),
            requested_by="jarvis",
            scope=["project:jarvis"],
            capability_ids=["cap-search"],
            approval_required=True,
            required_output="Cited review summary",
        )
    )
    kernel.executive_runtime.submit_objective(
        Objective(
            id="obj-1",
            title="Resolve blockers",
            summary="Review current delivery blockers.",
            requested_by="jarvis",
            scope=["project:proj-jarvis"],
            priority="high",
        )
    )
    kernel.executive_policy_engine.add_rule(
        PolicyRule(
            id="warn-priority",
            target_type="objective",
            field_name="priority",
            expected_value="high",
            decision=PolicyDecision.WARN,
            message="High-priority objectives require review.",
        )
    )

    snapshot = build_kernel_health_snapshot(kernel)

    assert snapshot["event_count"] == len(kernel.event_bus.list_events())
    assert snapshot["event_store_available"] is True
    assert snapshot["event_store_event_count"] == len(kernel.event_store.read_all())
    assert snapshot["audit_entry_count"] == len(kernel.audit_trail.list_entries())
    assert snapshot["registry_entity_counts"] == {
        "capabilities": 1,
        "agents": 1,
        "companies": 1,
        "projects": 1,
        "workspaces": 1,
    }
    assert snapshot["knowledge_asset_count"] == 1
    assert snapshot["mission_count"] == 1
    assert snapshot["executive_objective_count"] == 1
    assert snapshot["policy_rule_count"] == 1
    assert snapshot["executive_report_available"] is True
    assert snapshot["policy_gate_available"] is True
    assert snapshot["state_store_available"] is True
    assert snapshot["orchestrator_available"] is True
