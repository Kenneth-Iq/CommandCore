"""Workspace registry for the first CommandCore workspace registry.

This module provides the first in-memory implementation of the CommandCore
workspace registry described by the locked domain and architecture documents.
It is intentionally process-local and implementation-neutral: no database,
API surface, external services, or runtime integrations.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import ClassVar

from commandcore.contracts import Status, Workspace
from commandcore.framework.registry import BaseRegistry


class DuplicateWorkspaceIdError(ValueError):
    """Raised when attempting to register a workspace with an existing ID."""


class WorkspaceNotFoundError(KeyError):
    """Raised when a workspace ID does not exist in the registry."""


@dataclass(slots=True)
class WorkspaceRegistry(BaseRegistry[Workspace]):
    """In-memory registry for canonical Workspace contracts.

    This is the first implementation of the CommandCore workspace registry.
    It owns only in-memory registration and lookup behavior for `Workspace`
    contracts and deliberately avoids persistence, service exposure, or
    orchestration concerns.
    """

    entity_label: ClassVar[str] = "Workspace"
    duplicate_error_cls: ClassVar[type[DuplicateWorkspaceIdError]] = (
        DuplicateWorkspaceIdError
    )
    not_found_error_cls: ClassVar[type[WorkspaceNotFoundError]] = (
        WorkspaceNotFoundError
    )
    created_event_name: ClassVar[str] = "WorkspaceCreated"
    default_event_source: ClassVar[str] = "commandcore.registries.workspace"

    @property
    def _workspaces(self) -> dict[str, Workspace]:
        """Compatibility alias for the historical internal storage name."""

        return self._entities

    def register_workspace(self, workspace: Workspace) -> Workspace:
        """Register a workspace by its canonical ID.

        Raises:
            DuplicateWorkspaceIdError: If the workspace ID is already present.
        """

        return self.register(workspace)

    def get_workspace(self, workspace_id: str) -> Workspace:
        """Return a workspace by ID.

        Raises:
            WorkspaceNotFoundError: If the workspace ID is unknown.
        """

        return self.get(workspace_id)

    def list_workspaces(self) -> list[Workspace]:
        """Return all registered workspaces in insertion order."""

        return self.list()

    def add_company(self, workspace_id: str, company_id: str) -> Workspace:
        """Attach a company ID to a workspace if it is not already present."""

        workspace = self.get_workspace(workspace_id)
        if company_id in workspace.company_ids:
            return workspace

        updated = workspace.model_copy(
            update={"company_ids": [*workspace.company_ids, company_id]}
        )
        return self._store(updated)

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
        return self._store(updated)

    def add_project(self, workspace_id: str, project_id: str) -> Workspace:
        """Attach a project ID to a workspace if it is not already present."""

        workspace = self.get_workspace(workspace_id)
        if project_id in workspace.project_ids:
            return workspace

        updated = workspace.model_copy(
            update={"project_ids": [*workspace.project_ids, project_id]}
        )
        return self._store(updated)

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
        return self._store(updated)

    def add_agent(self, workspace_id: str, agent_id: str) -> Workspace:
        """Attach an agent ID to a workspace if it is not already present."""

        workspace = self.get_workspace(workspace_id)
        if agent_id in workspace.agent_ids:
            return workspace

        updated = workspace.model_copy(
            update={"agent_ids": [*workspace.agent_ids, agent_id]}
        )
        return self._store(updated)

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
        return self._store(updated)

    def add_capability(self, workspace_id: str, capability_id: str) -> Workspace:
        """Attach a capability ID to a workspace if it is not already present."""

        workspace = self.get_workspace(workspace_id)
        if capability_id in workspace.capability_ids:
            return workspace

        updated = workspace.model_copy(
            update={"capability_ids": [*workspace.capability_ids, capability_id]}
        )
        return self._store(updated)

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
        return self._store(updated)
