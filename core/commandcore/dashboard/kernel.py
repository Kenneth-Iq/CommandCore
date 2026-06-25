"""Read-only kernel overview dashboard services for CommandCore."""

from __future__ import annotations

from dataclasses import dataclass

from commandcore.bootstrap import CommandCoreKernel
from commandcore.events import EventType

from .agents import AgentDashboardService
from .conversations import ConversationDashboardService
from .executive import ExecutiveDashboardService
from .missions import MissionDashboardService
from .workspaces import WorkspaceDashboardService


@dataclass(slots=True)
class KernelOverviewDashboardService:
    """Aggregate read-only dashboard services over a bootstrapped kernel."""

    kernel: CommandCoreKernel

    def executive_dashboard(self) -> dict[str, object]:
        return ExecutiveDashboardService(
            executive_reporting=self.kernel.executive_reporting,
            state_store=self.kernel.executive_state_store,
            audit_trail=self.kernel.audit_trail,
        ).build_dashboard()

    def mission_dashboard(self) -> dict[str, object]:
        return MissionDashboardService(
            mission_engine=self.kernel.mission_engine,
            audit_trail=self.kernel.audit_trail,
        ).build_dashboard()

    def workspace_dashboard(self) -> dict[str, object]:
        return WorkspaceDashboardService(
            workspace_registry=self.kernel.workspace_registry,
            knowledge_engine=self.kernel.knowledge_engine,
            audit_trail=self.kernel.audit_trail,
        ).build_dashboard()

    def conversation_dashboard(self) -> dict[str, object] | None:
        conversation_engine = getattr(self.kernel, "conversation_engine", None)
        if conversation_engine is None:
            return None
        return ConversationDashboardService(
            conversation_engine=conversation_engine,
            audit_trail=self.kernel.audit_trail,
        ).build_dashboard()

    def agent_dashboard(self) -> dict[str, object] | None:
        agent_runtime = getattr(self.kernel, "agent_runtime", None)
        if agent_runtime is None:
            return None
        return AgentDashboardService(
            agent_registry=self.kernel.agent_registry,
            agent_runtime=agent_runtime,
            audit_trail=self.kernel.audit_trail,
        ).build_dashboard()

    def knowledge_counts(self) -> dict[str, int]:
        relationships = {
            (
                relationship.source_asset_id,
                relationship.target_asset_id,
                relationship.relationship_type,
            )
            for asset in self.kernel.knowledge_engine.list_assets()
            for relationship in self.kernel.knowledge_engine.list_relationships(asset.id)
        }
        return {
            "asset_count": len(self.kernel.knowledge_engine.list_assets()),
            "relationship_count": len(relationships),
        }

    def audit_summary(self) -> dict[str, object]:
        entries = self.kernel.audit_trail.list_entries()
        return {
            "entry_count": len(entries),
            "by_type": {
                "domain": len(self.kernel.audit_trail.list_by_event_type(EventType.DOMAIN)),
                "lifecycle": len(self.kernel.audit_trail.list_by_event_type(EventType.LIFECYCLE)),
                "system": len(self.kernel.audit_trail.list_by_event_type(EventType.SYSTEM)),
            },
            "recent_entries": [
                {
                    "event_id": entry.id,
                    "event_name": entry.payload.get("event_name"),
                    "event_type": entry.type,
                    "source": entry.source,
                    "occurred_at": entry.occurred_at,
                }
                for entry in entries[-10:]
            ],
        }

    def build_overview(self) -> dict[str, object]:
        return {
            "executive_dashboard": self.executive_dashboard(),
            "mission_dashboard": self.mission_dashboard(),
            "workspace_dashboard": self.workspace_dashboard(),
            "conversation_dashboard": self.conversation_dashboard(),
            "agent_dashboard": self.agent_dashboard(),
            "knowledge_counts": self.knowledge_counts(),
            "health_snapshot": self.kernel.health_snapshot_builder(self.kernel),
            "audit_summary": self.audit_summary(),
        }
