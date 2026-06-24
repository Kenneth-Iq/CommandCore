"""Pydantic models for the in-memory CommandCore executive runtime."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ExecutiveModel(BaseModel):
    """Shared base model for executive runtime records."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)


class Objective(ExecutiveModel):
    """Executive objective submitted into the in-memory runtime."""

    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    requested_by: str = Field(min_length=1)
    scope: list[str] = Field(default_factory=list)
    priority: str | None = None


class Directive(ExecutiveModel):
    """Executive directive associated with one objective."""

    id: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    issued_by: str = Field(min_length=1)
    directive_type: str = Field(min_length=1)


class Decision(ExecutiveModel):
    """Executive decision associated with one objective."""

    id: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    decided_by: str = Field(min_length=1)
    decision_type: str = Field(min_length=1)
    rationale: str | None = None


class ApprovalRequest(ExecutiveModel):
    """Approval request associated with one objective."""

    id: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    requested_by: str = Field(min_length=1)
    reviewer_reference: str | None = None
    approval_type: str = Field(min_length=1)


class MissionRequest(ExecutiveModel):
    """Mission request originating from executive intent."""

    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    requested_by: str = Field(min_length=1)
    scope: list[str] = Field(default_factory=list)
    capability_ids: list[str] = Field(default_factory=list)
    required_output: str | None = None
    approval_required: bool = True
