"""Lightweight in-memory kernel bootstrap for CommandCore."""

from __future__ import annotations

from dataclasses import dataclass

from commandcore.events import InMemoryEventBus
from commandcore.executive import ExecutivePolicyEngine
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
    capability_registry: CapabilityRegistry
    agent_registry: AgentRegistry
    company_registry: CompanyRegistry
    project_registry: ProjectRegistry
    workspace_registry: WorkspaceRegistry
    knowledge_engine: InMemoryKnowledgeEngine
    mission_engine: MissionEngine
    executive_policy_engine: ExecutivePolicyEngine


def create_in_memory_kernel() -> CommandCoreKernel:
    """Create the current in-memory CommandCore kernel composition."""

    event_bus = InMemoryEventBus()
    return CommandCoreKernel(
        event_bus=event_bus,
        capability_registry=CapabilityRegistry(event_bus=event_bus),
        agent_registry=AgentRegistry(event_bus=event_bus),
        company_registry=CompanyRegistry(event_bus=event_bus),
        project_registry=ProjectRegistry(event_bus=event_bus),
        workspace_registry=WorkspaceRegistry(event_bus=event_bus),
        knowledge_engine=InMemoryKnowledgeEngine(event_bus=event_bus),
        mission_engine=MissionEngine(event_bus=event_bus),
        executive_policy_engine=ExecutivePolicyEngine(event_bus=event_bus),
    )
