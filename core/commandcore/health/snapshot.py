"""In-memory kernel health snapshot helpers for CommandCore."""

from __future__ import annotations

from commandcore.bootstrap import CommandCoreKernel


def build_kernel_health_snapshot(kernel: CommandCoreKernel) -> dict[str, object]:
    """Build a point-in-time health snapshot from the in-memory kernel."""

    return {
        "event_count": len(kernel.event_bus.list_events()),
        "registry_entity_counts": {
            "capabilities": len(kernel.capability_registry.list_capabilities()),
            "agents": len(kernel.agent_registry.list_agents()),
            "companies": len(kernel.company_registry.list_companies()),
            "projects": len(kernel.project_registry.list_projects()),
            "workspaces": len(kernel.workspace_registry.list_workspaces()),
        },
        "knowledge_asset_count": len(kernel.knowledge_engine.list_assets()),
        "mission_count": len(kernel.mission_engine.list_missions()),
        "executive_objective_count": len(kernel.executive_runtime.list_objectives()),
        "policy_rule_count": len(kernel.executive_policy_engine.list_rules()),
    }
