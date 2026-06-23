"""Project registry for the first CommandCore project registry implementation.

This module provides the first in-memory implementation of the CommandCore
project registry described by the locked domain and architecture documents.
It is intentionally process-local and implementation-neutral: no database,
API surface, external services, or runtime integrations.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from commandcore.contracts import Project, Status


class DuplicateProjectIdError(ValueError):
    """Raised when attempting to register a project with an existing ID."""


class ProjectNotFoundError(KeyError):
    """Raised when a project ID does not exist in the registry."""


@dataclass(slots=True)
class ProjectRegistry:
    """In-memory registry for canonical Project contracts.

    This is the first implementation of the project registry inside
    CommandCore. It owns only in-memory registration and lookup behavior for
    `Project` contracts and deliberately avoids persistence, service exposure,
    or orchestration concerns.
    """

    _projects: dict[str, Project] = field(default_factory=dict)

    def register_project(self, project: Project) -> Project:
        """Register a project by its canonical ID.

        Raises:
            DuplicateProjectIdError: If the project ID is already present.
        """

        if project.id in self._projects:
            raise DuplicateProjectIdError(
                f"Project ID already registered: {project.id}"
            )

        self._projects[project.id] = project
        return project

    def get_project(self, project_id: str) -> Project:
        """Return a project by ID.

        Raises:
            ProjectNotFoundError: If the project ID is unknown.
        """

        try:
            return self._projects[project_id]
        except KeyError as exc:
            raise ProjectNotFoundError(
                f"Project ID not found: {project_id}"
            ) from exc

    def list_projects(self) -> list[Project]:
        """Return all registered projects in insertion order."""

        return list(self._projects.values())

    def find_by_name(self, name: str) -> list[Project]:
        """Return all projects with a case-insensitive exact name match."""

        normalized = name.strip().casefold()
        return [
            project
            for project in self._projects.values()
            if project.name.casefold() == normalized
        ]

    def find_by_status(self, status: Status) -> list[Project]:
        """Return all projects matching the given general status."""

        return [project for project in self._projects.values() if project.status == status]

    def find_by_company(self, company_id: str) -> list[Project]:
        """Return all projects attached to a given company ID."""

        return [
            project
            for project in self._projects.values()
            if project.company_id == company_id
        ]

    def add_task(self, project_id: str, task_id: str) -> Project:
        """Attach a task ID to a project if it is not already present."""

        project = self.get_project(project_id)
        if task_id in project.task_ids:
            return project

        updated = project.model_copy(update={"task_ids": [*project.task_ids, task_id]})
        self._projects[project_id] = updated
        return updated

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
        self._projects[project_id] = updated
        return updated

    def add_capability(self, project_id: str, capability_id: str) -> Project:
        """Attach a capability ID to a project if it is not already present."""

        project = self.get_project(project_id)
        if capability_id in project.capability_ids:
            return project

        updated = project.model_copy(
            update={"capability_ids": [*project.capability_ids, capability_id]}
        )
        self._projects[project_id] = updated
        return updated

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
        self._projects[project_id] = updated
        return updated

    def add_agent(self, project_id: str, agent_id: str) -> Project:
        """Attach an agent ID to a project if it is not already present."""

        project = self.get_project(project_id)
        if agent_id in project.agent_ids:
            return project

        updated = project.model_copy(update={"agent_ids": [*project.agent_ids, agent_id]})
        self._projects[project_id] = updated
        return updated

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
        self._projects[project_id] = updated
        return updated
