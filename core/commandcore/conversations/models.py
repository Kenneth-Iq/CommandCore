"""Canonical in-memory conversation models for the CommandCore kernel."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ConversationParticipant(BaseModel):
    """Participant metadata for one conversation actor."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    id: str = Field(default_factory=lambda: str(uuid4()), min_length=1)
    role: str = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)


class Conversation(BaseModel):
    """Top-level conversation container for related threads and messages."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    id: str = Field(default_factory=lambda: str(uuid4()), min_length=1)
    workspace_id: str | None = None
    company_id: str | None = None
    project_id: str | None = None
    objective_id: str | None = None
    mission_id: str | None = None
    participant_ids: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)


class ConversationThread(BaseModel):
    """Thread within one conversation."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    id: str = Field(default_factory=lambda: str(uuid4()), min_length=1)
    conversation_id: str = Field(min_length=1)
    participant_ids: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)


class ConversationMessage(BaseModel):
    """One message attached to a conversation thread."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    id: str = Field(default_factory=lambda: str(uuid4()), min_length=1)
    conversation_id: str = Field(min_length=1)
    thread_id: str = Field(min_length=1)
    participant_id: str = Field(min_length=1)
    role: str = Field(min_length=1)
    content: str = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)


class ConversationContext(BaseModel):
    """Supplemental context attached to a conversation or thread."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    id: str = Field(default_factory=lambda: str(uuid4()), min_length=1)
    conversation_id: str = Field(min_length=1)
    thread_id: str | None = None
    workspace_id: str | None = None
    company_id: str | None = None
    project_id: str | None = None
    objective_id: str | None = None
    mission_id: str | None = None
    content: str = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)
