"""In-memory event store models for CommandCore."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from commandcore.events import Event


class StoredEvent(BaseModel):
    """Stored event envelope for durable-event abstractions."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    sequence: int = Field(ge=0)
    stream_id: str = Field(min_length=1)
    event: Event


class EventStream(BaseModel):
    """Named stream of stored events."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    stream_id: str = Field(min_length=1)
    events: list[StoredEvent] = Field(default_factory=list)


class EventReplayResult(BaseModel):
    """Summary of one replay operation."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    replayed_count: int = Field(ge=0)
    stream_id: str | None = None
    event_type: str | None = None
    correlation_id: str | None = None
