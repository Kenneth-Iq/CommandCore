from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.bootstrap import create_in_memory_kernel
from commandcore.contracts import KnowledgeAsset, LifecycleState, Ownership, OwnershipKind, Status, Workspace
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
    kernel.knowledge_engine.add_asset(
        KnowledgeAsset(
            id="know-local",
            title="Local Runbook",
            asset_type="runbook",
            ownership=make_ownership(),
            lifecycle_state=LifecycleState.ACTIVE,
            workspace_id="ws-local",
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
    )

    workspace_counts = dashboard.workspace_counts()
    asset_counts = dashboard.knowledge_asset_counts()
    relationship_counts = dashboard.knowledge_relationship_counts()
    recent_activity = dashboard.recent_workspace_activity()

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

    built = dashboard.build_dashboard()
    assert built["workspace_counts"] == workspace_counts
    assert built["knowledge_asset_counts"] == asset_counts
