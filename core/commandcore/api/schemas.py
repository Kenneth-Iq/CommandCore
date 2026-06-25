"""API response schemas for the read-only CommandCore FastAPI surface."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict


class FlexibleResponse(BaseModel):
    """Permissive response model for existing dashboard payloads."""

    model_config = ConfigDict(extra="allow")


class HealthResponse(FlexibleResponse):
    """Health snapshot response shape."""


class ReadinessResponse(FlexibleResponse):
    """Readiness report response shape."""


class DashboardResponse(FlexibleResponse):
    """Dashboard response shape."""


JsonDict = dict[str, Any]
