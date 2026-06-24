"""In-memory kernel readiness helpers for CommandCore."""

from __future__ import annotations


def build_kernel_readiness_report(kernel: object) -> dict[str, object]:
    """Build a point-in-time readiness report for a bootstrapped kernel."""

    blocking_issues: list[str] = []
    warnings: list[str] = []

    checks = {
        "event_bus": getattr(kernel, "event_bus", None) is not None,
        "registries": all(
            getattr(kernel, name, None) is not None
            for name in (
                "capability_registry",
                "agent_registry",
                "company_registry",
                "project_registry",
                "workspace_registry",
            )
        ),
        "knowledge_engine": getattr(kernel, "knowledge_engine", None) is not None,
        "mission_engine": getattr(kernel, "mission_engine", None) is not None,
        "executive_runtime": getattr(kernel, "executive_runtime", None) is not None,
        "policy_gate": getattr(kernel, "executive_policy_gate", None) is not None,
        "state_store": getattr(kernel, "executive_state_store", None) is not None,
        "audit_trail": getattr(kernel, "audit_trail", None) is not None,
        "dashboards": all(
            getattr(kernel, name, None) is not None
            for name in ("executive_reporting", "health_snapshot_builder")
        ),
    }

    for check_name, passed in checks.items():
        if not passed:
            blocking_issues.append(f"Missing required kernel component: {check_name}.")

    dashboard_availability = {
        "executive_reporting": getattr(kernel, "executive_reporting", None) is not None,
        "kernel_overview": True,
    }
    if not dashboard_availability["executive_reporting"]:
        blocking_issues.append("Executive reporting service is unavailable.")

    summary_counts = {
        "event_count": len(kernel.event_bus.list_events()) if checks["event_bus"] else 0,
        "audit_entry_count": len(kernel.audit_trail.list_entries()) if checks["audit_trail"] else 0,
        "workspace_count": len(kernel.workspace_registry.list_workspaces()) if getattr(kernel, "workspace_registry", None) is not None else 0,
        "company_count": len(kernel.company_registry.list_companies()) if getattr(kernel, "company_registry", None) is not None else 0,
        "capability_count": len(kernel.capability_registry.list_capabilities()) if getattr(kernel, "capability_registry", None) is not None else 0,
        "agent_count": len(kernel.agent_registry.list_agents()) if getattr(kernel, "agent_registry", None) is not None else 0,
        "project_count": len(kernel.project_registry.list_projects()) if getattr(kernel, "project_registry", None) is not None else 0,
        "knowledge_asset_count": len(kernel.knowledge_engine.list_assets()) if checks["knowledge_engine"] else 0,
        "mission_count": len(kernel.mission_engine.list_missions()) if checks["mission_engine"] else 0,
        "executive_objective_count": len(kernel.executive_runtime.list_objectives()) if checks["executive_runtime"] else 0,
        "policy_rule_count": len(kernel.executive_policy_engine.list_rules()) if getattr(kernel, "executive_policy_engine", None) is not None else 0,
    }

    if checks["event_bus"] and checks["audit_trail"] and summary_counts["event_count"] != summary_counts["audit_entry_count"]:
        warnings.append("Audit trail entry count does not match the event bus event count.")
    if summary_counts["workspace_count"] == 0:
        warnings.append("No workspaces are registered in the kernel.")
    if summary_counts["knowledge_asset_count"] == 0:
        warnings.append("No knowledge assets are stored in the kernel.")
    if summary_counts["mission_count"] == 0:
        warnings.append("No missions have been created in the kernel.")
    if summary_counts["executive_objective_count"] == 0:
        warnings.append("No executive objectives have been submitted in the kernel.")
    if summary_counts["policy_rule_count"] == 0:
        warnings.append("No executive policy rules are configured in the kernel.")

    if not blocking_issues:
        from commandcore.dashboard import KernelOverviewDashboardService

        dashboard_overview = KernelOverviewDashboardService(kernel).build_overview()
    else:
        dashboard_overview = None

    status = "blocked" if blocking_issues else "warning" if warnings else "ready"
    return {
        "status": status,
        "checks": checks,
        "summary_counts": summary_counts,
        "blocking_issues": blocking_issues,
        "warnings": warnings,
        "dashboard_availability": dashboard_availability,
        "health_snapshot": kernel.health_snapshot_builder(kernel) if getattr(kernel, "health_snapshot_builder", None) is not None else None,
        "kernel_overview_available": dashboard_overview is not None,
    }
