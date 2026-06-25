"""Lightweight in-memory kernel bootstrap for CommandCore."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from commandcore.audit import InMemoryAuditTrail, attach_audit_trail
from commandcore.conversations import InMemoryConversationEngine
from commandcore.events import InMemoryEventBus
from commandcore.eventstore import InMemoryEventStore
from commandcore.executive import (
    ExecutiveMissionOrchestrator,
    ExecutivePolicyEngine,
    ExecutivePolicyGate,
    ExecutiveReportingService,
    ExecutiveRuntime,
    ExecutiveStateStore,
)
from commandcore.health import build_kernel_health_snapshot
from commandcore.knowledge import InMemoryKnowledgeEngine
from commandcore.mission import MissionEngine
from commandcore.registries import (
    AgentRegistry,
    CapabilityRegistry,
    CompanyRegistry,
    ProjectRegistry,
    WorkspaceRegistry,
)


@dataclass(slots=True)
class CommandCoreKernel:
    """Composed in-memory kernel surface for CommandCore components."""

    event_bus: InMemoryEventBus
    event_store: InMemoryEventStore
    capability_registry: CapabilityRegistry
    agent_registry: AgentRegistry
    company_registry: CompanyRegistry
    project_registry: ProjectRegistry
    workspace_registry: WorkspaceRegistry
    knowledge_engine: InMemoryKnowledgeEngine
    conversation_engine: InMemoryConversationEngine
    mission_engine: MissionEngine
    audit_trail: InMemoryAuditTrail
    health_snapshot_builder: Callable[["CommandCoreKernel"], dict[str, object]]
    executive_reporting: ExecutiveReportingService
    executive_policy_engine: ExecutivePolicyEngine
    executive_policy_gate: ExecutivePolicyGate
    executive_state_store: ExecutiveStateStore
    executive_runtime: ExecutiveRuntime
    executive_orchestrator: ExecutiveMissionOrchestrator


def create_in_memory_kernel() -> CommandCoreKernel:
    """Create the current in-memory CommandCore kernel composition."""

    event_store = InMemoryEventStore()
    event_bus = InMemoryEventBus(event_store=event_store)
    knowledge_engine = InMemoryKnowledgeEngine(event_bus=event_bus)
    mission_engine = MissionEngine(event_bus=event_bus)
    conversation_engine = InMemoryConversationEngine(
        event_bus=event_bus,
        knowledge_engine=knowledge_engine,
    )
    executive_policy_engine = ExecutivePolicyEngine(event_bus=event_bus)
    executive_policy_gate = ExecutivePolicyGate(
        policy_engine=executive_policy_engine,
        event_bus=event_bus,
    )
    executive_state_store = ExecutiveStateStore(event_bus=event_bus)
    executive_runtime = ExecutiveRuntime(event_bus=event_bus)
    audit_trail = attach_audit_trail(event_bus, InMemoryAuditTrail())
    executive_reporting = ExecutiveReportingService(
        executive_runtime=executive_runtime,
        mission_engine=mission_engine,
        policy_engine=executive_policy_engine,
        state_store=executive_state_store,
    )
    return CommandCoreKernel(
        event_bus=event_bus,
        event_store=event_store,
        capability_registry=CapabilityRegistry(event_bus=event_bus),
        agent_registry=AgentRegistry(event_bus=event_bus),
        company_registry=CompanyRegistry(event_bus=event_bus),
        project_registry=ProjectRegistry(event_bus=event_bus),
        workspace_registry=WorkspaceRegistry(event_bus=event_bus),
        knowledge_engine=knowledge_engine,
        conversation_engine=conversation_engine,
        mission_engine=mission_engine,
        audit_trail=audit_trail,
        health_snapshot_builder=build_kernel_health_snapshot,
        executive_reporting=executive_reporting,
        executive_policy_engine=executive_policy_engine,
        executive_policy_gate=executive_policy_gate,
        executive_state_store=executive_state_store,
        executive_runtime=executive_runtime,
        executive_orchestrator=ExecutiveMissionOrchestrator(
            executive_runtime=executive_runtime,
            mission_engine=mission_engine,
            policy_gate=executive_policy_gate,
            state_store=executive_state_store,
            event_bus=event_bus,
        ),
    )
