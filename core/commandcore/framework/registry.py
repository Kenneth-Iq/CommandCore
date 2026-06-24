"""Shared registry framework for CommandCore in-memory registries."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import ClassVar, Generic, TypeVar

from commandcore.contracts import Status

EntityT = TypeVar("EntityT")


class DuplicateEntityError(ValueError):
    """Raised when attempting to register an entity with an existing ID."""


class EntityNotFoundError(KeyError):
    """Raised when a requested entity ID does not exist in the registry."""


@dataclass(slots=True)
class BaseRegistry(Generic[EntityT]):
    """Shared in-memory registry behavior for CommandCore entities.

    This base class centralizes the common duplication across the CommandCore
    registries while keeping each specific registry responsible for its own
    domain-specific methods and exception types.
    """

    _entities: dict[str, EntityT] = field(default_factory=dict)

    entity_label: ClassVar[str] = "Entity"
    duplicate_error_cls: ClassVar[type[DuplicateEntityError]] = DuplicateEntityError
    not_found_error_cls: ClassVar[type[EntityNotFoundError]] = EntityNotFoundError

    def register(self, entity: EntityT) -> EntityT:
        """Register an entity by its canonical `id` field."""

        entity_id = self._entity_id(entity)
        if entity_id in self._entities:
            raise self.duplicate_error_cls(
                f"{self.entity_label} ID already registered: {entity_id}"
            )

        self._entities[entity_id] = entity
        return entity

    def get(self, entity_id: str) -> EntityT:
        """Return an entity by ID."""

        try:
            return self._entities[entity_id]
        except KeyError as exc:
            raise self.not_found_error_cls(
                f"{self.entity_label} ID not found: {entity_id}"
            ) from exc

    def list(self) -> list[EntityT]:
        """Return all registered entities in insertion order."""

        return list(self._entities.values())

    def exists(self, entity_id: str) -> bool:
        """Return whether an entity ID is present in the registry."""

        return entity_id in self._entities

    def remove(self, entity_id: str) -> EntityT:
        """Remove and return an entity by ID."""

        entity = self.get(entity_id)
        del self._entities[entity_id]
        return entity

    def find_by_name(self, name: str) -> list[EntityT]:
        """Return all entities with a case-insensitive exact name match."""

        normalized = name.strip().casefold()
        return [
            entity
            for entity in self._entities.values()
            if self._entity_name(entity).casefold() == normalized
        ]

    def find_by_status(self, status: Status) -> list[EntityT]:
        """Return all entities matching the given general status."""

        return [
            entity
            for entity in self._entities.values()
            if self._entity_status(entity) == status
        ]

    def _store(self, entity: EntityT) -> EntityT:
        """Replace an existing entity in the registry and return it."""

        self._entities[self._entity_id(entity)] = entity
        return entity

    @staticmethod
    def _entity_id(entity: EntityT) -> str:
        return getattr(entity, "id")

    @staticmethod
    def _entity_name(entity: EntityT) -> str:
        return getattr(entity, "name")

    @staticmethod
    def _entity_status(entity: EntityT) -> Status:
        return getattr(entity, "status")
