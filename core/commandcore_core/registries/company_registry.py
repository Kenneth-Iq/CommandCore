"""Company registry for the first living company/world implementation.

This module provides the first in-memory implementation of the CommandCore
living company/world registry described by the locked domain and architecture
documents. It is intentionally process-local and implementation-neutral:
no database, API surface, external services, or runtime integrations.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from commandcore_core.contracts import Company, Status


class DuplicateCompanyIdError(ValueError):
    """Raised when attempting to register a company with an existing ID."""


class CompanyNotFoundError(KeyError):
    """Raised when a company ID does not exist in the registry."""


@dataclass(slots=True)
class CompanyRegistry:
    """In-memory registry for canonical Company contracts.

    This is the first implementation of the CommandCore living company/world
    registry. It owns only in-memory registration and lookup behavior for
    `Company` contracts and deliberately avoids persistence, service exposure,
    or orchestration concerns.
    """

    _companies: dict[str, Company] = field(default_factory=dict)

    def register_company(self, company: Company) -> Company:
        """Register a company by its canonical ID.

        Raises:
            DuplicateCompanyIdError: If the company ID is already present.
        """

        if company.id in self._companies:
            raise DuplicateCompanyIdError(
                f"Company ID already registered: {company.id}"
            )

        self._companies[company.id] = company
        return company

    def get_company(self, company_id: str) -> Company:
        """Return a company by ID.

        Raises:
            CompanyNotFoundError: If the company ID is unknown.
        """

        try:
            return self._companies[company_id]
        except KeyError as exc:
            raise CompanyNotFoundError(
                f"Company ID not found: {company_id}"
            ) from exc

    def list_companies(self) -> list[Company]:
        """Return all registered companies in insertion order."""

        return list(self._companies.values())

    def find_by_name(self, name: str) -> list[Company]:
        """Return all companies with a case-insensitive exact name match."""

        normalized = name.strip().casefold()
        return [
            company
            for company in self._companies.values()
            if company.name.casefold() == normalized
        ]

    def find_by_status(self, status: Status) -> list[Company]:
        """Return all companies matching the given general status."""

        return [
            company for company in self._companies.values() if company.status == status
        ]

    def add_project(self, company_id: str, project_id: str) -> Company:
        """Attach a project ID to a company if it is not already present."""

        company = self.get_company(company_id)
        if project_id in company.project_ids:
            return company

        updated = company.model_copy(
            update={"project_ids": [*company.project_ids, project_id]}
        )
        self._companies[company_id] = updated
        return updated

    def remove_project(self, company_id: str, project_id: str) -> Company:
        """Remove a project ID from a company if it is present."""

        company = self.get_company(company_id)
        if project_id not in company.project_ids:
            return company

        updated = company.model_copy(
            update={
                "project_ids": [
                    existing for existing in company.project_ids if existing != project_id
                ]
            }
        )
        self._companies[company_id] = updated
        return updated

    def add_capability(self, company_id: str, capability_id: str) -> Company:
        """Attach a capability ID to a company if it is not already present."""

        company = self.get_company(company_id)
        if capability_id in company.capability_ids:
            return company

        updated = company.model_copy(
            update={"capability_ids": [*company.capability_ids, capability_id]}
        )
        self._companies[company_id] = updated
        return updated

    def remove_capability(self, company_id: str, capability_id: str) -> Company:
        """Remove a capability ID from a company if it is present."""

        company = self.get_company(company_id)
        if capability_id not in company.capability_ids:
            return company

        updated = company.model_copy(
            update={
                "capability_ids": [
                    existing
                    for existing in company.capability_ids
                    if existing != capability_id
                ]
            }
        )
        self._companies[company_id] = updated
        return updated

    def add_agent(self, company_id: str, agent_id: str) -> Company:
        """Attach an agent ID to a company if it is not already present."""

        company = self.get_company(company_id)
        if agent_id in company.agent_ids:
            return company

        updated = company.model_copy(
            update={"agent_ids": [*company.agent_ids, agent_id]}
        )
        self._companies[company_id] = updated
        return updated

    def remove_agent(self, company_id: str, agent_id: str) -> Company:
        """Remove an agent ID from a company if it is present."""

        company = self.get_company(company_id)
        if agent_id not in company.agent_ids:
            return company

        updated = company.model_copy(
            update={
                "agent_ids": [
                    existing for existing in company.agent_ids if existing != agent_id
                ]
            }
        )
        self._companies[company_id] = updated
        return updated
