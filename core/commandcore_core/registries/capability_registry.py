"""Capability registry for the first Living Capability Library implementation.

This module provides the first in-memory implementation of the CommandCore
Living Capability Library described by the locked domain and architecture
documents. It is intentionally process-local and implementation-neutral:
no database, API surface, external services, or runtime integrations.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from commandcore_core.contracts import Capability, CapabilityCertificationStatus, Status


class DuplicateCapabilityIdError(ValueError):
    """Raised when attempting to register a capability with an existing ID."""


class CapabilityNotFoundError(KeyError):
    """Raised when a capability ID does not exist in the registry."""


@dataclass(slots=True)
class CapabilityRegistry:
    """In-memory registry for canonical Capability contracts.

    This is the first implementation of the Living Capability Library. It owns
    only in-memory registration and lookup behavior for `Capability` contracts
    and deliberately avoids persistence, service exposure, or workflow
    orchestration concerns.
    """

    _capabilities: dict[str, Capability] = field(default_factory=dict)

    def register_capability(self, capability: Capability) -> Capability:
        """Register a capability by its canonical ID.

        Raises:
            DuplicateCapabilityIdError: If the capability ID is already present.
        """

        if capability.id in self._capabilities:
            raise DuplicateCapabilityIdError(
                f"Capability ID already registered: {capability.id}"
            )

        self._capabilities[capability.id] = capability
        return capability

    def get_capability(self, capability_id: str) -> Capability:
        """Return a capability by ID.

        Raises:
            CapabilityNotFoundError: If the capability ID is unknown.
        """

        try:
            return self._capabilities[capability_id]
        except KeyError as exc:
            raise CapabilityNotFoundError(
                f"Capability ID not found: {capability_id}"
            ) from exc

    def list_capabilities(self) -> list[Capability]:
        """Return all registered capabilities in insertion order."""

        return list(self._capabilities.values())

    def find_by_name(self, name: str) -> list[Capability]:
        """Return all capabilities with a case-insensitive exact name match."""

        normalized = name.strip().casefold()
        return [
            capability
            for capability in self._capabilities.values()
            if capability.name.casefold() == normalized
        ]

    def find_by_status(self, status: Status) -> list[Capability]:
        """Return all capabilities matching the given lifecycle status."""

        return [
            capability
            for capability in self._capabilities.values()
            if capability.status == status
        ]

    def find_by_certification(
        self, certification_status: CapabilityCertificationStatus
    ) -> list[Capability]:
        """Return all capabilities matching the given certification status."""

        return [
            capability
            for capability in self._capabilities.values()
            if capability.certification_status == certification_status
        ]

    def find_consumers(self, capability_id: str) -> list[str]:
        """Return the registered consumers for a capability ID."""

        return list(self.get_capability(capability_id).consumers)

    def add_consumer(self, capability_id: str, consumer_id: str) -> Capability:
        """Attach a consumer ID to a capability if it is not already present."""

        capability = self.get_capability(capability_id)
        if consumer_id in capability.consumers:
            return capability

        updated = capability.model_copy(
            update={"consumers": [*capability.consumers, consumer_id]}
        )
        self._capabilities[capability_id] = updated
        return updated

    def remove_consumer(self, capability_id: str, consumer_id: str) -> Capability:
        """Remove a consumer ID from a capability if it is present."""

        capability = self.get_capability(capability_id)
        if consumer_id not in capability.consumers:
            return capability

        updated = capability.model_copy(
            update={
                "consumers": [
                    existing
                    for existing in capability.consumers
                    if existing != consumer_id
                ]
            }
        )
        self._capabilities[capability_id] = updated
        return updated
