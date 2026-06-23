"""Shared value objects and enums for canonical CommandCore contracts."""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class Status(StrEnum):
    """Cross-domain status values shared by top-level contracts.

    This enum stays broad on purpose so contracts remain implementation-neutral
    while still reflecting the domain language in the locked project, company,
    and operational documents.
    """

    ACTIVE = "active"
    INACTIVE = "inactive"
    BLOCKED = "blocked"
    PAUSED = "paused"
    REVIEWING = "reviewing"
    READY = "ready"
    ARCHIVED = "archived"


class LifecycleState(StrEnum):
    """Lifecycle state for reusable and long-lived CommandCore entities.

    This maps most directly to the Capability and domain-lifecycle documents,
    while remaining broad enough for other contracts that move from discovery
    through active use and eventual retirement.
    """

    DISCOVERED = "discovered"
    CANDIDATE = "candidate"
    REVIEWED = "reviewed"
    PROMOTED = "promoted"
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    RETIRED = "retired"
    ARCHIVED = "archived"


class PermissionLevel(StrEnum):
    """Permission boundary levels for contracts crossing service boundaries.

    This reflects the service-boundary and mission-governance documents: scope
    must be explicit, approval-aware, and safe without implying one runtime or
    one storage model.
    """

    NONE = "none"
    READ = "read"
    CONTRIBUTE = "contribute"
    OPERATE = "operate"
    APPROVE = "approve"
    ADMIN = "admin"
    EXECUTIVE = "executive"


class CapabilityCertificationStatus(StrEnum):
    """Trust state for capabilities from the canonical Capability Framework."""

    UNCERTIFIED = "uncertified"
    CONDITIONAL = "conditional"
    LIMITED = "limited"
    CERTIFIED = "certified"
    DEPRECATED = "deprecated"
    DECERTIFIED = "decertified"


class AgentRuntimeStatus(StrEnum):
    """Execution availability state for pluggable agent runtimes."""

    AVAILABLE = "available"
    BUSY = "busy"
    DEGRADED = "degraded"
    OFFLINE = "offline"
    UNKNOWN = "unknown"


class MissionStatus(StrEnum):
    """Mission coordination states from the canonical service architecture."""

    REQUESTED = "requested"
    APPROVED = "approved"
    ASSIGNED = "assigned"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUSED = "refused"


class OwnershipKind(StrEnum):
    """Type discriminator for the Ownership value object."""

    EXECUTIVE_ROLE = "executive_role"
    TEAM = "team"
    USER = "user"
    COMPANY = "company"
    PROJECT = "project"
    WORKSPACE = "workspace"
    DOMAIN = "domain"


class Ownership(BaseModel):
    """Implementation-neutral ownership descriptor.

    This value object maps to the ownership facets in the Company, Capability,
    Project, and Workspace domain documents. It intentionally avoids database
    identity or permission-system specifics.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    kind: OwnershipKind
    reference: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
