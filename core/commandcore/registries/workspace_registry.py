"""Workspace registry for the first CommandCore workspace registry.

This module provides the first in-memory implementation of the CommandCore
workspace registry described by the locked domain and architecture documents.
It is intentionally process-local and implementation-neutral: no database,
API surface, external services, or runtime integrations.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from commandcore.contracts import Status, Workspace


class DuplicateWorkspaceIdError(ValueError):
    """Raised when attempting to register a workspace with an existing ID."""


class WorkspaceNotFoundError(KeyError):
    """Raised when a workspace ID does not exist in the registry."""


@dataclass(slots=True)
class WorkspaceRegistry:
    """In-memory registry for canonical Workspace contracts.

    This is the first implementation of the CommandCore workspace registry.
    It owns only in-memory registration and lookup behavior for `Workspace`
    contracts and deliberately avoids persistence, service exposure, or
    orchestration concerns.
    """

    _workspaces: dict[str, Workspace] = field(default_factory=dict)

    def register_workspace(self, workspace: Workspace) -> Workspace:
        """Register a workspace by its canonical ID.

        Raises:
            DuplicateWorkspaceIdError: If the workspace ID is already present.
        """

        if workspace.id in self._workspaces:
            raise DuplicateWorkspaceIdError(
                f"Workspace ID already registered: {workspace.id}"
            )

        self._workspaces[workspace.id] = workspace
        return workspace

    def get_workspace(self, workspace_id: str) -> Workspace:
        """Return a workspace by ID.

        Raises:
            WorkspaceNotFoundError: If the workspace ID is unknown.
        """

        try:
            return self._workspaces[workspace_id]
        except KeyError as exc:
            raise WorkspaceNotFoundError(
                f"Workspace ID not found: {workspace_id}"
            ) from exc

    def list_workspaces(self) -> list[Workspace]:
        """Return all registered workspaces in insertion order."""

        return list(self._workspaces.values())

    def find_by_name(self, name: str) -> list[Workspace]:
        """Return all workspaces with a case-insensitive exact name match."""

        normalized = name.strip().casefold()
        return [
            workspace
            for workspace in self._workspaces.values()
            if workspace.name.casefold() == normalized
        ]

    def find_by_status(self, status: Status) -> list[Workspace]:
        """Return all workspaces matching the given general status."""

        return [
            workspace
            for workspace in self._workspaces.values()
            if workspace.status == status
        ]

    def add_company(self, workspace_id: str, company_id: str) -> Workspace:
        """Attach a company ID to a workspace if it is not already present."""

        workspace = self.get_workspace(workspace_id)
        if company_id in workspace.company_ids:
            return workspace

        updated = workspace.model_copy(
            update={"company_ids": [*workspace.company_ids, company_id]}
        )
        self._workspaces[workspace_id] = updated
        return updated

    def remove_company(self, workspace_id: str, company_id: str) -> Workspace:
        """Remove a company ID from a workspace if it is present."""

        workspace = self.get_workspace(workspace_id)
        if company_id not in workspace.company_ids:
            return workspace

        updated = workspace.model_copy(
            update={
                "company_ids": [
                    existing
                    for existing in workspace.company_ids
                    if existing != company_id
                ]
            }
        )
        self._workspaces[workspace_id] = updated
        return updated

    def add_project(self, workspace_id: str, project_id: str) -> Workspace:
        """Attach a project ID to a workspace if it is not already present."""

        workspace = self.get_workspace(workspace_id)
        if project_id in workspace.project_ids:
            return workspace

        updated = workspace.model_copy(
            update={"project_ids": [*workspace.project_ids, project_id]}
        )
        self._workspaces[workspace_id] = updated
        return updated

    def remove_project(self, workspace_id: str, project_id: str) -> Workspace:
        """Remove a project ID from a workspace if it is present."""

        workspace = self.get_workspace(workspace_id)
        if project_id not in workspace.project_ids:
            return workspace

        updated = workspace.model_copy(
            update={
                "project_ids": [
                    existing
                    for existing in workspace.project_ids
                    if existing != project_id
                ]
            }
        )
        self._workspaces[workspace_id] = updated
        return updated

    def add_agent(self, workspace_id: str, agent_id: str) -> Workspace:
        """Attach an agent ID to a workspace if it is not already present."""

        workspace = self.get_workspace(workspace_id)
        if agent_id in workspace.agent_ids:
            return workspace

        updated = workspace.model_copy(
            update={"agent_ids": [*workspace.agent_ids, agent_id]}
        )
        self._workspaces[workspace_id] = updated
        return updated

    def remove_agent(self, workspace_id: str, agent_id: str) -> Workspace:
        """Remove an agent ID from a workspace if it is present."""

        workspace = self.get_workspace(workspace_id)
        if agent_id not in workspace.agent_ids:
            return workspace

        updated = workspace.model_copy(
            update={
                "agent_ids": [
                    existing for existing in workspace.agent_ids if existing != agent_id
                ]
            }
        )
        self._workspaces[workspace_id] = updated
        return updated

    def add_capability(self, workspace_id: str, capability_id: str) -> Workspace:
        """Attach a capability ID to a workspace if it is not already present."""

        workspace = self.get_workspace(workspace_id)
        if capability_id in workspace.capability_ids:
            return workspace

        updated = workspace.model_copy(
            update={"capability_ids": [*workspace.capability_ids, capability_id]}
        )
        self._workspaces[workspace_id] = updated
        return updated

    def remove_capability(self, workspace_id: str, capability_id: str) -> Workspace:
        """Remove a capability ID from a workspace if it is present."""

        workspace = self.get_workspace(workspace_id)
        if capability_id not in workspace.capability_ids:
            return workspace

        updated = workspace.model_copy(
            update={
                "capability_ids": [
                    existing
                    for existing in workspace.capability_ids
                    if existing != capability_id
                ]
            }
        )
        self._workspaces[workspace_id] = updated
        return updated
