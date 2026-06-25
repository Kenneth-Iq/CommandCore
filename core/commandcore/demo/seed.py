"""Seed realistic in-memory demo data into a CommandCore kernel."""

from __future__ import annotations

from typing import TYPE_CHECKING

from commandcore.contracts import (
    Agent,
    AgentRuntimeStatus,
    Capability,
    CapabilityCertificationStatus,
    Company,
    KnowledgeAsset,
    LifecycleState,
    Mission,
    MissionStatus,
    Ownership,
    OwnershipKind,
    PermissionLevel,
    Project,
    Status,
    Workspace,
)
from commandcore.events import Event, EventType
from commandcore.executive import Decision, Directive, Objective
from commandcore.tools import ToolPermission

if TYPE_CHECKING:
    from commandcore.bootstrap import CommandCoreKernel


def seed_demo_kernel(kernel: "CommandCoreKernel") -> "CommandCoreKernel":
    """Populate one in-memory kernel with useful demo data."""

    workspace = _ensure_workspace(kernel)
    company = _ensure_company(kernel)

    project_atlas = _ensure_project(
        kernel,
        project_id="proj-atlas",
        name="Project Atlas Recovery",
        mission="Restore steady-state kernel observability for live operations.",
    )
    project_sable = _ensure_project(
        kernel,
        project_id="proj-sable",
        name="Project Sable Launch",
        mission="Stage rollout readiness for the next operating window.",
    )

    capability_planning = _ensure_capability(
        kernel,
        capability_id="cap-planning",
        name="Strategic Planning",
        description="Compose operational plans and mission scopes.",
    )
    capability_analysis = _ensure_capability(
        kernel,
        capability_id="cap-analysis",
        name="Operational Analysis",
        description="Analyze readiness, incidents, and execution state.",
    )
    capability_ops = _ensure_capability(
        kernel,
        capability_id="cap-ops",
        name="Runtime Operations",
        description="Operate kernel services, tools, and recovery workflows.",
    )

    agent_jarvis = _ensure_agent(
        kernel,
        agent_id="agent-jarvis-ops",
        name="Jarvis Ops",
        role="executive-coordinator",
        permission_level=PermissionLevel.EXECUTIVE,
        capability_ids=[capability_planning.id, capability_ops.id],
    )
    agent_hermes = _ensure_agent(
        kernel,
        agent_id="agent-hermes-claw",
        name="Hermes-Claw",
        role="tooling-operator",
        permission_level=PermissionLevel.OPERATE,
        capability_ids=[capability_analysis.id, capability_ops.id],
    )
    agent_odysseus = _ensure_agent(
        kernel,
        agent_id="agent-odysseus",
        name="Odysseus",
        role="mission-strategist",
        permission_level=PermissionLevel.APPROVE,
        capability_ids=[capability_planning.id, capability_analysis.id],
    )

    _wire_relationships(
        kernel,
        workspace_id=workspace.id,
        company_id=company.id,
        project_ids=[project_atlas.id, project_sable.id],
        capability_ids=[
            capability_planning.id,
            capability_analysis.id,
            capability_ops.id,
        ],
        agent_capabilities={
            agent_jarvis.id: [capability_planning.id, capability_ops.id],
            agent_hermes.id: [capability_analysis.id, capability_ops.id],
            agent_odysseus.id: [capability_planning.id, capability_analysis.id],
        },
    )

    knowledge_runbook = _ensure_knowledge_asset(
        kernel,
        asset_id="know-runbook",
        title="Atlas Recovery Runbook",
        asset_type="runbook",
        workspace_id=workspace.id,
        company_id=company.id,
        project_id=project_atlas.id,
        tags=["atlas", "operations", "recovery"],
    )
    knowledge_incident = _ensure_knowledge_asset(
        kernel,
        asset_id="know-incident",
        title="Sable Incident Timeline",
        asset_type="report",
        workspace_id=workspace.id,
        company_id=company.id,
        project_id=project_sable.id,
        tags=["sable", "incident", "timeline"],
    )

    _ensure_objective(
        kernel,
        objective_id="obj-kernel-observability",
        title="Kernel Observability Stabilization",
        summary="Keep the live Nexus dashboards accurate, current, and operationally useful.",
        requested_by="jarvis",
        scope=[f"workspace:{workspace.id}", f"project:{project_atlas.id}"],
        priority="high",
    )
    _ensure_objective(
        kernel,
        objective_id="obj-agent-throughput",
        title="Agent Throughput Baseline",
        summary="Show healthy agent runtime activity and mission execution visibility.",
        requested_by="odysseus",
        scope=[f"workspace:{workspace.id}", f"project:{project_sable.id}"],
        priority="medium",
    )
    _ensure_directive(
        kernel,
        objective_id="obj-kernel-observability",
        directive_id="dir-kernel-observability",
        summary="Publish all demo lifecycle activity through the shared event bus.",
        issued_by="jarvis",
        directive_type="operational",
    )
    _ensure_decision(
        kernel,
        objective_id="obj-agent-throughput",
        decision_id="dec-agent-throughput",
        summary="Use in-memory runtimes only for live demo seeding.",
        decided_by="odysseus",
        decision_type="architecture",
        rationale="Keeps the API read-only while still exercising real kernel services.",
    )

    mission_atlas = _ensure_mission(
        kernel,
        mission_id="mission-atlas",
        title="Atlas Recovery Execution",
        status=MissionStatus.COMPLETED,
        requested_by="jarvis",
        scope=[f"workspace:{workspace.id}", f"project:{project_atlas.id}"],
        capability_ids=[capability_planning.id, capability_ops.id],
        assigned_agent_id=agent_jarvis.id,
        required_output="Readiness summary and event audit trail.",
    )
    mission_sable = _ensure_mission(
        kernel,
        mission_id="mission-sable",
        title="Sable Launch Readiness",
        status=MissionStatus.ASSIGNED,
        requested_by="odysseus",
        scope=[f"workspace:{workspace.id}", f"project:{project_sable.id}"],
        capability_ids=[capability_analysis.id],
        assigned_agent_id=agent_hermes.id,
        required_output="Launch-readiness assessment with linked knowledge references.",
    )
    _ensure_mission_completion(
        kernel,
        mission_id=mission_atlas.id,
        result_summary="Atlas recovery checks completed successfully.",
    )

    _ensure_mission_assignment_execution(
        kernel,
        agent_id=agent_jarvis.id,
        mission_id=mission_atlas.id,
        capability_id=capability_ops.id,
    )

    tool_diagnostics = _ensure_tool(
        kernel,
        tool_id="tool-diagnostics",
        name="Diagnostics Runner",
        description="Inspect kernel health and summarize live state.",
        capability_id=capability_ops.id,
        agent_id=agent_jarvis.id,
        permission_level=ToolPermission.SAFE,
    )
    _ensure_tool(
        kernel,
        tool_id="tool-reporter",
        name="Mission Reporter",
        description="Format mission and incident status into shareable outputs.",
        capability_id=capability_analysis.id,
        agent_id=agent_hermes.id,
        permission_level=ToolPermission.SAFE,
    )
    _ensure_tool(
        kernel,
        tool_id="tool-planner",
        name="Plan Composer",
        description="Draft operating plans from current scope and mission state.",
        capability_id=capability_planning.id,
        agent_id=agent_odysseus.id,
        permission_level=ToolPermission.RESTRICTED,
    )
    _ensure_tool_invocation(
        kernel,
        tool_id=tool_diagnostics.id,
        agent_id=agent_jarvis.id,
        invocation_id="invoke-diagnostics-demo",
    )

    _ensure_conversation(
        kernel,
        conversation_id="conv-ops-brief",
        thread_id="thread-ops-brief",
        context_id="ctx-ops-brief",
        workspace_id=workspace.id,
        company_id=company.id,
        project_id=project_atlas.id,
        objective_id="obj-kernel-observability",
        mission_id=mission_atlas.id,
        participant_ids=[agent_jarvis.id, agent_hermes.id],
        context_content="Kernel overview context for the Atlas recovery brief.",
        messages=[
            {
                "message_id": "msg-ops-1",
                "participant_id": agent_jarvis.id,
                "role": "system",
                "content": "Atlas recovery checks are complete and the kernel is stable.",
                "knowledge_asset_id": knowledge_runbook.id,
            },
            {
                "message_id": "msg-ops-2",
                "participant_id": agent_hermes.id,
                "role": "assistant",
                "content": "Tool diagnostics finished successfully and the audit trail is populated.",
                "knowledge_asset_id": knowledge_incident.id,
            },
        ],
    )
    _ensure_conversation(
        kernel,
        conversation_id="conv-strategy-sync",
        thread_id="thread-strategy-sync",
        context_id="ctx-strategy-sync",
        workspace_id=workspace.id,
        company_id=company.id,
        project_id=project_sable.id,
        objective_id="obj-agent-throughput",
        mission_id=mission_sable.id,
        participant_ids=[agent_odysseus.id, agent_jarvis.id],
        context_content="Readiness context for the Sable launch strategy sync.",
        messages=[
            {
                "message_id": "msg-strategy-1",
                "participant_id": agent_odysseus.id,
                "role": "user",
                "content": "Summarize the next mission steps for Sable launch readiness.",
                "knowledge_asset_id": knowledge_incident.id,
            },
            {
                "message_id": "msg-strategy-2",
                "participant_id": agent_jarvis.id,
                "role": "assistant",
                "content": "One mission remains active with supporting knowledge linked into the thread.",
                "knowledge_asset_id": knowledge_runbook.id,
            },
        ],
    )

    _publish_seed_event(kernel)
    return kernel


