"""Read-only API route registration for the CommandCore kernel."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.encoders import jsonable_encoder

from commandcore.bootstrap import CommandCoreKernel
from commandcore.dashboard import (
    AgentDashboardService,
    ConversationDashboardService,
    ExecutiveDashboardService,
    KernelOverviewDashboardService,
    MissionDashboardService,
    ToolDashboardService,
    WorkspaceDashboardService,
)
from commandcore.health import build_kernel_health_snapshot, build_kernel_readiness_report

from .schemas import DashboardResponse, HealthResponse, ReadinessResponse


def build_router(kernel: CommandCoreKernel) -> APIRouter:
    """Create one API router bound to a bootstrapped kernel."""

    router = APIRouter()

    @router.get("/health", response_model=HealthResponse)
    def get_health() -> dict[str, object]:
        return jsonable_encoder(build_kernel_health_snapshot(kernel))

    @router.get("/readiness", response_model=ReadinessResponse)
    def get_readiness() -> dict[str, object]:
        return jsonable_encoder(build_kernel_readiness_report(kernel))

    @router.get("/dashboard/kernel", response_model=DashboardResponse)
    def get_kernel_dashboard() -> dict[str, object]:
        return jsonable_encoder(KernelOverviewDashboardService(kernel).build_overview())

    @router.get("/dashboard/executive", response_model=DashboardResponse)
    def get_executive_dashboard() -> dict[str, object]:
        return jsonable_encoder(
            ExecutiveDashboardService(
                executive_reporting=kernel.executive_reporting,
                state_store=kernel.executive_state_store,
                audit_trail=kernel.audit_trail,
            ).build_dashboard()
        )

    @router.get("/dashboard/missions", response_model=DashboardResponse)
    def get_mission_dashboard() -> dict[str, object]:
        return jsonable_encoder(
            MissionDashboardService(
                mission_engine=kernel.mission_engine,
                audit_trail=kernel.audit_trail,
                agent_runtime=kernel.agent_runtime,
            ).build_dashboard()
        )

    @router.get("/dashboard/agents", response_model=DashboardResponse)
    def get_agent_dashboard() -> dict[str, object]:
        return jsonable_encoder(
            AgentDashboardService(
                agent_registry=kernel.agent_registry,
                agent_runtime=kernel.agent_runtime,
                audit_trail=kernel.audit_trail,
            ).build_dashboard()
        )

    @router.get("/dashboard/tools", response_model=DashboardResponse)
    def get_tool_dashboard() -> dict[str, object]:
        return jsonable_encoder(
            ToolDashboardService(
                tool_registry=kernel.tool_registry,
                tool_runtime=kernel.tool_runtime,
                audit_trail=kernel.audit_trail,
            ).build_dashboard()
        )

    @router.get("/dashboard/conversations", response_model=DashboardResponse)
    def get_conversation_dashboard() -> dict[str, object]:
        return jsonable_encoder(
            ConversationDashboardService(
                conversation_engine=kernel.conversation_engine,
                audit_trail=kernel.audit_trail,
            ).build_dashboard()
        )

    @router.get("/dashboard/workspaces", response_model=DashboardResponse)
    def get_workspace_dashboard() -> dict[str, object]:
        return jsonable_encoder(
            WorkspaceDashboardService(
                workspace_registry=kernel.workspace_registry,
                knowledge_engine=kernel.knowledge_engine,
                audit_trail=kernel.audit_trail,
                company_registry=kernel.company_registry,
                project_registry=kernel.project_registry,
                capability_registry=kernel.capability_registry,
            ).build_dashboard()
        )

    @router.get("/dashboard/knowledge", response_model=DashboardResponse)
    def get_knowledge_dashboard() -> dict[str, object]:
        workspace_dashboard = WorkspaceDashboardService(
            workspace_registry=kernel.workspace_registry,
            knowledge_engine=kernel.knowledge_engine,
            audit_trail=kernel.audit_trail,
            company_registry=kernel.company_registry,
            project_registry=kernel.project_registry,
            capability_registry=kernel.capability_registry,
        ).build_dashboard()
        kernel_overview = KernelOverviewDashboardService(kernel)
        payload = {
            "knowledge_counts": kernel_overview.knowledge_counts(),
            "workspace_counts": workspace_dashboard["workspace_counts"],
            "knowledge_asset_counts": workspace_dashboard["knowledge_asset_counts"],
            "knowledge_relationship_counts": workspace_dashboard["knowledge_relationship_counts"],
            "knowledge_assets": workspace_dashboard["knowledge_assets"],
            "workspaces": workspace_dashboard["workspaces"],
            "companies": workspace_dashboard["companies"],
            "projects": workspace_dashboard["projects"],
            "capabilities": workspace_dashboard["capabilities"],
            "recent_workspace_activity": workspace_dashboard["recent_workspace_activity"],
        }
        return jsonable_encoder(payload)

    return router
