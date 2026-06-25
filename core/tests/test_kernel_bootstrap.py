from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.agents import AgentMissionAssignmentService, InMemoryAgentRuntime
from commandcore.bootstrap import CommandCoreKernel, create_in_memory_kernel
from commandcore.audit import InMemoryAuditTrail
from commandcore.conversations import InMemoryConversationEngine
from commandcore.contracts import (
    Agent,
    AgentRuntimeStatus,
    KnowledgeAsset,
    LifecycleState,
    Mission,
    MissionStatus,
    Ownership,
    OwnershipKind,
    PermissionLevel,
)
from commandcore.events import InMemoryEventBus
from commandcore.eventstore import InMemoryEventStore
from commandcore.executive import (
    ExecutiveMissionOrchestrator,
    ExecutivePolicyEngine,
    ExecutivePolicyGate,
    ExecutiveReportingService,
    ExecutiveRuntime,
    ExecutiveStateStore,
    Objective,
    PolicyDecision,
    PolicyRule,
)
from commandcore.knowledge import InMemoryKnowledgeEngine
from commandcore.mission import MissionEngine
from commandcore.registries import (
    AgentRegistry,
    CapabilityRegistry,
    CompanyRegistry,
    ProjectRegistry,
    WorkspaceRegistry,
)


def make_objective(objective_id: str) -> Objective:
    return Objective(
        id=objective_id,
        title="Resolve blockers",
        summary="Review current delivery blockers.",
        requested_by="jarvis",
        scope=["project:proj-1"],
        priority="high",
    )


def make_ownership() -> Ownership:
    return Ownership(
        kind=OwnershipKind.DOMAIN,
        reference="commandcore.architecture",
        display_name="CommandCore Architecture",
    )


def make_agent(agent_id: str) -> Agent:
    return Agent(
        id=agent_id,
        name="Hermes Worker",
        role="engineering",
        status="active",
        ownership=make_ownership(),
        runtime_status=AgentRuntimeStatus.AVAILABLE,
        permission_level=PermissionLevel.OPERATE,
        capability_ids=["cap-search"],
    )


def make_mission(mission_id: str) -> Mission:
    return Mission(
        id=mission_id,
        title=mission_id,
        status=MissionStatus.REQUESTED,
        ownership=make_ownership(),
        requested_by="jarvis",
        scope=["project:proj-jarvis"],
        capability_ids=["cap-search"],
        approval_required=True,
        required_output="summary",
    )


def test_create_in_memory_kernel_returns_expected_component_types():
    kernel = create_in_memory_kernel()

    assert isinstance(kernel, CommandCoreKernel)
    assert isinstance(kernel.event_bus, InMemoryEventBus)
    assert isinstance(kernel.event_store, InMemoryEventStore)
    assert isinstance(kernel.capability_registry, CapabilityRegistry)
    assert isinstance(kernel.agent_registry, AgentRegistry)
    assert isinstance(kernel.company_registry, CompanyRegistry)
    assert isinstance(kernel.project_registry, ProjectRegistry)
    assert isinstance(kernel.workspace_registry, WorkspaceRegistry)
    assert isinstance(kernel.knowledge_engine, InMemoryKnowledgeEngine)
    assert isinstance(kernel.conversation_engine, InMemoryConversationEngine)
    assert isinstance(kernel.agent_runtime, InMemoryAgentRuntime)
    assert isinstance(kernel.agent_mission_assignment_service, AgentMissionAssignmentService)
    assert isinstance(kernel.mission_engine, MissionEngine)
    assert isinstance(kernel.audit_trail, InMemoryAuditTrail)
    assert callable(kernel.health_snapshot_builder)
    assert isinstance(kernel.executive_reporting, ExecutiveReportingService)
    assert isinstance(kernel.executive_policy_engine, ExecutivePolicyEngine)
    assert isinstance(kernel.executive_policy_gate, ExecutivePolicyGate)
    assert isinstance(kernel.executive_state_store, ExecutiveStateStore)
    assert isinstance(kernel.executive_runtime, ExecutiveRuntime)
    assert isinstance(kernel.executive_orchestrator, ExecutiveMissionOrchestrator)


def test_create_in_memory_kernel_shares_one_event_bus_across_components():
    kernel = create_in_memory_kernel()

    assert kernel.event_bus.event_store is kernel.event_store
    assert kernel.capability_registry.event_bus is kernel.event_bus
    assert kernel.agent_registry.event_bus is kernel.event_bus
    assert kernel.company_registry.event_bus is kernel.event_bus
    assert kernel.project_registry.event_bus is kernel.event_bus
    assert kernel.workspace_registry.event_bus is kernel.event_bus
    assert kernel.knowledge_engine._event_bus is kernel.event_bus
    assert kernel.conversation_engine.event_bus is kernel.event_bus
    assert kernel.conversation_engine.knowledge_engine is kernel.knowledge_engine
    assert kernel.agent_runtime.event_bus is kernel.event_bus
    assert kernel.agent_runtime.agent_registry is kernel.agent_registry
    assert kernel.agent_mission_assignment_service.agent_runtime is kernel.agent_runtime
    assert kernel.agent_mission_assignment_service.agent_registry is kernel.agent_registry
    assert kernel.agent_mission_assignment_service.mission_engine is kernel.mission_engine
    assert kernel.agent_mission_assignment_service.event_bus is kernel.event_bus
    assert kernel.mission_engine.event_bus is kernel.event_bus
    assert kernel.executive_policy_engine.event_bus is kernel.event_bus
    assert kernel.executive_policy_gate.event_bus is kernel.event_bus
    assert kernel.executive_state_store.event_bus is kernel.event_bus
    assert kernel.executive_runtime.event_bus is kernel.event_bus
    assert kernel.executive_orchestrator.event_bus is kernel.event_bus


