from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from commandcore.contracts import KnowledgeAsset, LifecycleState, Ownership, OwnershipKind
from commandcore.events import InMemoryEventBus
from commandcore.knowledge import InMemoryKnowledgeEngine


def make_ownership() -> Ownership:
    return Ownership(
        kind=OwnershipKind.DOMAIN,
        reference="commandcore.architecture",
        display_name="CommandCore Architecture",
    )


def make_asset(
    asset_id: str,
    *,
    title: str = "Launch Runbook",
    asset_type: str = "runbook",
    workspace_id: str | None = "ws-local",
    company_id: str | None = None,
    project_id: str | None = None,
    source_record_id: str | None = None,
    safe_to_query: bool = True,
) -> KnowledgeAsset:
    return KnowledgeAsset(
        id=asset_id,
        title=title,
        asset_type=asset_type,
        ownership=make_ownership(),
        lifecycle_state=LifecycleState.ACTIVE,
        source_record_id=source_record_id,
        workspace_id=workspace_id,
        company_id=company_id,
        project_id=project_id,
        safe_to_query=safe_to_query,
    )


def test_add_get_and_list_assets():
    engine = InMemoryKnowledgeEngine()
    asset = make_asset("know-runbook")

    engine.add_asset(asset)

    assert engine.get_asset("know-runbook") == asset
    assert engine.list_assets() == [asset]


def test_add_duplicate_asset_raises():
    engine = InMemoryKnowledgeEngine()
    asset = make_asset("know-runbook")
    engine.add_asset(asset)

    with pytest.raises(ValueError):
        engine.add_asset(asset)


def test_get_missing_asset_raises():
    engine = InMemoryKnowledgeEngine()

    with pytest.raises(KeyError):
        engine.get_asset("missing-asset")


def test_find_by_scope_filters_assets():
    engine = InMemoryKnowledgeEngine()
    project_asset = make_asset("know-project", project_id="proj-jarvis")
    company_asset = make_asset(
        "know-company", company_id="mindx", project_id=None, workspace_id=None
    )
    engine.add_asset(project_asset)
    engine.add_asset(company_asset)

    assert engine.find_by_scope("project", "proj-jarvis") == [project_asset]
    assert engine.find_by_scope("company", "mindx") == [company_asset]


def test_find_by_scope_rejects_unsupported_scope_type():
    engine = InMemoryKnowledgeEngine()

    with pytest.raises(ValueError):
        engine.find_by_scope("division", "div-1")


def test_find_by_classification_uses_asset_type_case_insensitively():
    engine = InMemoryKnowledgeEngine()
    runbook = make_asset("know-runbook", asset_type="Runbook")
    note = make_asset("know-note", asset_type="note")
    engine.add_asset(runbook)
    engine.add_asset(note)

    assert engine.find_by_classification("runbook") == [runbook]


def test_link_assets_and_list_relationships_for_both_assets():
    engine = InMemoryKnowledgeEngine()
    source = make_asset("know-source")
    target = make_asset("know-target", asset_type="decision")
    engine.add_asset(source)
    engine.add_asset(target)

    relationship = engine.link_assets("know-source", "know-target", "supports")

    assert relationship.relationship_type == "supports"
    assert engine.list_relationships("know-source") == [relationship]
    assert engine.list_relationships("know-target") == [relationship]


def test_link_assets_requires_known_assets():
    engine = InMemoryKnowledgeEngine()
    engine.add_asset(make_asset("know-source"))

    with pytest.raises(KeyError):
        engine.link_assets("know-source", "missing-target", "supports")


def test_events_are_published_only_when_event_bus_is_provided():
    bus = InMemoryEventBus()
    engine = InMemoryKnowledgeEngine(event_bus=bus)
    source = make_asset("know-source", project_id="proj-jarvis")
    target = make_asset("know-target", asset_type="decision")

    engine.add_asset(source)
    engine.add_asset(target)
    engine.link_assets("know-source", "know-target", "supports")

    events = bus.list_events()
    assert [event.payload["event_name"] for event in events] == [
        "KnowledgeAssetCreated",
        "KnowledgeAssetCreated",
        "KnowledgeAssetsLinked",
    ]
    assert events[0].payload["asset_id"] == "know-source"
    assert events[0].payload["classification"] == "runbook"
    assert events[0].payload["project_id"] == "proj-jarvis"
    assert events[-1].payload["source_asset_id"] == "know-source"
    assert events[-1].payload["target_asset_id"] == "know-target"
    assert events[-1].payload["relationship_type"] == "supports"
    assert events[-1].payload["source_classification"] == "runbook"
    assert events[-1].payload["target_classification"] == "decision"


def test_no_events_are_published_without_event_bus():
    engine = InMemoryKnowledgeEngine()
    asset = make_asset("know-runbook")

    engine.add_asset(asset)

    assert engine.list_assets() == [asset]
