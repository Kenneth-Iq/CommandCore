"""Canonical CommandCore contract models."""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field

from .shared import (
    AgentRuntimeStatus,
    CapabilityCertificationStatus,
    LifecycleState,
    MissionStatus,
    Ownership,
    PermissionLevel,
    Status,
)


class ContractModel(BaseModel):
    """Shared base for implementation-neutral core contracts."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)


class Executive(ContractModel):
    """Canonical Executive contract.

    Maps to `docs/domain/01-Executive.md` and the Executive Layer service in
    `docs/architecture/11-Service-Boundaries.md`. It represents a named
    executive role such as Jarvis, Hermes, Odysseus, or Athena without implying
    runtime behavior, APIs, or persistence.
    """

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    role_title: str = Field(min_length=1)
    status: Status
    ownership: Ownership
    mission_scope: list[str] = Field(default_factory=list)
    permission_level: PermissionLevel = PermissionLevel.READ
    responsibilities: list[str] = Field(default_factory=list)


class Company(ContractModel):
    """Canonical Company contract.

    Maps to `docs/domain/02-Company.md`. A Company is a living operational
    world that consumes capabilities and contains projects, knowledge,
    integrations, and operating state.
    """

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    mission: str = Field(min_length=1)
    status: Status
    lifecycle_state: LifecycleState
    ownership: Ownership
    vision: str | None = None
    goals: list[str] = Field(default_factory=list)
    capability_ids: list[str] = Field(default_factory=list)
    integration_ids: list[str] = Field(default_factory=list)
    operating_state: str | None = None


class Project(ContractModel):
    """Canonical Project contract.

    Maps to `docs/domain/05-Project.md`. A Project is the Sprint 1 work
    container and long-term operating unit inside a company world.
    """

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    status: Status
    lifecycle_state: LifecycleState
    ownership: Ownership
    company_id: str | None = None
    capability_ids: list[str] = Field(default_factory=list)
    mission: str | None = None
    outcome: str | None = None
    next_action_summary: str | None = None


class Task(ContractModel):
    """Canonical Task contract.

    Maps to `docs/domain/06-Task.md`. A Task is an execution unit beneath an
    agent or human workflow, with explicit scope, constraints, and output
    expectations.
    """

    id: str = Field(min_length=1)
    objective: str = Field(min_length=1)
    status: MissionStatus
    ownership: Ownership
    project_id: str | None = None
    capability_id: str | None = None
    scope: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    expected_output: str | None = None


class Capability(ContractModel):
    """Canonical Capability contract.

    Maps to `docs/domain/04-Capability.md` and
    `docs/architecture/11-Capability-Framework.md`. A Capability is a reusable
    enterprise skill with explicit ownership, dependencies, trust state,
    consumers, providers, and reusable input/output boundaries.
    """

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    description: str = Field(min_length=1)
    status: Status
    lifecycle_state: LifecycleState
    ownership: Ownership
    version: str = Field(min_length=1)
    certification_status: CapabilityCertificationStatus
    permission_level: PermissionLevel
    dependency_ids: list[str] = Field(default_factory=list)
    inputs: list[str] = Field(default_factory=list)
    outputs: list[str] = Field(default_factory=list)
    configuration_keys: list[str] = Field(default_factory=list)
    consumers: list[str] = Field(default_factory=list)
    providers: list[str] = Field(default_factory=list)
    marketplace_ready: bool = False
    documentation_notes: list[str] = Field(default_factory=list)
    testing_notes: list[str] = Field(default_factory=list)
    model_provider_ids: list[str] = Field(default_factory=list)


class Agent(ContractModel):
    """Canonical Agent contract.

    Maps to `docs/domain/03-Agent.md` and the Agent Runtime boundary in
    `docs/architecture/11-Service-Boundaries.md`. It represents a worker-layer
    contract without binding CommandCore to a specific runtime engine.
    """

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    role: str = Field(min_length=1)
    ownership: Ownership
    runtime_status: AgentRuntimeStatus
    permission_level: PermissionLevel
    model_provider_id: str | None = None
    capability_ids: list[str] = Field(default_factory=list)
    mission_queue: list[str] = Field(default_factory=list)
    state_summary: str | None = None


class Mission(ContractModel):
    """Canonical Mission contract.

    Maps to the Mission Engine in `docs/architecture/11-Service-Boundaries.md`
    and the mission-orchestration concepts in the executive and task domain
    documents. It expresses scoped work intent without defining registries,
    queues, APIs, or persistence.
    """

    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    status: MissionStatus
    ownership: Ownership
    requested_by: str = Field(min_length=1)
    scope: list[str] = Field(default_factory=list)
    capability_ids: list[str] = Field(default_factory=list)
    assigned_agent_id: str | None = None
    approval_required: bool = True
    required_output: str | None = None


class KnowledgeAsset(ContractModel):
    """Canonical KnowledgeAsset contract.

    Maps to `docs/domain/07-Knowledge.md`. It represents structured, safe,
    source-cited memory that can participate in search and future retrieval
    layers without defining a storage engine.
    """

    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    asset_type: str = Field(min_length=1)
    ownership: Ownership
    lifecycle_state: LifecycleState
    source_record_id: str | None = None
    workspace_id: str | None = None
    company_id: str | None = None
    project_id: str | None = None
    tags: list[str] = Field(default_factory=list)
    citations: list[str] = Field(default_factory=list)
    safe_to_query: bool = True


class Workspace(ContractModel):
    """Canonical Workspace contract.

    Maps to `docs/domain/08-Workspace.md`. A Workspace is the Sprint 1
    operational boundary that scopes users, records, search, and local-first
    memory.
    """

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    status: Status
    ownership: Ownership
    member_references: list[str] = Field(default_factory=list)
    local_first: bool = True
    offline_capable: bool = True
    knowledge_boundary_summary: str | None = None


class Integration(ContractModel):
    """Canonical Integration contract.

    Maps to `docs/domain/10-Integration.md` and the Integration Service
    boundary. It stores safe provider and dependency context without acting as
    a secret store or external connector implementation.
    """

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    provider_type: str = Field(min_length=1)
    status: Status
    ownership: Ownership
    dependency_role: str = Field(min_length=1)
    access_reference: str = Field(min_length=1)
    verification_summary: str | None = None
    related_company_id: str | None = None
    related_project_id: str | None = None


class ModelProvider(ContractModel):
    """Canonical ModelProvider contract.

    Maps to `docs/domain/11-Models.md`. It captures provider and runtime
    abstraction so capabilities, agents, and executive workflows can reference
    model support without binding to one vendor or runtime.
    """

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    provider_class: str = Field(min_length=1)
    ownership: Ownership
    status: Status
    lifecycle_state: LifecycleState
    local_first_compatible: bool = True
    supports_fallback: bool = False
    capabilities_supported: list[str] = Field(default_factory=list)
    routing_notes: list[str] = Field(default_factory=list)
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
