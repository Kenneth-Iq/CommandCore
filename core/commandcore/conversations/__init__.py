"""In-memory conversation engine primitives for the CommandCore kernel."""

from .context import (
    ConversationContextBuilder,
    build_context_for_conversation,
    build_context_for_message,
    build_context_for_thread,
)
from .engine import ConversationKnowledgeLink, InMemoryConversationEngine
from .models import (
    Conversation,
    ConversationContext,
    ConversationMessage,
    ConversationParticipant,
    ConversationThread,
)

__all__ = [
    "Conversation",
    "ConversationContext",
    "ConversationContextBuilder",
    "ConversationKnowledgeLink",
    "ConversationMessage",
    "ConversationParticipant",
    "ConversationThread",
    "InMemoryConversationEngine",
    "build_context_for_conversation",
    "build_context_for_message",
    "build_context_for_thread",
]
