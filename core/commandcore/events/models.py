"""Canonical event models for the CommandCore kernel."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any, Callable
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class EventType(StrEnum):
    """Broad event categories for the in-memory kernel event bus."""

    DOMAIN = "domain"
    LIFECYCLE = "lifecycle"
    SYSTEM = "system"


class Event(BaseModel):
    """Canonical in-memory event envelope for the CommandCore kernel."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    id: str = Field(default_factory=lambda: str(uuid4()), min_length=1)
    type: EventType
    source: str = Field(min_length=1)
    occurred_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    payload: dict[str, Any] = Field(default_factory=dict)
    correlation_id: str | None = None
    causation_id: str | None = None


EventHandler = Callable[[Event], None]
