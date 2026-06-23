import time

import pytest

from conftest import wait_for, wait_for_status

from jarvis_core.approvals import ApprovalBroker
from jarvis_core.config import Settings
from jarvis_core.engine.mock import MockEngine
from jarvis_core.events import EventHub
from jarvis_core.ledger import Ledger
from jarvis_core.missions import MissionManager
from jarvis_core.odysseus import OdysseusClient
from jarvis_core.roles import RoleConfig
from jarvis_core.scheduler import Scheduler, next_run_after


ROLES = {
    "prime": RoleConfig(name="prime", max_tier=3),
    "researcher": RoleConfig(name="researcher", max_tier=1),
    "analyst": RoleConfig(name="analyst", max_tier=1),
    "writer": RoleConfig(name="writer", max_tier=1),
    "operator": RoleConfig(name="operator", max_tier=3),
}


class FakeOdysseus:
    """Stands in for OdysseusClient — enabled, with scripted memory hits."""

    def __init__(self, items=None):
        self._items = items or []
        self.added: list[tuple[str, str]] = []

    @property
    def enabled(self) -> bool:
        return True

    def search_memory(self, query: str, max_items: int = 5) -> list[str]:
        return self._items[:max_items]

    def add_memory(self, text: str, category: str = "fact") -> bool:
        self.added.append((text, category))
        return True


class RecordingEngine(MockEngine):
    """Wraps MockEngine, recording every (role, prompt) passed to run()."""

    def __init__(self):
        self.runs: list[tuple[str, str]] = []

    def run(self, *, mission, role, emit, approval_gate):
        self.runs.append((role.name, mission["prompt"]))
        return super().run(mission=mission, role=role, emit=emit,
                            approval_gate=approval_gate)


def make_manager(tmp_path, odysseus=None, roles=None, engine=None,
                 approval_timeout=0.3):
    settings = Settings(
        engine="mock", sandbox_root=tmp_path / "sandbox",
        ledger_path=tmp_path / "ledger.db", approval_timeout=approval_timeout,
    )
    ledger = Ledger(settings.resolved_ledger_path())
    hub = EventHub(ledger)
    broker = ApprovalBroker(ledger, hub, timeout=approval_timeout)
    engine = engine or MockEngine()
    manager = MissionManager(settings, ledger, hub, broker, engine,
                             roles or ROLES, odysseus)
    return settings, ledger, hub, broker, manager


def events_of(ledger, mission_id):
    return ledger.list_events(mission_id)


# ── C1: OdysseusClient no-ops cleanly ─────────────────────────────────────────

def test_odysseus_disabled_when_unconfigured():
    client = OdysseusClient(base_url=None, api_token=None)
    assert client.enabled is False
    assert client.search_memory("anything") == []
    assert client.add_memory("text") is False


def test_odysseus_unreachable_noops():
    client = OdysseusClient(base_url="http://127.0.0.1:1", api_token="tok",
                            timeout=0.5)
    assert client.enabled is True
    assert client.search_memory("anything") == []
    assert client.add_memory("text") is False


def test_odysseus_search_ranks_by_keyword_overlap(monkeypatch):
    """Odysseus has no token-scoped search route, so the client fetches the
    list and ranks it locally — relevant entries first, zero-overlap dropped."""
    import jarvis_core.odysseus as odysseus_mod

    memories = [
        {"text": "The kitchen lights are on a smart switch."},
        {"text": "Mission: research the smart home market. SITREP: market is growing."},
        {"text": "Completely unrelated note about taxes."},
    ]

    class Resp:
        def raise_for_status(self): pass
        def json(self): return {"memory": memories}

    monkeypatch.setattr(odysseus_mod.httpx, "get", lambda *a, **k: Resp())
    client = OdysseusClient(base_url="http://odysseus:7000", api_token="tok")

    results = client.search_memory("smart home market research", max_items=2)
    assert results[0].startswith("Mission: research the smart home")
    assert all("taxes" not in r for r in results)


# ── C2: memory.recalled emitted before plan.proposed, injected into fleet ────

def test_memory_recalled_and_injected(tmp_path):
    odysseus = FakeOdysseus(items=["fact one", "fact two"])
    engine = RecordingEngine()
    _, ledger, _, broker, manager = make_manager(tmp_path, odysseus=odysseus,
                                                  engine=engine)

    mission = manager.create("research the smart home market", mode="mission")
    mid = mission["id"]

    approval = wait_for(lambda: next(
        (a for a in ledger.list_approvals("pending")
         if a["action"] == "execute mission plan"), None))
    broker.resolve(approval["id"], "approve")

    wait_for(lambda: ledger.get_mission(mid)["status"] in ("completed", "failed"))

    types = [e["type"] for e in events_of(ledger, mid)]
    assert "memory.recalled" in types
    assert types.index("memory.recalled") < types.index("plan.proposed")

    recalled = next(e for e in events_of(ledger, mid) if e["type"] == "memory.recalled")
    assert recalled["payload"]["items"] == ["fact one", "fact two"]

    # the recalled memory shows up in at least one fleet task's instruction
    fleet_prompts = [p for role, p in engine.runs if role != "prime"]
    assert any("fact one" in p for p in fleet_prompts)


