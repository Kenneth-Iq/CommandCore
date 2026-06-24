"""Storage provider interfaces for CommandCore persistence."""

from __future__ import annotations

from abc import ABC, abstractmethod


class StorageProvider(ABC):
    """Abstract storage provider lifecycle for persistence adapters."""

    @abstractmethod
    def connect(self) -> None:
        """Initialize the provider for future repository operations."""

    @abstractmethod
    def disconnect(self) -> None:
        """Tear down provider resources."""

    @abstractmethod
    def is_connected(self) -> bool:
        """Return whether the provider is currently available."""

    @abstractmethod
    def clear(self) -> None:
        """Reset provider-managed storage for the current scope."""