def _ensure_workspace(kernel: "CommandCoreKernel") -> Workspace:
    existing = _safe_get(kernel.workspace_registry.get_workspace, "ws-demo")
    if existing is not None:
        return existing
    return kernel.workspace_registry.register_workspace(
        Workspace(
            id="ws-demo",
            name="CommandCore Demo Workspace",
            status=Status.ACTIVE,
            ownership=_ownership(OwnershipKind.WORKSPACE, "ws-demo", "CommandCore Demo Workspace"),
        )
    )


def _ensure_company(kernel: "CommandCoreKernel") -> Company:
    existing = _safe_get(kernel.company_registry.get_company, "comp-demo")
    if existing is not None:
        return existing
    return kernel.company_registry.register_company(
        Company(
            id="comp-demo",
            name="CommandCore Industries",
            mission="Operate and govern a visible AI operating system kernel.",
            status=Status.ACTIVE,
            lifecycle_state=LifecycleState.ACTIVE,
            ownership=_ownership(OwnershipKind.COMPANY, "comp-demo", "CommandCore Industries"),
            goals=["Operational visibility", "Kernel governance", "Mission throughput"],
        )
    )


def _ensure_project(
    kernel: "CommandCoreKernel",
    *,
    project_id: str,
    name: str,
    mission: str,
) -> Project:
    existing = _safe_get(kernel.project_registry.get_project, project_id)
    if existing is not None:
        return existing
    return kernel.project_registry.register_project(
        Project(
            id=project_id,
            name=name,
            status=Status.ACTIVE,
            lifecycle_state=LifecycleState.ACTIVE,
            ownership=_ownership(OwnershipKind.PROJECT, project_id, name),
            company_id="comp-demo",
            mission=mission,
        )
    )


