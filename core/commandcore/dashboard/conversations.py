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
            "recent_conversation_activity": self.recent_conversation_activity(),
            "recent_message_activity": self.recent_message_activity(),
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
