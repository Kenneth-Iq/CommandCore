from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.bootstrap import create_in_memory_kernel
from commandcore.conversations import ConversationParticipant
from commandcore.contracts import KnowledgeAsset, LifecycleState, Ownership, OwnershipKind
from commandcore.dashboard import ConversationDashboardService


def make_participant(participant_id: str, *, role: str = "assistant") -> ConversationParticipant:
    return ConversationParticipant(
        id=participant_id,
        role=role,
        metadata={"display_name": participant_id},
    )


def make_ownership() -> Ownership:
    return Ownership(
        kind=OwnershipKind.DOMAIN,
        reference="commandcore.architecture",
        display_name="CommandCore Architecture",
    )


def make_asset(asset_id: str) -> KnowledgeAsset:
    return KnowledgeAsset(
        id=asset_id,
        title="Conversation Runbook",
        asset_type="runbook",
        ownership=make_ownership(),
        lifecycle_state=LifecycleState.ACTIVE,
        workspace_id="ws-local",
        safe_to_query=True,
    )


def test_conversation_dashboard_service_reports_counts_knowledge_and_context_activity():
    kernel = create_in_memory_kernel()
    kernel.knowledge_engine.add_asset(make_asset("know-1"))
    first = kernel.conversation_engine.create_conversation(
        conversation_id="conv-1",
        workspace_id="ws-local",
        participants=[make_participant("jarvis", role="orchestrator")],
    )
    second = kernel.conversation_engine.create_conversation(
        conversation_id="conv-2",
        project_id="proj-commandcore",
        participants=[make_participant("hermes", role="worker")],
    )
    first_thread = kernel.conversation_engine.create_thread(first.id, thread_id="thread-1")
    second_thread = kernel.conversation_engine.create_thread(second.id, thread_id="thread-2")
    third_thread = kernel.conversation_engine.create_thread(second.id, thread_id="thread-3")
    kernel.conversation_engine.add_message(
        first.id,
        first_thread.id,
        message_id="msg-1",
        participant_id="jarvis",
        role="assistant",
        content="Prepare the release summary.",
    )
    kernel.conversation_engine.add_message(
        second.id,
        second_thread.id,
        message_id="msg-2",
        participant_id="hermes",
        role="assistant",
        content="Scanning the current event flows.",
    )
    third_message = kernel.conversation_engine.add_message(
        second.id,
        third_thread.id,
        message_id="msg-3",
        participant_id="hermes",
        role="assistant",
        content="Threaded follow-up for the wiring patch.",
    )
    kernel.conversation_engine.attach_context(
        first.id,
        context_id="ctx-1",
        thread_id=first_thread.id,
        content="Conversation context record.",
    )
    kernel.conversation_engine.link_thread_to_knowledge(first_thread.id, "know-1")
    kernel.conversation_engine.link_message_to_knowledge(third_message.id, "know-1")

    dashboard = ConversationDashboardService(
        conversation_engine=kernel.conversation_engine,
        audit_trail=kernel.audit_trail,
    )

    counts = dashboard.conversation_counts()
    thread_counts = dashboard.thread_counts()
    message_counts = dashboard.message_counts()
    recent_activity = dashboard.recent_conversation_activity()
    recent_message_activity = dashboard.recent_message_activity()

    assert counts == {"total": 2}
    assert thread_counts == {"total": 3}
    assert message_counts == {"total": 3}
    assert dashboard.knowledge_link_count() == 2
    assert dashboard.context_availability() == {
        "available": True,
        "conversation_count_with_context": 1,
        "context_record_count": 1,
    }
    assert any(event["event_name"] == "ConversationKnowledgeLinked" for event in recent_activity)
    assert any(event["event_name"] == "ConversationMessageAdded" for event in recent_message_activity)

    built = dashboard.build_dashboard()
    assert built["conversation_counts"] == counts
    assert built["thread_counts"] == thread_counts
    assert built["message_counts"] == message_counts
    assert built["knowledge_link_count"] == 2