def _ensure_capability(
    kernel: "CommandCoreKernel",
    *,
    capability_id: str,
    name: str,
    description: str,
) -> Capability:
    existing = _safe_get(kernel.capability_registry.get_capability, capability_id)
    if existing is not None:
        return existing
    return kernel.capability_registry.register_capability(
        Capability(
            id=capability_id,
            name=name,
            description=description,
            status=Status.ACTIVE,
            lifecycle_state=LifecycleState.ACTIVE,
            ownership=_ownership(OwnershipKind.DOMAIN, capability_id, name),
            version="1.0.0",
            certification_status=CapabilityCertificationStatus.CERTIFIED,
            permission_level=PermissionLevel.OPERATE,
            inputs=["scope", "events"],
            outputs=["summaries", "actions"],
            providers=["commandcore"],
            consumers=["nexus-console"],
            marketplace_ready=False,
        )
    )


def _ensure_agent(
    kernel: "CommandCoreKernel",
    *,
    agent_id: str,
    name: str,
    role: str,
    permission_level: PermissionLevel,
    capability_ids: list[str],
) -> Agent:
    existing = _safe_get(kernel.agent_registry.get_agent, agent_id)
    if existing is not None:
        return existing
    return kernel.agent_registry.register_agent(
        Agent(
            id=agent_id,
            name=name,
            role=role,
            status=Status.ACTIVE,
            ownership=_ownership(OwnershipKind.TEAM, agent_id, name),
            runtime_status=AgentRuntimeStatus.AVAILABLE,
            permission_level=permission_level,
            capability_ids=capability_ids,
            state_summary="Seeded demo agent ready for in-memory runtime activity.",
        )
    )


