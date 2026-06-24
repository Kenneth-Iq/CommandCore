"""Capability registry for the first Living Capability Library implementation.

This module provides the first in-memory implementation of the CommandCore
Living Capability Library described by the locked domain and architecture
documents. It is intentionally process-local and implementation-neutral:
no database, API surface, external services, or runtime integrations.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import ClassVar

from commandcore.contracts import Capability, CapabilityCertificationStatus, Status
from commandcore.framework.registry import BaseRegistry


class DuplicateCapabilityIdError(ValueError):
    """Raised when attempting to register a capability with an existing ID."""


class CapabilityNotFoundError(KeyError):
    """Raised when a capability ID does not exist in the registry."""


@dataclass(slots=True)
class CapabilityRegistry(BaseRegistry[Capability]):
    """In-memory registry for canonical Capability contracts.

    This is the first implementation of the Living Capability Library. It owns
    only in-memory registration and lookup behavior for `Capability` contracts
    and deliberately avoids persistence, service exposure, or workflow
    orchestration concerns.
    """

    entity_label: ClassVar[str] = "Capability"
    duplicate_error_cls: ClassVar[type[DuplicateCapabilityIdError]] = (
        DuplicateCapabilityIdError
    )
    not_found_error_cls: ClassVar[type[CapabilityNotFoundError]] = (
        CapabilityNotFoundError
    )
    created_event_name: ClassVar[str] = "CapabilityRegistered"
    default_event_source: ClassVar[str] = "commandcore.registries.capability"

    @property
    def _capabilities(self) -> dict[str, Capability]:
        """Compatibility alias for the historical internal storage name."""

        return self._entities

    def register_capability(self, capability: Capability) -> Capability:
        """Register a capability by its canonical ID.

        Raises:
            DuplicateCapabilityIdError: If the capability ID is already present.
        """

        return self.register(capability)

    def get_capability(self, capability_id: str) -> Capability:
        """Return a capability by ID.

        Raises:
            CapabilityNotFoundError: If the capability ID is unknown.
        """

        return self.get(capability_id)

    def list_capabilities(self) -> list[Capability]:
        """Return all registered capabilities in insertion order."""

        return self.list()

    def find_by_certification(
        self, certification_status: CapabilityCertificationStatus
    ) -> list[Capability]:
        """Return all capabilities matching the given certification status."""

        return [
            capability
            for capability in self.list()
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
        return self._store(updated)

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
        return self._store(updated)
