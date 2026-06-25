"""In-memory Alpha-3 kernel demo for CommandCore."""

from __future__ import annotations

import json
import sys
from pathlib import Path

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
    Ownership,
    OwnershipKind,
    PermissionLevel,
    Project,
    Status,
    Workspace,
)
from commandcore.dashboard import KernelOverviewDashboardService
from commandcore.executive import Objective, PolicyDecision, PolicyRule
from commandcore.health import build_kernel_readiness_report
from commandcore.tools import ToolPermission


def make_ownership() -> Ownership:
    return Ownership(
        kind=OwnershipKind.DOMAIN,
        reference="commandcore.architecture",
        display_name="CommandCore Architecture",
    )


def run_demo() -> dict[str, object]:
    """Build a representative Alpha-3 in-memory kernel state."""

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
            mission="Advance the CommandCore platform mission.",
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
            id="proj-commandcore",
            name="CommandCore",
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
            title="Alpha-3 Launch Runbook",
            asset_type="runbook",
            ownership=make_ownership(),
            lifecycle_state=LifecycleState.ACTIVE,
            workspace_id="ws-local",
            company_id="mindx",
            project_id="proj-commandcore",
            safe_to_query=True,
        )
    )
    kernel.executive_policy_engine.add_rule(
        PolicyRule(
            id="warn-high-priority",
            target_type="objective",
            field_name="priority",
            expected_value="high",
            decision=PolicyDecision.WARN,
            message="High-priority objectives require review.",
        )
    )

    orchestration = kernel.executive_orchestrator.submit_objective(
        Objective(
            id="obj-alpha3",
            title="Prepare Alpha-3 kernel release review",
            summary="Review kernel readiness and produce release summary.",
            requested_by="jarvis",
            scope=["company:mindx", "project:proj-commandcore"],
            priority="high",
        )
    )
    kernel.mission_engine.complete_mission(
        orchestration.mission_id,
        result_summary="Alpha-3 kernel release review completed.",
    )
    kernel.executive_orchestrator.get_mission_status_for_objective("obj-alpha3")

    assignment = kernel.agent_runtime.assign_agent(
        assignment_id="assign-alpha3-demo",
        agent_id="agent-hermes",
        mission_id=orchestration.mission_id,
        capability_id="cap-search",
        input_payload={"objective_id": "obj-alpha3", "mode": "demo"},
    )
    execution = kernel.agent_runtime.start_execution(
        assignment.id,
        execution_id="exec-alpha3-demo",
    )
    kernel.agent_runtime.complete_execution(
        execution.id,
        output_payload={"summary": "Alpha-3 demo runtime execution completed."},
    )

    tool = kernel.tool_registry.register_tool(
        tool_id="tool-alpha3-search",
        name="Knowledge Search",
        description="Search launch knowledge for the demo.",
        capability_id="cap-search",
        agent_id="agent-hermes",
        permission_level=ToolPermission.SAFE,
    )
    tool_invocation = kernel.tool_runtime.create_invocation(
        tool.id,
        invocation_id="invoke-alpha3-demo",
        input_payload={"query": "launch readiness"},
    )
    kernel.tool_runtime.start_invocation(tool_invocation.id)
    kernel.tool_runtime.complete_invocation(
        tool_invocation.id,
        output_payload={"matches": 1, "summary": "Alpha-3 demo tool invocation completed."},
    )

    dashboard_summary = KernelOverviewDashboardService(kernel).build_overview()
    readiness_summary = build_kernel_readiness_report(kernel)
    return {
        "kernel": kernel,
        "orchestration": orchestration,
        "dashboard_summary": dashboard_summary,
        "readiness_summary": readiness_summary,
    }


def main() -> int:
    demo = run_demo()
    print("CommandCore Alpha-3 Kernel Demo")
    print()
    print("Dashboard Summary")
    print(json.dumps(demo["dashboard_summary"], indent=2, default=str))
    print()
    print("Health and Readiness Summary")
    print(json.dumps(demo["readiness_summary"], indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
