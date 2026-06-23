"""In-memory registries for CommandCore core contracts."""

from .agent_registry import AgentNotFoundError, AgentRegistry, DuplicateAgentIdError
from .capability_registry import (
    CapabilityNotFoundError,
    CapabilityRegistry,
    DuplicateCapabilityIdError,
)
from .company_registry import (
    CompanyNotFoundError,
    CompanyRegistry,
    DuplicateCompanyIdError,
)
from .project_registry import (
    DuplicateProjectIdError,
    ProjectNotFoundError,
    ProjectRegistry,
)
from .workspace_registry import (
    DuplicateWorkspaceIdError,
    WorkspaceNotFoundError,
    WorkspaceRegistry,
)

__all__ = [
    "AgentNotFoundError",
    "AgentRegistry",
    "CapabilityNotFoundError",
    "CapabilityRegistry",
    "CompanyNotFoundError",
    "CompanyRegistry",
    "DuplicateAgentIdError",
    "DuplicateCapabilityIdError",
    "DuplicateCompanyIdError",
    "DuplicateProjectIdError",
    "DuplicateWorkspaceIdError",
    "ProjectNotFoundError",
    "ProjectRegistry",
    "WorkspaceNotFoundError",
    "WorkspaceRegistry",
]
