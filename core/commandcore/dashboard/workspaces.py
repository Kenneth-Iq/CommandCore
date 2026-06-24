"""Read-only workspace dashboard services for CommandCore."""

from __future__ import annotations

from dataclasses import dataclass

from commandcore.audit import InMemoryAuditTrail
from commandcore.events import Event
from commandcore.knowledge import InMemoryKnowledgeEngine
from commandcore.registries import WorkspaceRegistry


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
            self._serialize_event(event)
            for event in self.audit_trail.list_entries()
            if event.payload.get("event_name") in WORKSPACE_ACTIVITY_EVENTS
        ]
        return events[-limit:]

    def build_dashboard(self) -> dict[str, object]:
        return {
            "workspace_counts": self.workspace_counts(),
            "knowledge_asset_counts": self.knowledge_asset_counts(),
            "knowledge_relationship_counts": self.knowledge_relationship_counts(),
            "recent_workspace_activity": self.recent_workspace_activity(),
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

    @staticmethod
    def _serialize_event(event: Event) -> dict[str, object]:
        return {
            "event_id": event.id,
            "event_name": event.payload.get("event_name"),
            "source": event.source,
            "occurred_at": event.occurred_at,
            "payload": dict(event.payload),
        }
