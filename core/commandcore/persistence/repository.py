"""Persistence repository interfaces for CommandCore."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Generic, TypeVar

EntityT = TypeVar("EntityT")


class Repository(Generic[EntityT], ABC):
    """Abstract repository interface for aggregate persistence boundaries."""

    @abstractmethod
    def add(self, entity: EntityT) -> EntityT:
        """Persist and return one entity."""

    @abstractmethod
    def get(self, entity_id: str) -> EntityT:
        """Return one entity by ID."""

    @abstractmethod
    def list(self) -> list[EntityT]:
        """Return all persisted entities in insertion order."""

    @abstractmethod
    def exists(self, entity_id: str) -> bool:
        """Return whether one entity ID is present."""

    @abstractmethod
    def remove(self, entity_id: str) -> EntityT:
        """Remove and return one entity by ID."""

    @abstractmethod
    def clear(self) -> None:
        """Remove all persisted entities from this repository."""


@dataclass(slots=True)
class InMemoryRepository(Repository[EntityT], Generic[EntityT]):
    """Simple in-memory repository base for future persistence adapters."""

    _entities: dict[str, EntityT] = field(default_factory=dict)

    def add(self, entity: EntityT) -> EntityT:
        entity_id = self._entity_id(entity)
        if entity_id in self._entities:
            raise ValueError(f"Entity ID already registered: {entity_id}")
        self._entities[entity_id] = entity
        return entity

    def get(self, entity_id: str) -> EntityT:
        try:
            return self._entities[entity_id]
        except KeyError as exc:
            raise KeyError(f"Entity ID not found: {entity_id}") from exc

    def list(self) -> list[EntityT]:
        return list(self._entities.values())

    def exists(self, entity_id: str) -> bool:
        return entity_id in self._entities

    def remove(self, entity_id: str) -> EntityT:
        entity = self.get(entity_id)
        del self._entities[entity_id]
        return entity

    def clear(self) -> None:
        self._entities.clear()

    @staticmethod
    def _entity_id(entity: EntityT) -> str:
        return getattr(entity, "id")
