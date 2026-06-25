"""FastAPI application factory for the read-only CommandCore API."""

from __future__ import annotations

from functools import lru_cache

from fastapi import FastAPI

from commandcore.bootstrap import CommandCoreKernel, create_in_memory_kernel

from .routes import build_router


@lru_cache(maxsize=1)
def get_api_kernel() -> CommandCoreKernel:
    """Return the shared in-memory kernel for the API process."""

    return create_in_memory_kernel()


def create_api_app() -> FastAPI:
    """Create the read-only CommandCore FastAPI application."""

    api = FastAPI(
        title="CommandCore Read-Only API",
        version="0.1.0",
    )
    api.include_router(build_router(get_api_kernel()))
    return api


app = create_api_app()
