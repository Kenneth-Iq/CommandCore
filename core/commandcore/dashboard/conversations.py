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
}


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

    def recent_conversation_activity(self, limit: int = 10) -> list[dict[str, object]]:
        events = [
            self._serialize_event(event)
            for event in self.audit_trail.list_entries()
            if event.payload.get("event_name") in CONVERSATION_ACTIVITY_EVENTS
        ]
        return events[-limit:]

    def build_dashboard(self) -> dict[str, object]:
        return {
            "conversation_counts": self.conversation_counts(),
            "thread_counts": self.thread_counts(),
            "message_counts": self.message_counts(),
            "recent_conversation_activity": self.recent_conversation_activity(),
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
