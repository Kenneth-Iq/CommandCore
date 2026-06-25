"""In-memory kernel health snapshot helpers for CommandCore."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from commandcore.bootstrap import CommandCoreKernel


def build_kernel_health_snapshot(kernel: "CommandCoreKernel") -> dict[str, object]:
    """Build a point-in-time health snapshot from the in-memory kernel."""

    event_store = getattr(kernel, "event_store", None)
    agent_runtime = getattr(kernel, "agent_runtime", None)
    return {
        "event_count": len(kernel.event_bus.list_events()),
        "event_store_available": event_store is not None,
        "event_store_event_count": len(event_store.read_all()) if event_store is not None else 0,
        "audit_entry_count": len(kernel.audit_trail.list_entries()),
        "registry_entity_counts": {
            "capabilities": len(kernel.capability_registry.list_capabilities()),
            "agents": len(kernel.agent_registry.list_agents()),
            "companies": len(kernel.company_registry.list_companies()),
            "projects": len(kernel.project_registry.list_projects()),
            "workspaces": len(kernel.workspace_registry.list_workspaces()),
        },
        "knowledge_asset_count": len(kernel.knowledge_engine.list_assets()),
        "mission_count": len(kernel.mission_engine.list_missions()),
        "agent_runtime_available": agent_runtime is not None,
        "agent_assignment_count": len(agent_runtime.list_assignments()) if agent_runtime is not None else 0,
        "agent_execution_count": len(agent_runtime.list_executions()) if agent_runtime is not None else 0,
        "executive_objective_count": len(kernel.executive_runtime.list_objectives()),
        "policy_rule_count": len(kernel.executive_policy_engine.list_rules()),
        "executive_report_available": kernel.executive_reporting is not None,
        "policy_gate_available": kernel.executive_policy_gate is not None,
        "state_store_available": kernel.executive_state_store is not None,
        "orchestrator_available": kernel.executive_orchestrator is not None,
    }
