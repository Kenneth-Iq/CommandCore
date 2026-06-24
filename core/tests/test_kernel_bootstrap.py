from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.bootstrap import CommandCoreKernel, create_in_memory_kernel
from commandcore.audit import InMemoryAuditTrail
from commandcore.events import InMemoryEventBus
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


def test_create_in_memory_kernel_returns_expected_component_types():
    kernel = create_in_memory_kernel()

    assert isinstance(kernel, CommandCoreKernel)
    assert isinstance(kernel.event_bus, InMemoryEventBus)
    assert isinstance(kernel.capability_registry, CapabilityRegistry)
    assert isinstance(kernel.agent_registry, AgentRegistry)
    assert isinstance(kernel.company_registry, CompanyRegistry)
    assert isinstance(kernel.project_registry, ProjectRegistry)
    assert isinstance(kernel.workspace_registry, WorkspaceRegistry)
    assert isinstance(kernel.knowledge_engine, InMemoryKnowledgeEngine)
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

    assert kernel.capability_registry.event_bus is kernel.event_bus
    assert kernel.agent_registry.event_bus is kernel.event_bus
    assert kernel.company_registry.event_bus is kernel.event_bus
    assert kernel.project_registry.event_bus is kernel.event_bus
    assert kernel.workspace_registry.event_bus is kernel.event_bus
    assert kernel.knowledge_engine._event_bus is kernel.event_bus
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
