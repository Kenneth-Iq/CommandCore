from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.conversations import ConversationParticipant, InMemoryConversationEngine
from commandcore.contracts import KnowledgeAsset, LifecycleState, Ownership, OwnershipKind
from commandcore.events import InMemoryEventBus
from commandcore.knowledge import InMemoryKnowledgeEngine


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
        title="Release Runbook",
        asset_type="runbook",
        ownership=make_ownership(),
        lifecycle_state=LifecycleState.ACTIVE,
        workspace_id="ws-local",
        safe_to_query=True,
    )


def test_link_message_and_thread_to_knowledge_with_validation_and_listing():
    knowledge_engine = InMemoryKnowledgeEngine()
    knowledge_engine.add_asset(make_asset("know-1"))
    engine = InMemoryConversationEngine(knowledge_engine=knowledge_engine)
    conversation = engine.create_conversation(
        conversation_id="conv-1",
        participants=[make_participant("jarvis")],
    )
    thread = engine.create_thread(conversation.id, thread_id="thread-1")
    message = engine.add_message(
        conversation.id,
        thread.id,
        message_id="msg-1",
        participant_id="jarvis",
        role="assistant",
        content="Use the release runbook.",
    )

    message_link = engine.link_message_to_knowledge(message.id, "know-1")
    thread_link = engine.link_thread_to_knowledge(thread.id, "know-1")

    assert message_link.message_id == "msg-1"
    assert thread_link.thread_id == "thread-1"
    assert engine.list_knowledge_links(conversation_id=conversation.id) == [
        message_link,
        thread_link,
    ]
    assert engine.list_knowledge_links(thread_id=thread.id) == [message_link, thread_link]
    assert engine.list_knowledge_links(message_id=message.id) == [message_link]


def test_linking_requires_known_knowledge_asset_when_engine_is_provided():
    knowledge_engine = InMemoryKnowledgeEngine()
    engine = InMemoryConversationEngine(knowledge_engine=knowledge_engine)
    conversation = engine.create_conversation(conversation_id="conv-1")
    thread = engine.create_thread(conversation.id, thread_id="thread-1")
    message = engine.add_message(
        conversation.id,
        thread.id,
        message_id="msg-1",
        participant_id="jarvis",
        role="assistant",
        content="Missing asset.",
    )

    with pytest.raises(KeyError):
        engine.link_message_to_knowledge(message.id, "missing-asset")


def test_linking_allows_id_only_storage_without_knowledge_engine():
    bus = InMemoryEventBus()
    engine = InMemoryConversationEngine(event_bus=bus)
    conversation = engine.create_conversation(conversation_id="conv-1")
    thread = engine.create_thread(conversation.id, thread_id="thread-1")
    message = engine.add_message(
        conversation.id,
        thread.id,
        message_id="msg-1",
        participant_id="jarvis",
        role="assistant",
        content="Store only IDs.",
    )

    link = engine.link_message_to_knowledge(message.id, "know-external")

    assert link.knowledge_asset_id == "know-external"
    assert [event.payload["event_name"] for event in bus.list_events()][-1] == "ConversationKnowledgeLinked"
    assert bus.list_events()[-1].payload["knowledge_asset_id"] == "know-external"
