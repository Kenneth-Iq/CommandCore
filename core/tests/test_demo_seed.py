from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.bootstrap import create_in_memory_kernel
from commandcore.demo import seed_demo_kernel


def test_seed_demo_kernel_creates_non_zero_counts():
    kernel = create_in_memory_kernel()

    seed_demo_kernel(kernel)

    assert len(kernel.workspace_registry.list_workspaces()) == 1
    assert len(kernel.company_registry.list_companies()) == 1
    assert len(kernel.project_registry.list_projects()) == 2
    assert len(kernel.capability_registry.list_capabilities()) == 3
    assert len(kernel.agent_registry.list_agents()) == 3
    assert len(kernel.tool_registry.list_tools()) == 3
    assert len(kernel.knowledge_engine.list_assets()) == 2
    assert len(kernel.conversation_engine.list_conversations()) == 2
    assert len(kernel.conversation_engine.list_threads()) == 2
    assert len(kernel.conversation_engine.list_messages()) == 4
    assert len(kernel.executive_runtime.list_objectives()) == 2
    assert len(kernel.mission_engine.list_missions()) == 2
    assert len(kernel.agent_runtime.list_assignments()) >= 1
    assert len(kernel.agent_runtime.list_executions()) >= 1
    assert len(kernel.tool_runtime.list_invocations()) >= 1
    assert len(kernel.audit_trail.list_entries()) > 0
    assert len(kernel.event_store.read_all()) > 0


def test_seed_demo_kernel_is_idempotent_enough_for_repeated_calls():
    kernel = create_in_memory_kernel()

    seed_demo_kernel(kernel)
    first_counts = {
        "workspaces": len(kernel.workspace_registry.list_workspaces()),
        "companies": len(kernel.company_registry.list_companies()),
        "projects": len(kernel.project_registry.list_projects()),
        "capabilities": len(kernel.capability_registry.list_capabilities()),
        "agents": len(kernel.agent_registry.list_agents()),
        "tools": len(kernel.tool_registry.list_tools()),
        "knowledge": len(kernel.knowledge_engine.list_assets()),
        "conversations": len(kernel.conversation_engine.list_conversations()),
        "threads": len(kernel.conversation_engine.list_threads()),
        "messages": len(kernel.conversation_engine.list_messages()),
        "objectives": len(kernel.executive_runtime.list_objectives()),
        "missions": len(kernel.mission_engine.list_missions()),
        "assignments": len(kernel.agent_runtime.list_assignments()),
        "executions": len(kernel.agent_runtime.list_executions()),
        "invocations": len(kernel.tool_runtime.list_invocations()),
    }

    seed_demo_kernel(kernel)
    second_counts = {
        "workspaces": len(kernel.workspace_registry.list_workspaces()),
        "companies": len(kernel.company_registry.list_companies()),
        "projects": len(kernel.project_registry.list_projects()),
        "capabilities": len(kernel.capability_registry.list_capabilities()),
        "agents": len(kernel.agent_registry.list_agents()),
        "tools": len(kernel.tool_registry.list_tools()),
        "knowledge": len(kernel.knowledge_engine.list_assets()),
        "conversations": len(kernel.conversation_engine.list_conversations()),
        "threads": len(kernel.conversation_engine.list_threads()),
        "messages": len(kernel.conversation_engine.list_messages()),
        "objectives": len(kernel.executive_runtime.list_objectives()),
        "missions": len(kernel.mission_engine.list_missions()),
        "assignments": len(kernel.agent_runtime.list_assignments()),
        "executions": len(kernel.agent_runtime.list_executions()),
        "invocations": len(kernel.tool_runtime.list_invocations()),
    }

    assert second_counts == first_counts
