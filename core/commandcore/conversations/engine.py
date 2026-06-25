"""In-memory conversation engine foundation for the CommandCore kernel."""

from __future__ import annotations

from dataclasses import dataclass, field

from commandcore.events import Event, EventType, InMemoryEventBus

from .models import (
    Conversation,
    ConversationContext,
    ConversationMessage,
    ConversationParticipant,
    ConversationThread,
)


@dataclass(slots=True)
class InMemoryConversationEngine:
    """Store conversations, threads, messages, and context in one process."""

    _conversations: dict[str, Conversation] = field(default_factory=dict)
    _threads: dict[str, ConversationThread] = field(default_factory=dict)
    _messages: dict[str, ConversationMessage] = field(default_factory=dict)
    _contexts: dict[str, ConversationContext] = field(default_factory=dict)
    _participants: dict[str, ConversationParticipant] = field(default_factory=dict)
    event_bus: InMemoryEventBus | None = None
    source: str | None = None

    default_event_source: str = "commandcore.conversations.engine"

    def create_conversation(
        self,
        conversation: Conversation | None = None,
        *,
        conversation_id: str | None = None,
        workspace_id: str | None = None,
        company_id: str | None = None,
        project_id: str | None = None,
        objective_id: str | None = None,
        mission_id: str | None = None,
        participant_ids: list[str] | None = None,
        participants: list[ConversationParticipant] | None = None,
        metadata: dict[str, object] | None = None,
    ) -> Conversation:
        """Create and store a conversation."""

        resolved_participants = participants or []
        for participant in resolved_participants:
            self._participants[participant.id] = participant

        if conversation is None:
            combined_participant_ids = list(participant_ids or [])
            combined_participant_ids.extend(
                participant.id
                for participant in resolved_participants
                if participant.id not in combined_participant_ids
            )
            conversation = Conversation(
                id=conversation_id or Conversation().id,
                workspace_id=workspace_id,
                company_id=company_id,
                project_id=project_id,
                objective_id=objective_id,
                mission_id=mission_id,
                participant_ids=combined_participant_ids,
                metadata=dict(metadata or {}),
            )

        if conversation.id in self._conversations:
            raise ValueError(f"Conversation ID already registered: {conversation.id}")

        self._conversations[conversation.id] = conversation
        self._publish(
            name="ConversationCreated",
            payload={
                "conversation_id": conversation.id,
                "workspace_id": conversation.workspace_id,
                "company_id": conversation.company_id,
                "project_id": conversation.project_id,
                "objective_id": conversation.objective_id,
                "mission_id": conversation.mission_id,
                "participant_ids": list(conversation.participant_ids),
            },
        )
        return conversation

    def get_conversation(self, conversation_id: str) -> Conversation:
        """Return a conversation by ID."""

        try:
            return self._conversations[conversation_id]
        except KeyError as exc:
            raise KeyError(f"Conversation ID not found: {conversation_id}") from exc

    def list_conversations(self) -> list[Conversation]:
        """Return all conversations in insertion order."""

        return list(self._conversations.values())

    def create_thread(
        self,
        conversation_id: str,
        thread: ConversationThread | None = None,
        *,
        thread_id: str | None = None,
        participant_ids: list[str] | None = None,
        metadata: dict[str, object] | None = None,
    ) -> ConversationThread:
        """Create a thread under one known conversation."""

        conversation = self.get_conversation(conversation_id)
        if thread is None:
            thread = ConversationThread(
                id=thread_id or ConversationThread(conversation_id=conversation_id).id,
                conversation_id=conversation_id,
                participant_ids=list(participant_ids or conversation.participant_ids),
                metadata=dict(metadata or {}),
            )

        if thread.id in self._threads:
            raise ValueError(f"Conversation thread ID already registered: {thread.id}")
        if thread.conversation_id != conversation_id:
            raise ValueError("Conversation thread conversation_id does not match request.")

        self._threads[thread.id] = thread
        self._publish(
            name="ConversationThreadCreated",
            payload={
                "conversation_id": conversation_id,
                "thread_id": thread.id,
                "participant_ids": list(thread.participant_ids),
            },
        )
        return thread

    def get_thread(self, thread_id: str) -> ConversationThread:
        """Return a thread by ID."""

        try:
            return self._threads[thread_id]
        except KeyError as exc:
            raise KeyError(f"Conversation thread ID not found: {thread_id}") from exc

    def list_threads(self, conversation_id: str | None = None) -> list[ConversationThread]:
        """Return all threads, optionally filtered by conversation."""

        if conversation_id is None:
            return list(self._threads.values())
        self.get_conversation(conversation_id)
        return [
            thread for thread in self._threads.values() if thread.conversation_id == conversation_id
        ]

    def add_message(
        self,
        conversation_id: str,
        thread_id: str,
        *,
        message: ConversationMessage | None = None,
        message_id: str | None = None,
        participant_id: str,
        role: str,
        content: str,
        metadata: dict[str, object] | None = None,
    ) -> ConversationMessage:
        """Add a message to one known conversation thread."""

        self.get_conversation(conversation_id)
        thread = self.get_thread(thread_id)
        if thread.conversation_id != conversation_id:
            raise ValueError("Conversation thread does not belong to the requested conversation.")

        if message is None:
            message = ConversationMessage(
                id=message_id or ConversationMessage(
                    conversation_id=conversation_id,
                    thread_id=thread_id,
                    participant_id=participant_id,
                    role=role,
                    content=content,
                ).id,
                conversation_id=conversation_id,
                thread_id=thread_id,
                participant_id=participant_id,
                role=role,
                content=content,
                metadata=dict(metadata or {}),
            )

        if message.id in self._messages:
            raise ValueError(f"Conversation message ID already registered: {message.id}")
        if message.conversation_id != conversation_id or message.thread_id != thread_id:
            raise ValueError("Conversation message scope does not match request.")

        self._messages[message.id] = message
        self._publish(
            name="ConversationMessageAdded",
            payload={
                "conversation_id": conversation_id,
                "thread_id": thread_id,
                "message_id": message.id,
                "participant_id": message.participant_id,
                "role": message.role,
            },
        )
        return message

    def list_messages(
        self,
        *,
        conversation_id: str | None = None,
        thread_id: str | None = None,
    ) -> list[ConversationMessage]:
        """Return messages, optionally filtered by conversation or thread."""

        if conversation_id is not None:
            self.get_conversation(conversation_id)
        if thread_id is not None:
            thread = self.get_thread(thread_id)
            if conversation_id is not None and thread.conversation_id != conversation_id:
                raise ValueError("Conversation thread does not belong to the requested conversation.")

        messages = list(self._messages.values())
        if conversation_id is not None:
            messages = [message for message in messages if message.conversation_id == conversation_id]
        if thread_id is not None:
            messages = [message for message in messages if message.thread_id == thread_id]
        return messages

    def attach_context(
        self,
        conversation_id: str,
        *,
        context: ConversationContext | None = None,
        context_id: str | None = None,
        thread_id: str | None = None,
        workspace_id: str | None = None,
        company_id: str | None = None,
        project_id: str | None = None,
        objective_id: str | None = None,
        mission_id: str | None = None,
        content: str,
        metadata: dict[str, object] | None = None,
    ) -> ConversationContext:
        """Attach context to one conversation or one thread within it."""

        conversation = self.get_conversation(conversation_id)
        if thread_id is not None:
            thread = self.get_thread(thread_id)
            if thread.conversation_id != conversation_id:
                raise ValueError("Conversation thread does not belong to the requested conversation.")

        if context is None:
            context = ConversationContext(
                id=context_id or ConversationContext(
                    conversation_id=conversation_id,
                    content=content,
                ).id,
                conversation_id=conversation_id,
                thread_id=thread_id,
                workspace_id=workspace_id or conversation.workspace_id,
                company_id=company_id or conversation.company_id,
                project_id=project_id or conversation.project_id,
                objective_id=objective_id or conversation.objective_id,
                mission_id=mission_id or conversation.mission_id,
                content=content,
                metadata=dict(metadata or {}),
            )

        if context.id in self._contexts:
            raise ValueError(f"Conversation context ID already registered: {context.id}")
        if context.conversation_id != conversation_id:
            raise ValueError("Conversation context does not belong to the requested conversation.")
        if thread_id != context.thread_id:
            raise ValueError("Conversation context thread scope does not match request.")

        self._contexts[context.id] = context
        self._publish(
            name="ConversationContextAttached",
            payload={
                "conversation_id": conversation_id,
                "thread_id": thread_id,
                "context_id": context.id,
                "workspace_id": context.workspace_id,
                "company_id": context.company_id,
                "project_id": context.project_id,
                "objective_id": context.objective_id,
                "mission_id": context.mission_id,
            },
        )
        return context

    def get_context(self, context_id: str) -> ConversationContext:
        """Return one attached context by ID."""

        try:
            return self._contexts[context_id]
        except KeyError as exc:
            raise KeyError(f"Conversation context ID not found: {context_id}") from exc

    def _publish(self, *, name: str, payload: dict[str, object]) -> None:
        if self.event_bus is None:
            return

        self.event_bus.publish(
            Event(
                type=EventType.DOMAIN,
                source=self.source or self.default_event_source,
                payload={"event_name": name, **payload},
            )
        )