def _wire_relationships(
    kernel: "CommandCoreKernel",
    *,
    workspace_id: str,
    company_id: str,
    project_ids: list[str],
    capability_ids: list[str],
    agent_capabilities: dict[str, list[str]],
) -> None:
    kernel.workspace_registry.add_company(workspace_id, company_id)
    for project_id in project_ids:
        kernel.workspace_registry.add_project(workspace_id, project_id)
        kernel.company_registry.add_project(company_id, project_id)
        for capability_id in capability_ids:
            kernel.project_registry.add_capability(project_id, capability_id)
    for capability_id in capability_ids:
        kernel.workspace_registry.add_capability(workspace_id, capability_id)
        kernel.company_registry.add_capability(company_id, capability_id)
    for agent_id, capability_ids_for_agent in agent_capabilities.items():
        kernel.workspace_registry.add_agent(workspace_id, agent_id)
        kernel.company_registry.add_agent(company_id, agent_id)
        for project_id in project_ids:
            kernel.project_registry.add_agent(project_id, agent_id)
        for capability_id in capability_ids_for_agent:
            kernel.agent_registry.add_capability(agent_id, capability_id)


def _ensure_knowledge_asset(
    kernel: "CommandCoreKernel",
    *,
    asset_id: str,
    title: str,
    asset_type: str,
    workspace_id: str,
    company_id: str,
    project_id: str,
    tags: list[str],
) -> KnowledgeAsset:
    existing = _safe_get(kernel.knowledge_engine.get_asset, asset_id)
    if existing is not None:
        return existing
    return kernel.knowledge_engine.add_asset(
        KnowledgeAsset(
            id=asset_id,
            title=title,
            asset_type=asset_type,
            ownership=_ownership(OwnershipKind.PROJECT, project_id, project_id),
            lifecycle_state=LifecycleState.ACTIVE,
            workspace_id=workspace_id,
            company_id=company_id,
            project_id=project_id,
            tags=tags,
            citations=["internal://demo"],
            safe_to_query=True,
        )
    )


def _ensure_objective(
    kernel: "CommandCoreKernel",
    *,
    objective_id: str,
    title: str,
    summary: str,
    requested_by: str,
    scope: list[str],
    priority: str,
) -> Objective:
    existing = _safe_get(kernel.executive_runtime.get_objective, objective_id)
    if existing is not None:
        return existing
    return kernel.executive_runtime.submit_objective(
        Objective(
            id=objective_id,
            title=title,
            summary=summary,
            requested_by=requested_by,
            scope=scope,
            priority=priority,
        )
    )


