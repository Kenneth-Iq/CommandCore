from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.bootstrap import CommandCoreKernel, create_in_memory_kernel
from commandcore.events import InMemoryEventBus
from commandcore.knowledge import InMemoryKnowledgeEngine
from commandcore.mission import MissionEngine
from commandcore.registries import (
    AgentRegistry,
    CapabilityRegistry,
    CompanyRegistry,
    ProjectRegistry,
    WorkspaceRegistry,
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


def test_create_in_memory_kernel_shares_one_event_bus_across_components():
    kernel = create_in_memory_kernel()

    assert kernel.capability_registry.event_bus is kernel.event_bus
    assert kernel.agent_registry.event_bus is kernel.event_bus
    assert kernel.company_registry.event_bus is kernel.event_bus
    assert kernel.project_registry.event_bus is kernel.event_bus
    assert kernel.workspace_registry.event_bus is kernel.event_bus
    assert kernel.knowledge_engine._event_bus is kernel.event_bus
    assert kernel.mission_engine.event_bus is kernel.event_bus
