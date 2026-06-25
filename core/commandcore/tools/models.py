"""Canonical in-memory tool runtime models for the CommandCore kernel."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ToolPermission(StrEnum):
    """Permission levels for in-memory tool access."""

    SAFE = "safe"
    RESTRICTED = "restricted"
    PRIVILEGED = "privileged"


class ToolRuntimeStatus(StrEnum):
    """Lifecycle states for tool definitions and invocations."""

    REGISTERED = "registered"
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ToolDefinition(BaseModel):
    """Definition for one tool available inside the kernel."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    id: str = Field(default_factory=lambda: str(uuid4()), min_length=1)
    name: str = Field(min_length=1)
    description: str = Field(min_length=1)
    capability_id: str | None = None
    agent_id: str | None = None
    input_schema: dict[str, Any] = Field(default_factory=dict)
    output_schema: dict[str, Any] = Field(default_factory=dict)
    permission_level: ToolPermission = ToolPermission.SAFE
    status: ToolRuntimeStatus = ToolRuntimeStatus.REGISTERED
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)


class ToolInvocation(BaseModel):
    """Invocation record for one tool execution request."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    id: str = Field(default_factory=lambda: str(uuid4()), min_length=1)
    tool_id: str = Field(min_length=1)
    capability_id: str | None = None
    agent_id: str | None = None
    permission_level: ToolPermission = ToolPermission.SAFE
    status: ToolRuntimeStatus = ToolRuntimeStatus.PENDING
    input_payload: dict[str, Any] = Field(default_factory=dict)
    output_payload: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)


class ToolRuntimeResult(BaseModel):
    """Terminal result for one tool invocation."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    id: str = Field(default_factory=lambda: str(uuid4()), min_length=1)
    tool_id: str = Field(min_length=1)
    capability_id: str | None = None
    agent_id: str | None = None
    invocation_id: str | None = None
    permission_level: ToolPermission = ToolPermission.SAFE
    status: ToolRuntimeStatus
    input_payload: dict[str, Any] = Field(default_factory=dict)
    output_payload: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)
