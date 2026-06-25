from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from commandcore.api import create_api_app
from commandcore.api.app import app


def test_commandcore_api_app_creates_successfully():
    created = create_api_app()

    assert created.title == "CommandCore Read-Only API"


def test_commandcore_api_module_level_app_exists_and_health_returns_200():
    assert app is not None

    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert "event_count" in response.json()


def test_commandcore_api_routes_return_200_and_expected_fields():
    with TestClient(create_api_app()) as client:
        health = client.get("/health")
        readiness = client.get("/readiness")
        kernel = client.get("/dashboard/kernel")
        executive = client.get("/dashboard/executive")
        missions = client.get("/dashboard/missions")
        agents = client.get("/dashboard/agents")
        tools = client.get("/dashboard/tools")
        conversations = client.get("/dashboard/conversations")
        workspaces = client.get("/dashboard/workspaces")
        knowledge = client.get("/dashboard/knowledge")

    assert health.status_code == 200
    assert readiness.status_code == 200
    assert kernel.status_code == 200
    assert executive.status_code == 200
    assert missions.status_code == 200
    assert agents.status_code == 200
    assert tools.status_code == 200
    assert conversations.status_code == 200
    assert workspaces.status_code == 200
    assert knowledge.status_code == 200

    assert "event_count" in health.json()
    assert "status" in readiness.json()
    assert "executive_dashboard" in kernel.json()
    assert "objective_counts" in executive.json()
    assert "mission_counts" in missions.json()
    assert "agent_counts" in agents.json()
    assert "tool_counts" in tools.json()
    assert "conversation_counts" in conversations.json()
    assert "workspace_counts" in workspaces.json()
    assert "knowledge_counts" in knowledge.json()


def test_commandcore_api_is_read_only_for_defined_routes():
    with TestClient(create_api_app()) as client:
        response = client.post("/dashboard/kernel")

    assert response.status_code == 405
