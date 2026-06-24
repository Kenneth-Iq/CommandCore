"""Project registry for the first CommandCore project registry implementation.

This module provides the first in-memory implementation of the CommandCore
project registry described by the locked domain and architecture documents.
It is intentionally process-local and implementation-neutral: no database,
API surface, external services, or runtime integrations.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import ClassVar

from commandcore.contracts import Project, Status
from commandcore.framework.registry import BaseRegistry


class DuplicateProjectIdError(ValueError):
    """Raised when attempting to register a project with an existing ID."""


class ProjectNotFoundError(KeyError):
    """Raised when a project ID does not exist in the registry."""


@dataclass(slots=True)
class ProjectRegistry(BaseRegistry[Project]):
    """In-memory registry for canonical Project contracts.

    This is the first implementation of the project registry inside
    CommandCore. It owns only in-memory registration and lookup behavior for
    `Project` contracts and deliberately avoids persistence, service exposure,
    or orchestration concerns.
    """

    entity_label: ClassVar[str] = "Project"
    duplicate_error_cls: ClassVar[type[DuplicateProjectIdError]] = (
        DuplicateProjectIdError
    )
    not_found_error_cls: ClassVar[type[ProjectNotFoundError]] = ProjectNotFoundError
    created_event_name: ClassVar[str] = "ProjectCreated"
    default_event_source: ClassVar[str] = "commandcore.registries.project"

    @property
    def _projects(self) -> dict[str, Project]:
        """Compatibility alias for the historical internal storage name."""

        return self._entities

    def register_project(self, project: Project) -> Project:
        """Register a project by its canonical ID.

        Raises:
            DuplicateProjectIdError: If the project ID is already present.
        """

        return self.register(project)

    def get_project(self, project_id: str) -> Project:
        """Return a project by ID.

        Raises:
            ProjectNotFoundError: If the project ID is unknown.
        """

        return self.get(project_id)

    def list_projects(self) -> list[Project]:
        """Return all registered projects in insertion order."""

        return self.list()

    def find_by_company(self, company_id: str) -> list[Project]:
        """Return all projects attached to a given company ID."""

        return [project for project in self.list() if project.company_id == company_id]

    def add_task(self, project_id: str, task_id: str) -> Project:
        """Attach a task ID to a project if it is not already present."""

        project = self.get_project(project_id)
        if task_id in project.task_ids:
            return project

        updated = project.model_copy(update={"task_ids": [*project.task_ids, task_id]})
        return self._store(updated)

    def remove_task(self, project_id: str, task_id: str) -> Project:
        """Remove a task ID from a project if it is present."""

        project = self.get_project(project_id)
        if task_id not in project.task_ids:
            return project

        updated = project.model_copy(
            update={
                "task_ids": [existing for existing in project.task_ids if existing != task_id]
            }
        )
        return self._store(updated)

    def add_capability(self, project_id: str, capability_id: str) -> Project:
        """Attach a capability ID to a project if it is not already present."""

        project = self.get_project(project_id)
        if capability_id in project.capability_ids:
            return project

        updated = project.model_copy(
            update={"capability_ids": [*project.capability_ids, capability_id]}
        )
        return self._store(updated)

    def remove_capability(self, project_id: str, capability_id: str) -> Project:
        """Remove a capability ID from a project if it is present."""

        project = self.get_project(project_id)
        if capability_id not in project.capability_ids:
            return project

        updated = project.model_copy(
            update={
                "capability_ids": [
                    existing
                    for existing in project.capability_ids
                    if existing != capability_id
                ]
            }
        )
        return self._store(updated)

    def add_agent(self, project_id: str, agent_id: str) -> Project:
        """Attach an agent ID to a project if it is not already present."""

        project = self.get_project(project_id)
        if agent_id in project.agent_ids:
            return project

        updated = project.model_copy(update={"agent_ids": [*project.agent_ids, agent_id]})
        return self._store(updated)

    def remove_agent(self, project_id: str, agent_id: str) -> Project:
        """Remove an agent ID from a project if it is present."""

        project = self.get_project(project_id)
        if agent_id not in project.agent_ids:
            return project

        updated = project.model_copy(
            update={
                "agent_ids": [existing for existing in project.agent_ids if existing != agent_id]
            }
        )
        return self._store(updated)
