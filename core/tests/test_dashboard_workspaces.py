from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.bootstrap import create_in_memory_kernel
from commandcore.contracts import (
    Capability,
    CapabilityCertificationStatus,
    Company,
    KnowledgeAsset,
    LifecycleState,
    Ownership,
    OwnershipKind,
    PermissionLevel,
    Project,
    Status,
    Workspace,
)
from commandcore.dashboard import WorkspaceDashboardService


def make_ownership() -> Ownership:
    return Ownership(
        kind=OwnershipKind.DOMAIN,
        reference="commandcore.architecture",
        display_name="CommandCore Architecture",
    )


def test_workspace_dashboard_service_reports_workspace_knowledge_and_activity():
    kernel = create_in_memory_kernel()
    kernel.workspace_registry.register_workspace(
        Workspace(
            id="ws-local",
            name="Local Workspace",
            status=Status.ACTIVE,
            ownership=make_ownership(),
            company_ids=["comp-local"],
            project_ids=["proj-local"],
            capability_ids=["cap-search"],
        )
    )
    kernel.workspace_registry.register_workspace(
        Workspace(
            id="ws-remote",
            name="Remote Workspace",
            status=Status.ACTIVE,
            ownership=make_ownership(),
        )
    )
    kernel.company_registry.register_company(
        Company(
            id="comp-local",
            name="Local Company",
            mission="Operate the local estate.",
            status=Status.ACTIVE,
            lifecycle_state=LifecycleState.ACTIVE,
            ownership=make_ownership(),
            project_ids=["proj-local"],
            capability_ids=["cap-search"],
        )
    )
    kernel.project_registry.register_project(
        Project(
            id="proj-local",
            name="Local Project",
            company_id="comp-local",
            status=Status.ACTIVE,
            lifecycle_state=LifecycleState.ACTIVE,
            ownership=make_ownership(),
            capability_ids=["cap-search"],
            next_action_summary="Review knowledge coverage.",
        )
    )
    kernel.capability_registry.register_capability(
        Capability(
            id="cap-search",
            name="Knowledge Search",
            description="Search knowledge assets.",
            status=Status.ACTIVE,
            lifecycle_state=LifecycleState.ACTIVE,
            ownership=make_ownership(),
            version="1.0.0",
            certification_status=CapabilityCertificationStatus.CERTIFIED,
            permission_level=PermissionLevel.READ,
            marketplace_ready=True,
        )
    )
    kernel.knowledge_engine.add_asset(
        KnowledgeAsset(
            id="know-local",
            title="Local Runbook",
            asset_type="runbook",
            ownership=make_ownership(),
            lifecycle_state=LifecycleState.ACTIVE,
            workspace_id="ws-local",
            company_id="comp-local",
            project_id="proj-local",
            safe_to_query=True,
        )
    )
    kernel.knowledge_engine.add_asset(
        KnowledgeAsset(
            id="know-remote",
            title="Remote Decision",
            asset_type="decision",
            ownership=make_ownership(),
            lifecycle_state=LifecycleState.ACTIVE,
            workspace_id="ws-remote",
            safe_to_query=True,
        )
    )
    kernel.knowledge_engine.link_assets("know-local", "know-remote", "supports")

    dashboard = WorkspaceDashboardService(
        workspace_registry=kernel.workspace_registry,
        knowledge_engine=kernel.knowledge_engine,
        audit_trail=kernel.audit_trail,
        company_registry=kernel.company_registry,
        project_registry=kernel.project_registry,
        capability_registry=kernel.capability_registry,
    )

    workspace_counts = dashboard.workspace_counts()
    asset_counts = dashboard.knowledge_asset_counts()
    relationship_counts = dashboard.knowledge_relationship_counts()
    recent_activity = dashboard.recent_workspace_activity()
    knowledge_assets = dashboard.knowledge_assets()
    workspaces = dashboard.workspaces()
    companies = dashboard.companies()
    projects = dashboard.projects()
    capabilities = dashboard.capabilities()

    assert workspace_counts == {"total": 2, "with_knowledge_assets": 2}
    assert asset_counts == {
        "total": 2,
        "by_workspace": {"ws-local": 1, "ws-remote": 1},
    }
    assert relationship_counts == {
        "total": 1,
        "by_workspace": {"ws-local": 1, "ws-remote": 1},
    }
    assert any(event["event_name"] == "WorkspaceCreated" for event in recent_activity)
    assert any(event["event_name"] == "KnowledgeAssetsLinked" for event in recent_activity)
    assert all(event["event_type"] is not None for event in recent_activity)
    assert knowledge_assets[0]["asset_id"] == "know-local"
    assert knowledge_assets[0]["relationship_count"] == 1
    assert knowledge_assets[0]["linked_asset_ids"] == ["know-remote"]
    assert workspaces[0]["workspace_id"] == "ws-local"
    assert workspaces[0]["asset_count"] == 1
    assert companies == [
        {
            "company_id": "comp-local",
            "name": "Local Company",
            "mission": "Operate the local estate.",
            "status": "active",
            "lifecycle_state": "active",
            "project_ids": ["proj-local"],
            "capability_ids": ["cap-search"],
            "agent_ids": [],
            "operating_state": None,
        }
    ]
    assert projects == [
        {
            "project_id": "proj-local",
            "name": "Local Project",
            "company_id": "comp-local",
            "status": "active",
            "lifecycle_state": "active",
            "capability_ids": ["cap-search"],
            "agent_ids": [],
            "mission": None,
            "outcome": None,
            "next_action_summary": "Review knowledge coverage.",
        }
    ]
    assert capabilities == [
        {
            "capability_id": "cap-search",
            "name": "Knowledge Search",
            "description": "Search knowledge assets.",
            "status": "active",
            "lifecycle_state": "active",
            "permission_level": "read",
            "certification_status": "certified",
            "marketplace_ready": True,
            "consumer_count": 0,
            "provider_count": 0,
        }
    ]

    built = dashboard.build_dashboard()
    assert built["workspace_counts"] == workspace_counts
    assert built["knowledge_asset_counts"] == asset_counts
    assert built["knowledge_assets"] == knowledge_assets
    assert built["workspaces"] == workspaces
