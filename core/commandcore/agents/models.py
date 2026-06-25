"""Canonical in-memory agent runtime models for the CommandCore kernel."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AgentAssignment(BaseModel):
    """Assignment of one agent to one unit of work."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    id: str = Field(default_factory=lambda: str(uuid4()), min_length=1)
    agent_id: str = Field(min_length=1)
    mission_id: str | None = None
    task_id: str | None = None
    capability_id: str | None = None
    status: str = Field(min_length=1)
    input_payload: dict[str, Any] = Field(default_factory=dict)
    output_payload: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)


class AgentExecution(BaseModel):
    """Execution record for one runtime attempt."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    id: str = Field(default_factory=lambda: str(uuid4()), min_length=1)
    agent_id: str = Field(min_length=1)
    mission_id: str | None = None
    task_id: str | None = None
    capability_id: str | None = None
    assignment_id: str | None = None
    status: str = Field(min_length=1)
    input_payload: dict[str, Any] = Field(default_factory=dict)
    output_payload: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)


class AgentRuntimeResult(BaseModel):
    """Terminal runtime result for one execution."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    id: str = Field(default_factory=lambda: str(uuid4()), min_length=1)
    agent_id: str = Field(min_length=1)
    mission_id: str | None = None
    task_id: str | None = None
    capability_id: str | None = None
    execution_id: str | None = None
    status: str = Field(min_length=1)
    input_payload: dict[str, Any] = Field(default_factory=dict)
    output_payload: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)


class AgentRuntimeEvent(BaseModel):
    """Structured runtime event envelope for local agent execution state."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    id: str = Field(default_factory=lambda: str(uuid4()), min_length=1)
    agent_id: str = Field(min_length=1)
    mission_id: str | None = None
    task_id: str | None = None
    capability_id: str | None = None
    status: str = Field(min_length=1)
    input_payload: dict[str, Any] = Field(default_factory=dict)
    output_payload: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    event_name: str = Field(min_length=1)
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)
