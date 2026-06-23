"""CommandCore Core package.

This package holds implementation-neutral contracts that map the locked
CommandCore domain and architecture documents into portable Python models.
"""

from .contracts import (
    Agent,
    AgentRuntimeStatus,
    Capability,
    CapabilityCertificationStatus,
    Company,
    Executive,
    Integration,
    KnowledgeAsset,
    LifecycleState,
    Mission,
    MissionStatus,
    ModelProvider,
    Ownership,
    OwnershipKind,
    PermissionLevel,
    Project,
    Status,
    Task,
    Workspace,
)

__all__ = [
    "Agent",
    "AgentRuntimeStatus",
    "Capability",
    "CapabilityCertificationStatus",
    "Company",
    "Executive",
    "Integration",
    "KnowledgeAsset",
    "LifecycleState",
    "Mission",
    "MissionStatus",
    "ModelProvider",
    "Ownership",
    "OwnershipKind",
    "PermissionLevel",
    "Project",
    "Status",
    "Task",
    "Workspace",
]
