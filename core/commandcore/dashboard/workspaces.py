"""Read-only workspace dashboard services for CommandCore."""

from __future__ import annotations

from dataclasses import dataclass

from commandcore.audit import InMemoryAuditTrail
from commandcore.knowledge import InMemoryKnowledgeEngine

from .serializers import serialize_event
from commandcore.registries import (
    CapabilityRegistry,
    CompanyRegistry,
    ProjectRegistry,
    WorkspaceRegistry,
)


WORKSPACE_ACTIVITY_EVENTS = {
    "WorkspaceCreated",
    "KnowledgeAssetCreated",
    "KnowledgeAssetsLinked",
}


@dataclass(slots=True)
class WorkspaceDashboardService:
    """Read-only workspace dashboard over registries, knowledge, and audit."""

    workspace_registry: WorkspaceRegistry
    knowledge_engine: InMemoryKnowledgeEngine
    audit_trail: InMemoryAuditTrail
    company_registry: CompanyRegistry | None = None
    project_registry: ProjectRegistry | None = None
    capability_registry: CapabilityRegistry | None = None

    def workspace_counts(self) -> dict[str, int]:
        workspaces = self.workspace_registry.list_workspaces()
        return {
            "total": len(workspaces),
            "with_knowledge_assets": sum(
                1
                for workspace in workspaces
                if self.knowledge_engine.find_by_scope("workspace", workspace.id)
            ),
        }

    def knowledge_asset_counts(self) -> dict[str, object]:
        assets = self.knowledge_engine.list_assets()
        workspaces = self.workspace_registry.list_workspaces()
        return {
            "total": len(assets),
            "by_workspace": {
                workspace.id: len(self.knowledge_engine.find_by_scope("workspace", workspace.id))
                for workspace in workspaces
            },
        }

    def knowledge_relationship_counts(self) -> dict[str, object]:
        relationships = self._all_relationships()
        workspaces = self.workspace_registry.list_workspaces()
        return {
            "total": len(relationships),
            "by_workspace": {
                workspace.id: len(
                    {
                        relationship
                        for relationship in relationships
                        if self._relationship_touches_workspace(relationship, workspace.id)
                    }
                )
                for workspace in workspaces
            },
        }

    def recent_workspace_activity(self, limit: int = 10) -> list[dict[str, object]]:
        events = [
            serialize_event(event)
            for event in self.audit_trail.list_entries()
            if event.payload.get("event_name") in WORKSPACE_ACTIVITY_EVENTS
        ]
        return events[-limit:]

    def knowledge_assets(self) -> list[dict[str, object]]:
        return [self._serialize_knowledge_asset(asset.id) for asset in self.knowledge_engine.list_assets()]

    def workspaces(self) -> list[dict[str, object]]:
        asset_counts = self.knowledge_asset_counts()["by_workspace"]
        relationship_counts = self.knowledge_relationship_counts()["by_workspace"]
        return [
            {
                "workspace_id": workspace.id,
                "name": workspace.name,
                "status": getattr(workspace.status, "value", str(workspace.status)),
                "company_ids": list(workspace.company_ids),
                "project_ids": list(workspace.project_ids),
                "agent_ids": list(workspace.agent_ids),
                "capability_ids": list(workspace.capability_ids),
                "knowledge_boundary_summary": workspace.knowledge_boundary_summary,
                "local_first": workspace.local_first,
                "offline_capable": workspace.offline_capable,
                "asset_count": int(asset_counts.get(workspace.id, 0)),
                "relationship_count": int(relationship_counts.get(workspace.id, 0)),
            }
            for workspace in self.workspace_registry.list_workspaces()
        ]

    def companies(self) -> list[dict[str, object]]:
        if self.company_registry is None:
            return []

        return [
            {
                "company_id": company.id,
                "name": company.name,
                "mission": company.mission,
                "status": getattr(company.status, "value", str(company.status)),
                "lifecycle_state": getattr(company.lifecycle_state, "value", str(company.lifecycle_state)),
                "project_ids": list(company.project_ids),
                "capability_ids": list(company.capability_ids),
                "agent_ids": list(company.agent_ids),
                "operating_state": company.operating_state,
            }
            for company in self.company_registry.list_companies()
        ]

    def projects(self) -> list[dict[str, object]]:
        if self.project_registry is None:
            return []

        return [
            {
                "project_id": project.id,
                "name": project.name,
                "company_id": project.company_id,
                "status": getattr(project.status, "value", str(project.status)),
                "lifecycle_state": getattr(project.lifecycle_state, "value", str(project.lifecycle_state)),
                "capability_ids": list(project.capability_ids),
                "agent_ids": list(project.agent_ids),
                "mission": project.mission,
                "outcome": project.outcome,
                "next_action_summary": project.next_action_summary,
            }
            for project in self.project_registry.list_projects()
        ]

    def capabilities(self) -> list[dict[str, object]]:
        if self.capability_registry is None:
            return []

        return [
            {
                "capability_id": capability.id,
                "name": capability.name,
                "description": capability.description,
                "status": getattr(capability.status, "value", str(capability.status)),
                "lifecycle_state": getattr(capability.lifecycle_state, "value", str(capability.lifecycle_state)),
                "permission_level": getattr(capability.permission_level, "value", str(capability.permission_level)),
                "certification_status": getattr(capability.certification_status, "value", str(capability.certification_status)),
                "marketplace_ready": capability.marketplace_ready,
                "consumer_count": len(capability.consumers),
                "provider_count": len(capability.providers),
            }
            for capability in self.capability_registry.list_capabilities()
        ]

    def build_dashboard(self) -> dict[str, object]:
        return {
            "workspace_counts": self.workspace_counts(),
            "knowledge_asset_counts": self.knowledge_asset_counts(),
            "knowledge_relationship_counts": self.knowledge_relationship_counts(),
            "knowledge_assets": self.knowledge_assets(),
            "workspaces": self.workspaces(),
            "companies": self.companies(),
            "projects": self.projects(),
            "capabilities": self.capabilities(),
            "recent_workspace_activity": self.recent_workspace_activity(),
        }

    def _serialize_knowledge_asset(self, asset_id: str) -> dict[str, object]:
        asset = self.knowledge_engine.get_asset(asset_id)
        relationships = self.knowledge_engine.list_relationships(asset.id)
        return {
            "asset_id": asset.id,
            "title": asset.title,
            "asset_type": asset.asset_type,
            "workspace_id": asset.workspace_id,
            "company_id": asset.company_id,
            "project_id": asset.project_id,
            "source_record_id": asset.source_record_id,
            "tags": list(asset.tags),
            "citations": list(asset.citations),
            "safe_to_query": asset.safe_to_query,
            "relationship_count": len(relationships),
            "linked_asset_ids": sorted(
                {
                    relationship.target_asset_id
                    if relationship.source_asset_id == asset.id
                    else relationship.source_asset_id
                    for relationship in relationships
                }
            ),
        }

    def _all_relationships(self) -> set[tuple[str, str, str]]:
        return {
            (
                relationship.source_asset_id,
                relationship.target_asset_id,
                relationship.relationship_type,
            )
            for asset in self.knowledge_engine.list_assets()
            for relationship in self.knowledge_engine.list_relationships(asset.id)
        }

    def _relationship_touches_workspace(
        self,
        relationship: tuple[str, str, str],
        workspace_id: str,
    ) -> bool:
        source_asset = self.knowledge_engine.get_asset(relationship[0])
        target_asset = self.knowledge_engine.get_asset(relationship[1])
        return source_asset.workspace_id == workspace_id or target_asset.workspace_id == workspace_id

