"""In-memory Knowledge Engine foundation for the CommandCore kernel."""

from __future__ import annotations

from collections import defaultdict

from pydantic import BaseModel, ConfigDict, Field

from commandcore.contracts import KnowledgeAsset
from commandcore.events import Event, EventType, InMemoryEventBus


class KnowledgeRelationship(BaseModel):
    """Directed relationship between two knowledge assets."""

    model_config = ConfigDict(extra="forbid", use_enum_values=False)

    source_asset_id: str = Field(min_length=1)
    target_asset_id: str = Field(min_length=1)
    relationship_type: str = Field(min_length=1)


class InMemoryKnowledgeEngine:
    """Store knowledge assets and relationships inside one process."""

    _SCOPE_FIELD_BY_TYPE = {
        "workspace": "workspace_id",
        "company": "company_id",
        "project": "project_id",
        "source_record": "source_record_id",
    }

    def __init__(self, event_bus: InMemoryEventBus | None = None) -> None:
        self._assets: dict[str, KnowledgeAsset] = {}
        self._relationships: list[KnowledgeRelationship] = []
        self._relationships_by_asset: dict[str, list[KnowledgeRelationship]] = (
            defaultdict(list)
        )
        self._event_bus = event_bus

    def add_asset(self, asset: KnowledgeAsset) -> KnowledgeAsset:
        """Store a knowledge asset by ID."""

        if asset.id in self._assets:
            raise ValueError(f"Knowledge asset ID already registered: {asset.id}")

        self._assets[asset.id] = asset
        self._publish(
            name="KnowledgeAssetCreated",
            payload={
                "asset_id": asset.id,
                "title": asset.title,
                "classification": asset.asset_type,
                "workspace_id": asset.workspace_id,
                "company_id": asset.company_id,
                "project_id": asset.project_id,
                "source_record_id": asset.source_record_id,
                "safe_to_query": asset.safe_to_query,
            },
        )
        return asset

    def get_asset(self, asset_id: str) -> KnowledgeAsset:
        """Return a knowledge asset by ID."""

        try:
            return self._assets[asset_id]
        except KeyError as exc:
            raise KeyError(f"Knowledge asset ID not found: {asset_id}") from exc

    def list_assets(self) -> list[KnowledgeAsset]:
        """Return all stored knowledge assets in insertion order."""

        return list(self._assets.values())

    def find_by_scope(self, scope_type: str, scope_id: str) -> list[KnowledgeAsset]:
        """Return assets that match one explicit scope boundary."""

        try:
            field_name = self._SCOPE_FIELD_BY_TYPE[scope_type]
        except KeyError as exc:
            raise ValueError(f"Unsupported scope type: {scope_type}") from exc

        return [
            asset
            for asset in self._assets.values()
            if getattr(asset, field_name) == scope_id
        ]

    def find_by_classification(self, classification: str) -> list[KnowledgeAsset]:
        """Return assets that match the current classification axis.

        The initial in-memory foundation uses the canonical `asset_type` field
        from `KnowledgeAsset` as the classification key.
        """

        normalized = classification.strip().casefold()
        return [
            asset
            for asset in self._assets.values()
            if asset.asset_type.casefold() == normalized
        ]

    def link_assets(
        self, source_asset_id: str, target_asset_id: str, relationship_type: str
    ) -> KnowledgeRelationship:
        """Create a directed relationship between two known assets."""

        self.get_asset(source_asset_id)
        self.get_asset(target_asset_id)

        relationship = KnowledgeRelationship(
            source_asset_id=source_asset_id,
            target_asset_id=target_asset_id,
            relationship_type=relationship_type,
        )
        if relationship in self._relationships:
            return relationship

        self._relationships.append(relationship)
        self._relationships_by_asset[source_asset_id].append(relationship)
        self._relationships_by_asset[target_asset_id].append(relationship)
        self._publish(
            name="KnowledgeAssetsLinked",
            payload={
                "source_asset_id": source_asset_id,
                "target_asset_id": target_asset_id,
                "relationship_type": relationship_type,
                "source_scope": self._scope_summary(self.get_asset(source_asset_id)),
                "target_scope": self._scope_summary(self.get_asset(target_asset_id)),
                "source_classification": self.get_asset(source_asset_id).asset_type,
                "target_classification": self.get_asset(target_asset_id).asset_type,
            },
        )
        return relationship

    def list_relationships(self, asset_id: str) -> list[KnowledgeRelationship]:
        """Return all relationships that include the given asset ID."""

        self.get_asset(asset_id)
        return list(self._relationships_by_asset[asset_id])

    @staticmethod
    def _scope_summary(asset: KnowledgeAsset) -> dict[str, str | None]:
        return {
            "workspace_id": asset.workspace_id,
            "company_id": asset.company_id,
            "project_id": asset.project_id,
            "source_record_id": asset.source_record_id,
        }

    def _publish(self, *, name: str, payload: dict[str, object]) -> None:
        if self._event_bus is None:
            return

        self._event_bus.publish(
            Event(
                type=EventType.DOMAIN,
                source="commandcore.knowledge.engine",
                payload={"event_name": name, **payload},
            )
        )
