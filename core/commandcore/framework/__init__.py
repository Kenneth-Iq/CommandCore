"""Shared framework primitives for the CommandCore kernel package."""

from .registry import BaseRegistry, DuplicateEntityError, EntityNotFoundError

__all__ = [
    "BaseRegistry",
    "DuplicateEntityError",
    "EntityNotFoundError",
]
