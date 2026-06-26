"""Read-only conversation dashboard services for CommandCore."""

from __future__ import annotations

from dataclasses import dataclass

from commandcore.audit import InMemoryAuditTrail
from commandcore.conversations import InMemoryConversationEngine
from commandcore.events import Event


CONVERSATION_ACTIVITY_EVENTS = {
    "ConversationCreated",
    "ConversationThreadCreated",
    "ConversationMessageAdded",
    "ConversationContextAttached",
    "ConversationKnowledgeLinked",
}

MESSAGE_ACTIVITY_EVENTS = {"ConversationMessageAdded"}


@dataclass(slots=True)
class ConversationDashboardService:
    """Read-only conversation dashboard over the in-memory engine."""

    conversation_engine: InMemoryConversationEngine
    audit_trail: InMemoryAuditTrail

    def conversation_counts(self) -> dict[str, int]:
        return {"total": len(self.conversation_engine.list_conversations())}

    def thread_counts(self) -> dict[str, int]:
        return {"total": len(self.conversation_engine.list_threads())}

    def message_counts(self) -> dict[str, int]:
        return {"total": len(self.conversation_engine.list_messages())}

    def knowledge_link_count(self) -> int:
        return len(self.conversation_engine.list_knowledge_links())

    def context_availability(self) -> dict[str, int | bool]:
        attached_contexts = self.conversation_engine.list_contexts()
        return {
            "available": bool(attached_contexts),
            "conversation_count_with_context": len(
                {context.conversation_id for context in attached_contexts}
            ),
            "context_record_count": len(attached_contexts),
        }

    def conversations(self) -> list[dict[str, object]]:
        return [
            self._serialize_conversation(conversation)
            for conversation in self.conversation_engine.list_conversations()
        ]

    def threads(self) -> list[dict[str, object]]:
        return [self._serialize_thread(thread) for thread in self.conversation_engine.list_threads()]

    def messages(self, limit: int = 20) -> list[dict[str, object]]:
        messages = self.conversation_engine.list_messages()
        return [self._serialize_message(message) for message in messages[-limit:]]

    def knowledge_links(self) -> list[dict[str, object]]:
        return [
            self._serialize_knowledge_link(link)
            for link in self.conversation_engine.list_knowledge_links()
        ]

    def contexts(self) -> list[dict[str, object]]:
        return [self._serialize_context(context) for context in self.conversation_engine.list_contexts()]

    def recent_conversation_activity(self, limit: int = 10) -> list[dict[str, object]]:
        events = [
            self._serialize_event(event)
            for event in self.audit_trail.list_entries()
            if event.payload.get("event_name") in CONVERSATION_ACTIVITY_EVENTS
        ]
        return events[-limit:]

    def recent_message_activity(self, limit: int = 10) -> list[dict[str, object]]:
        events = [
            self._serialize_event(event)
            for event in self.audit_trail.list_entries()
            if event.payload.get("event_name") in MESSAGE_ACTIVITY_EVENTS
        ]
        return events[-limit:]

    def build_dashboard(self) -> dict[str, object]:
        return {
            "conversation_counts": self.conversation_counts(),
            "thread_counts": self.thread_counts(),
            "message_counts": self.message_counts(),
            "knowledge_link_count": self.knowledge_link_count(),
            "context_availability": self.context_availability(),
            "conversations": self.conversations(),
            "threads": self.threads(),
            "messages": self.messages(),
            "knowledge_links": self.knowledge_links(),
            "contexts": self.contexts(),
            "recent_conversation_activity": self.recent_conversation_activity(),
            "recent_message_activity": self.recent_message_activity(),
        }

    @staticmethod
    def _serialize_conversation(conversation: object) -> dict[str, object]:
        return {
            "conversation_id": getattr(conversation, "id"),
            "workspace_id": getattr(conversation, "workspace_id"),
            "company_id": getattr(conversation, "company_id"),
            "project_id": getattr(conversation, "project_id"),
            "objective_id": getattr(conversation, "objective_id"),
            "mission_id": getattr(conversation, "mission_id"),
            "participant_ids": list(getattr(conversation, "participant_ids")),
        }

    @staticmethod
    def _serialize_thread(thread: object) -> dict[str, object]:
        return {
            "thread_id": getattr(thread, "id"),
            "conversation_id": getattr(thread, "conversation_id"),
            "participant_ids": list(getattr(thread, "participant_ids")),
        }

    @staticmethod
    def _serialize_message(message: object) -> dict[str, object]:
        return {
            "message_id": getattr(message, "id"),
            "conversation_id": getattr(message, "conversation_id"),
            "thread_id": getattr(message, "thread_id"),
            "participant_id": getattr(message, "participant_id"),
            "role": getattr(message, "role"),
            "content": getattr(message, "content"),
        }

    @staticmethod
    def _serialize_knowledge_link(link: object) -> dict[str, object]:
        return {
            "conversation_id": getattr(link, "conversation_id"),
            "thread_id": getattr(link, "thread_id"),
            "message_id": getattr(link, "message_id"),
            "knowledge_asset_id": getattr(link, "knowledge_asset_id"),
        }

    @staticmethod
    def _serialize_context(context: object) -> dict[str, object]:
        return {
            "context_id": getattr(context, "id"),
            "conversation_id": getattr(context, "conversation_id"),
            "thread_id": getattr(context, "thread_id"),
            "mission_id": getattr(context, "mission_id"),
            "project_id": getattr(context, "project_id"),
            "content": getattr(context, "content"),
        }

    @staticmethod
    def _serialize_event(event: Event) -> dict[str, object]:
        return {
            "event_id": event.id,
            "event_name": event.payload.get("event_name"),
            "event_type": event.type,
            "source": event.source,
            "occurred_at": event.occurred_at,
            "payload": dict(event.payload),
        }
