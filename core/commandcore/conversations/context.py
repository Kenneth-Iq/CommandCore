"""Context assembly helpers for the in-memory conversation engine."""

from __future__ import annotations

from dataclasses import dataclass

from .engine import InMemoryConversationEngine


@dataclass(slots=True)
class ConversationContextBuilder:
    """Assemble read-only context views from conversation engine state."""

    conversation_engine: InMemoryConversationEngine

    def build_context_for_conversation(self, conversation_id: str) -> dict[str, object]:
        """Build a context payload for one conversation."""

        conversation = self.conversation_engine.get_conversation(conversation_id)
        threads = self.conversation_engine.list_threads(conversation_id)
        messages = self.conversation_engine.list_messages(conversation_id=conversation_id)
        knowledge_links = self.conversation_engine.list_knowledge_links(
            conversation_id=conversation_id
        )
        scope_ids = self._scope_ids(conversation)
        return {
            "conversation": self._conversation_data(conversation),
            "thread": None,
            "message": None,
            "recent_messages": [self._message_data(message) for message in messages[-10:]],
            "linked_knowledge_asset_ids": [
                link.knowledge_asset_id for link in knowledge_links
            ],
            "scope_ids": scope_ids,
            "thread_count": len(threads),
            "message_count": len(messages),
            "context_available": True,
        }

    def build_context_for_thread(self, thread_id: str) -> dict[str, object]:
        """Build a context payload for one thread."""

        thread = self.conversation_engine.get_thread(thread_id)
        conversation = self.conversation_engine.get_conversation(thread.conversation_id)
        messages = self.conversation_engine.list_messages(thread_id=thread_id)
        knowledge_links = self.conversation_engine.list_knowledge_links(thread_id=thread_id)
        scope_ids = self._scope_ids(conversation)
        return {
            "conversation": self._conversation_data(conversation),
            "thread": self._thread_data(thread),
            "message": None,
            "recent_messages": [self._message_data(message) for message in messages[-10:]],
            "linked_knowledge_asset_ids": [
                link.knowledge_asset_id for link in knowledge_links
            ],
            "scope_ids": scope_ids,
            "thread_count": 1,
            "message_count": len(messages),
            "context_available": True,
        }

    def build_context_for_message(self, message_id: str) -> dict[str, object]:
        """Build a context payload for one message."""

        message = self.conversation_engine.get_message(message_id)
        thread = self.conversation_engine.get_thread(message.thread_id)
        conversation = self.conversation_engine.get_conversation(message.conversation_id)
        messages = self.conversation_engine.list_messages(thread_id=thread.id)
        knowledge_links = self.conversation_engine.list_knowledge_links(message_id=message_id)
        scope_ids = self._scope_ids(conversation)
        return {
            "conversation": self._conversation_data(conversation),
            "thread": self._thread_data(thread),
            "message": self._message_data(message),
            "recent_messages": [self._message_data(entry) for entry in messages[-10:]],
            "linked_knowledge_asset_ids": [
                link.knowledge_asset_id for link in knowledge_links
            ],
            "scope_ids": scope_ids,
            "thread_count": 1,
            "message_count": len(messages),
            "context_available": True,
        }

    @staticmethod
    def _scope_ids(conversation: object) -> dict[str, str | None]:
        return {
            "workspace_id": getattr(conversation, "workspace_id"),
            "company_id": getattr(conversation, "company_id"),
            "project_id": getattr(conversation, "project_id"),
            "objective_id": getattr(conversation, "objective_id"),
            "mission_id": getattr(conversation, "mission_id"),
        }

    @staticmethod
    def _conversation_data(conversation: object) -> dict[str, object]:
        return {
            "id": getattr(conversation, "id"),
            "participant_ids": list(getattr(conversation, "participant_ids")),
            "metadata": dict(getattr(conversation, "metadata")),
            "created_at": getattr(conversation, "created_at"),
            "updated_at": getattr(conversation, "updated_at"),
        }

    @staticmethod
    def _thread_data(thread: object) -> dict[str, object]:
        return {
            "id": getattr(thread, "id"),
            "conversation_id": getattr(thread, "conversation_id"),
            "participant_ids": list(getattr(thread, "participant_ids")),
            "metadata": dict(getattr(thread, "metadata")),
            "created_at": getattr(thread, "created_at"),
            "updated_at": getattr(thread, "updated_at"),
        }

    @staticmethod
    def _message_data(message: object) -> dict[str, object]:
        return {
            "id": getattr(message, "id"),
            "conversation_id": getattr(message, "conversation_id"),
            "thread_id": getattr(message, "thread_id"),
            "participant_id": getattr(message, "participant_id"),
            "role": getattr(message, "role"),
            "content": getattr(message, "content"),
            "metadata": dict(getattr(message, "metadata")),
            "created_at": getattr(message, "created_at"),
            "updated_at": getattr(message, "updated_at"),
        }


def build_context_for_conversation(
    conversation_engine: InMemoryConversationEngine,
    conversation_id: str,
) -> dict[str, object]:
    """Build a context payload for one conversation."""

    return ConversationContextBuilder(conversation_engine).build_context_for_conversation(
        conversation_id
    )


def build_context_for_thread(
    conversation_engine: InMemoryConversationEngine,
    thread_id: str,
) -> dict[str, object]:
    """Build a context payload for one thread."""

    return ConversationContextBuilder(conversation_engine).build_context_for_thread(thread_id)


def build_context_for_message(
    conversation_engine: InMemoryConversationEngine,
    message_id: str,
) -> dict[str, object]:
    """Build a context payload for one message."""

    return ConversationContextBuilder(conversation_engine).build_context_for_message(message_id)