def test_no_memory_event_when_nothing_recalled(tmp_path):
    odysseus = FakeOdysseus(items=[])
    _, ledger, _, broker, manager = make_manager(tmp_path, odysseus=odysseus)

    mission = manager.create("research the smart home market", mode="mission")
    mid = mission["id"]
    approval = wait_for(lambda: next(
        (a for a in ledger.list_approvals("pending")
         if a["action"] == "execute mission plan"), None))
    broker.resolve(approval["id"], "approve")
    wait_for(lambda: ledger.get_mission(mid)["status"] in ("completed", "failed"))

    types = [e["type"] for e in events_of(ledger, mid)]
    assert "memory.recalled" not in types


# ── C3: successful mission writes a sitrep entry to Odysseus memory ─────────

def test_sitrep_written_to_memory(tmp_path):
    odysseus = FakeOdysseus(items=[])
    _, ledger, _, broker, manager = make_manager(tmp_path, odysseus=odysseus)

    mission = manager.create("research the smart home market", mode="mission")
    mid = mission["id"]
    approval = wait_for(lambda: next(
        (a for a in ledger.list_approvals("pending")
         if a["action"] == "execute mission plan"), None))
    broker.resolve(approval["id"], "approve")
    wait_for_status_ledger = lambda: ledger.get_mission(mid)["status"]
    wait_for(lambda: wait_for_status_ledger() == "completed")

    assert len(odysseus.added) == 1
    text, category = odysseus.added[0]
    assert category == "fact"
    assert "SITREP" in text


# ── C4: schedule cron validation ─────────────────────────────────────────────

def test_schedule_create_validates_cron(client):
    bad = client.post("/schedules", json={
        "name": "bad", "cron_expr": "not a cron", "prompt": "hello"})
    assert bad.status_code == 400

    good = client.post("/schedules", json={
        "name": "Daily", "cron_expr": "0 7 * * *", "prompt": "good morning"})
    assert good.status_code == 201
    schedule = good.json()["schedule"]
    assert schedule["next_run_at"]
    assert schedule["enabled"] is True or schedule["enabled"] == 1


# ── C5: scheduler tick fires a due schedule ──────────────────────────────────

def test_scheduler_tick_creates_mission(tmp_path):
    settings, ledger, hub, broker, manager = make_manager(tmp_path)
    scheduler = Scheduler(settings, ledger, manager)

    past = "2000-01-01T00:00:00+00:00"
    sched = ledger.create_schedule(
        name="Test Briefing", cron_expr="0 7 * * *", prompt="give a briefing",
        mode="mission", next_run_at=past, enabled=True)

    scheduler._tick()

    updated = ledger.get_schedule(sched["id"])
    assert updated["last_mission_id"] is not None
    assert updated["next_run_at"] > past
    mission = ledger.get_mission(updated["last_mission_id"])
    assert mission["prompt"] == "give a briefing"


# ── C6: low-ceiling scheduled mission auto-approves ──────────────────────────

def test_low_ceiling_auto_approves(tmp_path):
    _, ledger, _, broker, manager = make_manager(tmp_path)

    mission = manager.create("research the smart home market", mode="mission",
                             auto_approve_max_tier=1)
    mid = mission["id"]
    wait_for(lambda: ledger.get_mission(mid)["status"] in ("completed", "failed"))

    proposed = next(e for e in events_of(ledger, mid) if e["type"] == "plan.proposed")
    assert proposed["payload"]["auto_approved"] is True
    assert proposed["payload"]["approval_required"] is False

    approvals = [a for a in ledger.list_approvals(None)
                 if a["mission_id"] == mid and a["action"] == "execute mission plan"]
    assert approvals == []


# ── C7: high-ceiling scheduled mission still requires approval & times out ──

def test_high_ceiling_scheduled_mission_times_out(tmp_path):
    _, ledger, _, broker, manager = make_manager(tmp_path, approval_timeout=0.2)

    # "badplan" forces planner.fallback_plan -> single prime (max_tier 3) task
    mission = manager.create("badplan do something anyway", mode="mission",
                             auto_approve_max_tier=1)
    mid = mission["id"]

    proposed = wait_for(lambda: next(
        (e for e in events_of(ledger, mid) if e["type"] == "plan.proposed"), None))
    assert proposed["payload"]["auto_approved"] is False
    assert proposed["payload"]["approval_required"] is True

    final = wait_for(lambda: (m := ledger.get_mission(mid))
                     and m["status"] == "cancelled" and m, timeout=5.0)
    assert final["status"] == "cancelled"


# ── C8: ntfy notification posted on schedule completion ─────────────────────

def test_ntfy_notification_on_completion(tmp_path, monkeypatch):
    settings, ledger, hub, broker, manager = make_manager(tmp_path)
    scheduler = Scheduler(settings, ledger, manager)

    import jarvis_core.scheduler as scheduler_mod
    monkeypatch.setattr(scheduler_mod, "POLL_INTERVAL", 0.05)

    posted = []

    def fake_post(url, **kwargs):
        posted.append((url, kwargs))
        class Resp:
            def raise_for_status(self): pass
        return Resp()

    monkeypatch.setattr(scheduler_mod.httpx, "post", fake_post)

    past = "2000-01-01T00:00:00+00:00"
    ledger.create_schedule(
        name="Test Briefing", cron_expr="0 7 * * *", prompt="research the smart home market",
        mode="mission", next_run_at=past, enabled=True)

    scheduler._tick()

    wait_for(lambda: len(posted) > 0, timeout=5.0)
    url, kwargs = posted[0]
    assert url.endswith(f"/{settings.ntfy_topic}")
    assert "Test Briefing" in kwargs["headers"]["Title"]
