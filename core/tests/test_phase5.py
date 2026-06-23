import asyncio
import json

import pytest

from conftest import wait_for

from jarvis_core.approvals import ApprovalBroker
from jarvis_core.config import Settings
from jarvis_core.engine.mock import MockEngine
from jarvis_core.events import EventHub
from jarvis_core.ledger import Ledger
from jarvis_core.missions import MissionManager
from jarvis_core.roles import RoleConfig
from jarvis_core.telegram import TelegramBridge

from test_phase4 import FakeResearchOdysseus, ROLES


def make_stack(tmp_path, odysseus=None, approval_timeout=2.0):
    settings = Settings(
        engine="mock", sandbox_root=tmp_path / "sandbox",
        ledger_path=tmp_path / "ledger.db", approval_timeout=approval_timeout,
        research_poll=0.02, research_timeout=10.0,
        telegram_bot_token="tok", telegram_chat_id="1234",
    )
    ledger = Ledger(settings.resolved_ledger_path())
    hub = EventHub(ledger)
    broker = ApprovalBroker(ledger, hub, timeout=approval_timeout)
    manager = MissionManager(settings, ledger, hub, broker, MockEngine(), ROLES,
                             odysseus or FakeResearchOdysseus())
    return settings, ledger, hub, broker, manager


