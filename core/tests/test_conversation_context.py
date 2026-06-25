from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.conversations import (
    ConversationParticipant,
    InMemoryConversationEngine,
    build_context_for_conversation,
    build_context_for_message,
    build_context_for_thread,
)


def make_participant(participant_id: str, *, role: str = "assistant") -> ConversationParticipant:
    return ConversationParticipant(
        id=participant_id,
        role=role,
        metadata={"display_name": participant_id},
    )


def test_build_context_for_conversation_thread_and_message():
    engine = InMemoryConversationEngine()
    conversation = engine.create_conversation(
        conversation_id="conv-1",
        workspace_id="ws-local",
        company_id="mindx",
        project_id="proj-commandcore",
        objective_id="obj-1",
        mission_id="mission-1",
        participants=[make_participant("jarvis", role="orchestrator")],
        metadata={"channel": "planning"},
    )
    thread = engine.create_thread(
        conversation.id,
        thread_id="thread-1",
        metadata={"topic": "wiring"},
    )
    first = engine.add_message(
        conversation.id,
        thread.id,
        message_id="msg-1",
        participant_id="jarvis",
        role="assistant",
        content="Start with kernel wiring.",
    )
    second = engine.add_message(
        conversation.id,
        thread.id,
        message_id="msg-2",
        participant_id="jarvis",
        role="assistant",
        content="Then add dashboard visibility.",
    )
    engine.attach_context(
        conversation.id,
        context_id="ctx-1",
        thread_id=thread.id,
        content="Conversation context record.",
    )
    engine.link_thread_to_knowledge(thread.id, "know-thread")
    engine.link_message_to_knowledge(second.id, "know-message")

    conversation_context = build_context_for_conversation(engine, conversation.id)
    thread_context = build_context_for_thread(engine, thread.id)
    message_context = build_context_for_message(engine, second.id)

    assert conversation_context["conversation"]["id"] == "conv-1"
    assert conversation_context["thread"] is None
    assert conversation_context["scope_ids"]["workspace_id"] == "ws-local"
    assert conversation_context["linked_knowledge_asset_ids"] == ["know-thread", "know-message"]
    assert [entry["id"] for entry in conversation_context["recent_messages"]] == ["msg-1", "msg-2"]

    assert thread_context["thread"]["id"] == "thread-1"
    assert thread_context["message"] is None
    assert thread_context["linked_knowledge_asset_ids"] == ["know-thread", "know-message"]

    assert message_context["message"]["id"] == "msg-2"
    assert message_context["linked_knowledge_asset_ids"] == ["know-message"]
    assert [entry["id"] for entry in message_context["recent_messages"]] == ["msg-1", "msg-2"]
    assert first.id == "msg-1"
