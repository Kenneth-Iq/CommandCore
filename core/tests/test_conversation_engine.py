from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.conversations import (
    ConversationParticipant,
    InMemoryConversationEngine,
)
from commandcore.events import InMemoryEventBus


def make_participant(participant_id: str, *, role: str = "assistant") -> ConversationParticipant:
    return ConversationParticipant(
        id=participant_id,
        role=role,
        metadata={"display_name": participant_id},
    )


def test_create_get_and_list_conversations_threads_messages_and_context():
    engine = InMemoryConversationEngine()
    conversation = engine.create_conversation(
        conversation_id="conv-1",
        workspace_id="ws-local",
        company_id="mindx",
        project_id="proj-commandcore",
        objective_id="obj-1",
        mission_id="mission-1",
        participants=[
            make_participant("jarvis", role="orchestrator"),
            make_participant("hermes", role="worker"),
        ],
        metadata={"channel": "planning"},
    )
    thread = engine.create_thread(
        conversation.id,
        thread_id="thread-1",
        metadata={"topic": "bootstrap"},
    )
    message = engine.add_message(
        conversation.id,
        thread.id,
        message_id="msg-1",
        participant_id="jarvis",
        role="assistant",
        content="Let's wire the kernel first.",
        metadata={"kind": "proposal"},
    )
    context = engine.attach_context(
        conversation.id,
        context_id="ctx-1",
        thread_id=thread.id,
        content="Kernel shares one event bus across engines.",
        metadata={"source": "architecture"},
    )

    assert engine.get_conversation("conv-1") == conversation
    assert engine.list_conversations() == [conversation]
    assert engine.get_thread("thread-1") == thread
    assert engine.list_threads(conversation.id) == [thread]
    assert engine.list_messages(conversation_id=conversation.id) == [message]
    assert engine.list_messages(thread_id=thread.id) == [message]
    assert engine.get_context("ctx-1") == context
    assert context.workspace_id == "ws-local"
    assert context.project_id == "proj-commandcore"
    assert context.objective_id == "obj-1"
    assert context.mission_id == "mission-1"


def test_create_duplicate_conversation_raises():
    engine = InMemoryConversationEngine()
    engine.create_conversation(conversation_id="conv-1")

    with pytest.raises(ValueError):
        engine.create_conversation(conversation_id="conv-1")


def test_thread_and_message_require_known_scopes():
    engine = InMemoryConversationEngine()
    conversation = engine.create_conversation(conversation_id="conv-1")
    thread = engine.create_thread(conversation.id, thread_id="thread-1")

    with pytest.raises(KeyError):
        engine.create_thread("missing-conversation", thread_id="thread-2")

    with pytest.raises(KeyError):
        engine.add_message(
            conversation.id,
            "missing-thread",
            participant_id="jarvis",
            role="assistant",
            content="Missing thread.",
        )

    other = engine.create_conversation(conversation_id="conv-2")
    with pytest.raises(ValueError):
        engine.add_message(
            other.id,
            thread.id,
            participant_id="jarvis",
            role="assistant",
            content="Wrong conversation.",
        )


def test_events_are_published_only_when_event_bus_is_provided():
    bus = InMemoryEventBus()
    engine = InMemoryConversationEngine(event_bus=bus)

    conversation = engine.create_conversation(
        conversation_id="conv-1",
        workspace_id="ws-local",
        participants=[make_participant("jarvis")],
    )
    thread = engine.create_thread(conversation.id, thread_id="thread-1")
    engine.add_message(
        conversation.id,
        thread.id,
        message_id="msg-1",
        participant_id="jarvis",
        role="assistant",
        content="Status update.",
    )
    engine.attach_context(
        conversation.id,
        context_id="ctx-1",
        content="Workspace-local release planning context.",
    )

    events = bus.list_events()
    assert [event.payload["event_name"] for event in events] == [
        "ConversationCreated",
        "ConversationThreadCreated",
        "ConversationMessageAdded",
        "ConversationContextAttached",
    ]
    assert events[0].payload["conversation_id"] == "conv-1"
    assert events[0].payload["workspace_id"] == "ws-local"
    assert events[1].payload["thread_id"] == "thread-1"
    assert events[2].payload["message_id"] == "msg-1"
    assert events[2].payload["participant_id"] == "jarvis"
    assert events[3].payload["context_id"] == "ctx-1"


def test_no_events_are_published_without_event_bus():
    engine = InMemoryConversationEngine()
    conversation = engine.create_conversation(conversation_id="conv-1")
    thread = engine.create_thread(conversation.id, thread_id="thread-1")

    message = engine.add_message(
        conversation.id,
        thread.id,
        participant_id="jarvis",
        role="assistant",
        content="No bus configured.",
    )

    assert engine.list_messages(thread_id=thread.id) == [message]