class RecordingBridge(TelegramBridge):
    """TelegramBridge with the HTTP layer replaced by a recorder."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.calls: list[tuple[str, dict]] = []

    async def _call(self, method: str, **payload):
        self.calls.append((method, payload))
        return {"message_id": 1}

    def sent_texts(self):
        return [p.get("text", "") for m, p in self.calls if m == "sendMessage"]


def make_bridge(tmp_path, **stack_kwargs):
    settings, ledger, hub, broker, manager = make_stack(tmp_path, **stack_kwargs)
    bridge = RecordingBridge(settings, ledger, hub, broker, manager)
    return bridge, ledger, hub, broker, manager


def run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


# ── E1: bridge no-ops when unconfigured ──────────────────────────────────────

def test_bridge_disabled_without_config(tmp_path):
    settings, ledger, hub, broker, manager = make_stack(tmp_path)
    settings.telegram_bot_token = ""
    bridge = TelegramBridge(settings, ledger, hub, broker, manager)
    assert bridge.enabled is False
    bridge.start()           # must not raise nor create tasks
    assert bridge._tasks == []


# ── E2: /mission from authorized chat only ───────────────────────────────────

def msg_update(text, chat_id="1234"):
    return {"update_id": 1, "message": {"chat": {"id": chat_id}, "text": text}}


def test_mission_command_creates_mission(tmp_path):
    bridge, ledger, *_ = make_bridge(tmp_path)
    run(bridge._handle_update(msg_update("/mission research the market")))
    missions = ledger.list_missions()
    assert len(missions) == 1
    assert missions[0]["mode"] == "mission"
    assert "research the market" in missions[0]["prompt"]
    assert any("launched" in t for t in bridge.sent_texts())


def test_unauthorized_chat_ignored(tmp_path):
    bridge, ledger, *_ = make_bridge(tmp_path)
    run(bridge._handle_update(msg_update("/mission do something", chat_id="9999")))
    run(bridge._handle_update(msg_update("plain text too", chat_id="9999")))
    assert ledger.list_missions() == []
    assert bridge.calls == []


# ── E3: approval event -> buttons; callback resolves broker ──────────────────

def test_approval_roundtrip_via_telegram(tmp_path):
    bridge, ledger, hub, broker, manager = make_bridge(tmp_path)

    mission = ledger.create_mission("p", "mission", "t")
    results = {}

    def request_approval():
        results["decision"] = broker.request(
            mission_id=mission["id"], agent_id="prime", tier=2,
            action="execute mission plan", description="the plan")

    import threading
    worker = threading.Thread(target=request_approval)
    worker.start()
    approval = wait_for(lambda: next(iter(ledger.list_approvals("pending")), None))

    # outbound: approval.requested event becomes a buttons message
    run(bridge._handle_event({
        "type": "approval.requested", "mission_id": mission["id"],
        "payload": {"approval_id": approval["id"], "tier": 2,
                    "action": "execute mission plan", "description": "the plan"},
    }))
    method, payload = bridge.calls[-1]
    assert method == "sendMessage"
    buttons = payload["reply_markup"]["inline_keyboard"][0]
    assert buttons[0]["callback_data"] == f"apv:{approval['id']}:approve"

    # inbound: approve button press resolves the broker
    run(bridge._handle_update({"update_id": 2, "callback_query": {
        "id": "cb1", "data": f"apv:{approval['id']}:approve",
        "message": {"chat": {"id": "1234"}, "message_id": 7, "text": "orig"},
    }}))
    worker.join(timeout=3)
    assert results["decision"] == "approve"
    assert ledger.get_approval(approval["id"])["status"] == "approved"
    assert ledger.get_approval(approval["id"])["resolved_by"] == "telegram"


def test_deny_callback(tmp_path):
    bridge, ledger, hub, broker, manager = make_bridge(tmp_path)
    mission = ledger.create_mission("p", "mission", "t")
    import threading
    decisions = {}
    worker = threading.Thread(target=lambda: decisions.update(
        d=broker.request(mission_id=mission["id"], agent_id="prime", tier=2,
                         action="x", description="y")))
    worker.start()
    approval = wait_for(lambda: next(iter(ledger.list_approvals("pending")), None))
    run(bridge._handle_update({"update_id": 3, "callback_query": {
        "id": "cb2", "data": f"apv:{approval['id']}:deny",
        "message": {"chat": {"id": "1234"}, "message_id": 8, "text": "orig"},
    }}))
    worker.join(timeout=3)
    assert decisions["d"] == "deny"


# ── E4: plain text runs a chat turn, reply sent back ─────────────────────────

def test_plain_text_chat_roundtrip(tmp_path):
    bridge, ledger, hub, broker, manager = make_bridge(tmp_path)
    run(bridge._handle_update(msg_update("say hello")))
    mission = wait_for(lambda: next(iter(ledger.list_missions()), None))
    assert mission["mode"] == "chat"
    assert mission["id"] in bridge._pending_chats

    wait_for(lambda: ledger.get_mission(mission["id"])["status"] == "completed")
    # outbound loop would consume this event; simulate delivery
    run(bridge._handle_event({
        "type": "assistant.message", "mission_id": mission["id"],
        "payload": {"text": "All done, commander.", "final": True},
    }))
    assert "All done, commander." in bridge.sent_texts()
    assert mission["id"] not in bridge._pending_chats

    # mission.completed for the chat must NOT double-send
    before = len(bridge.sent_texts())
    run(bridge._handle_event({
        "type": "mission.completed", "mission_id": mission["id"],
        "payload": {"result_summary": "All done, commander."},
    }))
    assert len(bridge.sent_texts()) == before


# ── E5: running mission cancel skips later stages ────────────────────────────

def test_cancel_running_mission_skips_stages(tmp_path):
    settings, ledger, hub, broker, manager = make_stack(tmp_path)
    mission = manager.create("slow research in parallel", mode="mission",
                             auto_approve_max_tier=None)
    approval = wait_for(lambda: next(
        (a for a in ledger.list_approvals("pending")
         if a["action"] == "execute mission plan"), None))
    broker.resolve(approval["id"], "approve")
    wait_for(lambda: ledger.get_mission(mission["id"])["status"] == "running")

    outcome = manager.cancel(mission["id"])
    assert outcome == {"cancelled": False, "pending": True}

    final = wait_for(lambda: (m := ledger.get_mission(mission["id"]))
                     and m["status"] in ("cancelled", "completed") and m, timeout=10)
    assert final["status"] == "cancelled"
    statuses = {a["agent_id"]: a["status"]
                for a in ledger.list_agent_runs(mission["id"])}
    assert statuses.get("writer-1") == "skipped"


# ── E6: research cancel propagates to Odysseus ───────────────────────────────

def test_cancel_research_mission(tmp_path):
    ody = FakeResearchOdysseus(polls_until_done=10_000)
    ody.cancelled = []
    ody.cancel_research = lambda sid: ody.cancelled.append(sid) or True

    settings, ledger, hub, broker, manager = make_stack(tmp_path, odysseus=ody)
    mission = manager.create("endless research", mode="research")
    wait_for(lambda: ody.polls > 0)

    outcome = manager.cancel(mission["id"])
    assert outcome["pending"] is True
    assert ody.cancelled == ["rp-test"]
    final = wait_for(lambda: (m := ledger.get_mission(mission["id"]))
                     and m["status"] == "cancelled" and m, timeout=5)
    assert final["status"] == "cancelled"


# ── E7: awaiting-approval cancel unblocks immediately ────────────────────────

def test_cancel_while_awaiting_approval(tmp_path):
    settings, ledger, hub, broker, manager = make_stack(tmp_path,
                                                        approval_timeout=30.0)
    mission = manager.create("research something", mode="mission")
    approval = wait_for(lambda: next(
        (a for a in ledger.list_approvals("pending")
         if a["action"] == "execute mission plan"), None))

    outcome = manager.cancel(mission["id"])
    assert outcome["pending"] is True
    # resolves well before the 30s approval timeout
    final = wait_for(lambda: (m := ledger.get_mission(mission["id"]))
                     and m["status"] == "cancelled" and m, timeout=5)
    assert final["status"] == "cancelled"
    assert ledger.get_approval(approval["id"])["resolved_by"] == "cancel"
