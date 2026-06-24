"""Unit of work interfaces for CommandCore persistence."""

from __future__ import annotations

from abc import ABC, abstractmethod


class UnitOfWork(ABC):
    """Abstract transactional boundary for persistence operations."""

    @abstractmethod
    def __enter__(self) -> "UnitOfWork":
        """Enter one persistence work scope."""

    @abstractmethod
    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        """Exit one persistence work scope."""

    @abstractmethod
    def commit(self) -> None:
        """Persist the current unit of work."""

    @abstractmethod
    def rollback(self) -> None:
        """Discard the current unit of work."""