def _ensure_directive(
    kernel: "CommandCoreKernel",
    *,
    objective_id: str,
    directive_id: str,
    summary: str,
    issued_by: str,
    directive_type: str,
) -> None:
    if any(item.id == directive_id for item in kernel.executive_runtime.list_directives(objective_id)):
        return
    kernel.executive_runtime.create_directive(
        objective_id,
        Directive(
            id=directive_id,
            summary=summary,
            issued_by=issued_by,
            directive_type=directive_type,
        ),
    )


def _ensure_decision(
    kernel: "CommandCoreKernel",
    *,
    objective_id: str,
    decision_id: str,
    summary: str,
    decided_by: str,
    decision_type: str,
    rationale: str,
) -> None:
    if any(item.id == decision_id for item in kernel.executive_runtime.list_decisions(objective_id)):
        return
    kernel.executive_runtime.create_decision(
        objective_id,
        Decision(
            id=decision_id,
            summary=summary,
            decided_by=decided_by,
            decision_type=decision_type,
            rationale=rationale,
        ),
    )


def _ensure_mission(
    kernel: "CommandCoreKernel",
    *,
    mission_id: str,
    title: str,
    status: MissionStatus,
    requested_by: str,
    scope: list[str],
    capability_ids: list[str],
    assigned_agent_id: str,
    required_output: str,
) -> Mission:
    existing = _safe_get(kernel.mission_engine.get_mission, mission_id)
    if existing is not None:
        return existing
    return kernel.mission_engine.create_mission(
        Mission(
            id=mission_id,
            title=title,
            status=status,
            ownership=_ownership(OwnershipKind.PROJECT, mission_id, title),
            requested_by=requested_by,
            scope=scope,
            capability_ids=capability_ids,
            assigned_agent_id=assigned_agent_id,
            approval_required=False,
            required_output=required_output,
        )
    )


def _ensure_mission_completion(
    kernel: "CommandCoreKernel",
    *,
    mission_id: str,
    result_summary: str,
) -> None:
    mission = kernel.mission_engine.get_mission(mission_id)
    if mission.status == MissionStatus.COMPLETED and kernel.mission_engine.get_result_summary(
        mission_id
    ) == result_summary:
        return
    kernel.mission_engine.complete_mission(mission_id, result_summary=result_summary)


def _ensure_mission_assignment_execution(
    kernel: "CommandCoreKernel",
    *,
    agent_id: str,
    mission_id: str,
    capability_id: str,
) -> None:
    assignment = next(
        (
            item
            for item in kernel.agent_runtime.list_assignments()
            if item.agent_id == agent_id and item.mission_id == mission_id
        ),
        None,
    )
    if assignment is None:
        assignment = kernel.agent_mission_assignment_service.assign_agent_to_mission(
            agent_id,
            mission_id,
            capability_id=capability_id,
        )

    execution = next(
        (
            item
            for item in kernel.agent_runtime.list_executions()
            if item.agent_id == agent_id and item.mission_id == mission_id
        ),
        None,
    )
    if execution is None:
        execution = kernel.agent_mission_assignment_service.start_mission_task_execution(
            assignment.id,
            input_payload={"mode": "demo", "mission_id": mission_id},
        )
    if execution.status != "completed":
        kernel.agent_mission_assignment_service.complete_mission_task_execution(
            execution.id,
            output_payload={"result": "demo-success"},
        )


def _ensure_tool(
    kernel: "CommandCoreKernel",
    *,
    tool_id: str,
    name: str,
    description: str,
    capability_id: str,
    agent_id: str,
    permission_level: ToolPermission,
):
    existing = _safe_get(kernel.tool_registry.get_tool, tool_id)
    if existing is not None:
        return existing
    return kernel.tool_registry.register_tool(
        tool_id=tool_id,
        name=name,
        description=description,
        capability_id=capability_id,
        agent_id=agent_id,
        input_schema={"type": "object"},
        output_schema={"type": "object"},
        permission_level=permission_level,
    )