def test_create_in_memory_kernel_attaches_audit_trail_to_shared_event_bus():
    kernel = create_in_memory_kernel()

    kernel.executive_runtime.submit_objective(make_objective("obj-1"))

    assert kernel.audit_trail.list_entries() == kernel.event_bus.list_events()
    assert [stored.event for stored in kernel.event_store.read_all()] == kernel.event_bus.list_events()


def test_create_in_memory_kernel_wires_orchestrator_to_bootstrapped_policy_and_state():
    kernel = create_in_memory_kernel()

    assert kernel.executive_orchestrator.policy_gate is kernel.executive_policy_gate
    assert kernel.executive_orchestrator.state_store is kernel.executive_state_store
    assert kernel.executive_orchestrator.executive_runtime is kernel.executive_runtime
    assert kernel.executive_orchestrator.mission_engine is kernel.mission_engine
    assert kernel.executive_reporting.executive_runtime is kernel.executive_runtime
    assert kernel.executive_reporting.mission_engine is kernel.mission_engine
    assert kernel.executive_reporting.policy_engine is kernel.executive_policy_engine
    assert kernel.executive_reporting.state_store is kernel.executive_state_store


def test_create_in_memory_kernel_policy_engine_publishes_to_shared_event_bus():
    kernel = create_in_memory_kernel()
    kernel.executive_policy_engine.add_rule(
        PolicyRule(
            id="rule-1",
            target_type="objective",
            field_name="priority",
            expected_value="high",
            decision=PolicyDecision.WARN,
            message="High-priority objectives require review.",
        )
    )

    result = kernel.executive_policy_engine.evaluate_objective(make_objective("obj-1"))

    assert result.decision == PolicyDecision.WARN
    event = kernel.event_bus.list_events()[-1]
    assert event.payload["event_name"] == "ExecutivePolicyEvaluated"
    assert event.payload["target_type"] == "objective"
    assert event.payload["target_id"] == "obj-1"
    assert event.payload["decision"] == PolicyDecision.WARN


def test_create_in_memory_kernel_orchestrator_uses_bootstrapped_governance_components():
    kernel = create_in_memory_kernel()
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

    result = kernel.executive_orchestrator.submit_objective(make_objective("obj-1"))

    assert result.status == "allowed_with_warnings"
    assert result.warnings == ["High-priority objectives require review."]
    assert kernel.executive_state_store.get_objective_history()["obj-1"][0].id == "obj-1"
    assert kernel.executive_state_store.get_mission_history("obj-1") == [result.mission_id]


def test_create_in_memory_kernel_exposes_bound_observability_helpers():
    kernel = create_in_memory_kernel()

    kernel.executive_runtime.submit_objective(make_objective("obj-1"))
    objective_report = kernel.executive_reporting.build_objective_report()
    health_snapshot = kernel.health_snapshot_builder(kernel)

    assert objective_report["objective_count"] == 1
    assert health_snapshot["executive_report_available"] is True


def test_conversation_events_flow_to_audit_trail_and_event_store():
    kernel = create_in_memory_kernel()
    conversation = kernel.conversation_engine.create_conversation(
        conversation_id="conv-1",
        participant_ids=["jarvis"],
    )
    thread = kernel.conversation_engine.create_thread(conversation.id, thread_id="thread-1")
    message = kernel.conversation_engine.add_message(
        conversation.id,
        thread.id,
        message_id="msg-1",
        participant_id="jarvis",
        role="assistant",
        content="Wire context visibility.",
    )
    kernel.knowledge_engine.add_asset(
        KnowledgeAsset(
            id="know-external",
            title="Conversation Knowledge Link",
            asset_type="runbook",
            ownership=make_ownership(),
            lifecycle_state=LifecycleState.ACTIVE,
            workspace_id="ws-local",
            safe_to_query=True,
        )
    )
    kernel.conversation_engine.link_message_to_knowledge(message.id, "know-external")

    event_names = [event.payload["event_name"] for event in kernel.event_bus.list_events()]
    assert "ConversationCreated" in event_names
    assert "ConversationThreadCreated" in event_names
    assert "ConversationMessageAdded" in event_names
    assert "ConversationKnowledgeLinked" in event_names
    assert [stored.event for stored in kernel.event_store.read_all()] == kernel.event_bus.list_events()
    assert kernel.audit_trail.list_entries() == kernel.event_bus.list_events()


def test_agent_runtime_events_flow_to_audit_trail_and_event_store():
    kernel = create_in_memory_kernel()
    kernel.agent_registry.register_agent(make_agent("agent-hermes"))
    kernel.mission_engine.create_mission(make_mission("mission-1"))
    assignment = kernel.agent_mission_assignment_service.assign_agent_to_mission(
        "agent-hermes",
        "mission-1",
    )
    execution = kernel.agent_mission_assignment_service.start_mission_task_execution(assignment.id)
    kernel.agent_mission_assignment_service.complete_mission_task_execution(
        execution.id,
        output_payload={"summary": "done"},
    )

    event_names = [event.payload["event_name"] for event in kernel.event_bus.list_events()]
    assert "AgentAssigned" in event_names
    assert "AgentMissionAssigned" in event_names
    assert "AgentExecutionStarted" in event_names
    assert "AgentMissionExecutionStarted" in event_names
    assert "AgentExecutionCompleted" in event_names
    assert "AgentMissionExecutionCompleted" in event_names
    assert [stored.event for stored in kernel.event_store.read_all()] == kernel.event_bus.list_events()
    assert kernel.audit_trail.list_entries() == kernel.event_bus.list_events()
