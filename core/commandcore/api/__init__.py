"""Read-only FastAPI surface for the CommandCore kernel."""

from .app import create_api_app

__all__ = ["create_api_app"]