def _ensure_tool_invocation(
    kernel: "CommandCoreKernel",
    *,
    tool_id: str,
    agent_id: str,
    invocation_id: str,
) -> None:
    invocation = next(
        (
            item
            for item in kernel.tool_runtime.list_invocations()
            if item.id == invocation_id
        ),
        None,
    )
    if invocation is None:
        invocation = kernel.tool_runtime.create_invocation(
            tool_id,
            invocation_id=invocation_id,
            agent_id=agent_id,
            input_payload={"target": "kernel", "mode": "demo"},
        )
        kernel.tool_runtime.start_invocation(invocation.id)
        kernel.tool_runtime.complete_invocation(
            invocation.id,
            output_payload={"summary": "All demo systems operational."},
        )


def _ensure_conversation(
    kernel: "CommandCoreKernel",
    *,
    conversation_id: str,
    thread_id: str,
    context_id: str,
    workspace_id: str,
    company_id: str,
    project_id: str,
    objective_id: str,
    mission_id: str,
    participant_ids: list[str],
    context_content: str,
    messages: list[dict[str, str]],
) -> None:
    conversation = _safe_get(kernel.conversation_engine.get_conversation, conversation_id)
    if conversation is None:
        conversation = kernel.conversation_engine.create_conversation(
            conversation_id=conversation_id,
            workspace_id=workspace_id,
            company_id=company_id,
            project_id=project_id,
            objective_id=objective_id,
            mission_id=mission_id,
            participant_ids=participant_ids,
            metadata={"seeded": True},
        )

    thread = _safe_get(kernel.conversation_engine.get_thread, thread_id)
    if thread is None:
        thread = kernel.conversation_engine.create_thread(
            conversation.id,
            thread_id=thread_id,
            participant_ids=participant_ids,
            metadata={"seeded": True},
        )

    if not any(context.id == context_id for context in kernel.conversation_engine.list_contexts()):
        kernel.conversation_engine.attach_context(
            conversation.id,
            context_id=context_id,
            thread_id=thread.id,
            workspace_id=workspace_id,
            company_id=company_id,
            project_id=project_id,
            objective_id=objective_id,
            mission_id=mission_id,
            content=context_content,
            metadata={"seeded": True},
        )

    for message_payload in messages:
        message = _safe_get(kernel.conversation_engine.get_message, message_payload["message_id"])
        if message is None:
            message = kernel.conversation_engine.add_message(
                conversation.id,
                thread.id,
                message_id=message_payload["message_id"],
                participant_id=message_payload["participant_id"],
                role=message_payload["role"],
                content=message_payload["content"],
                metadata={"seeded": True},
            )
        linked_assets = {
            link.knowledge_asset_id
            for link in kernel.conversation_engine.list_knowledge_links(message_id=message.id)
        }
        if message_payload["knowledge_asset_id"] not in linked_assets:
            kernel.conversation_engine.link_message_to_knowledge(
                message.id,
                message_payload["knowledge_asset_id"],
            )


def _publish_seed_event(kernel: "CommandCoreKernel") -> None:
    if any(event.source == "commandcore.demo.seed" for event in kernel.event_bus.list_events()):
        return
    kernel.event_bus.publish(
        Event(
            type=EventType.SYSTEM,
            source="commandcore.demo.seed",
            payload={
                "event_name": "DemoKernelSeeded",
                "workspace_id": "ws-demo",
                "company_id": "comp-demo",
            },
        )
    )


def _safe_get(getter, identifier: str):
    try:
        return getter(identifier)
    except KeyError:
        return None


def _ownership(kind: OwnershipKind, reference: str, display_name: str) -> Ownership:
    return Ownership(kind=kind, reference=reference, display_name=display_name)
