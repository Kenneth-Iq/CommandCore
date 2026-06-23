import time

import pytest
from fastapi.testclient import TestClient

from jarvis_core.app import create_app
from jarvis_core.config import Settings


def make_client(tmp_path, **overrides) -> TestClient:
    settings = Settings(
        engine="mock",
        sandbox_root=tmp_path / "sandbox",
        ledger_path=tmp_path / "ledger.db",
        approval_timeout=overrides.pop("approval_timeout", 5.0),
        **overrides,
    )
    return TestClient(create_app(settings))


@pytest.fixture
def client(tmp_path):
    with make_client(tmp_path) as c:
        yield c


@pytest.fixture
def client_fast_timeout(tmp_path):
    with make_client(tmp_path, approval_timeout=0.2) as c:
        yield c


def wait_for(predicate, timeout=5.0, interval=0.02):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        value = predicate()
        if value:
            return value
        time.sleep(interval)
    raise TimeoutError("condition not met within timeout")


def wait_for_status(client, mission_id, status, timeout=5.0):
    return wait_for(
        lambda: (m := client.get(f"/missions/{mission_id}").json()["mission"])
        and m["status"] == status and m,
        timeout=timeout,
    )
