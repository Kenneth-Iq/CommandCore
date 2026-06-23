from conftest import wait_for, wait_for_status


def create_mission(client, prompt, mode="chat"):
    res = client.post("/missions", json={"prompt": prompt, "mode": mode})
    assert res.status_code == 201
    return res.json()["mission"]


def pending_approval(client):
    return wait_for(lambda: next(
        iter(client.get("/approvals", params={"status": "pending"}).json()["approvals"]),
        None))


# ── health ────────────────────────────────────────────────────────────────────

def test_health(client):
    body = client.get("/health").json()
    assert body == {"status": "ok", "engine": "mock", "version": "0.1.0"}


# ── mission lifecycle (A3) ────────────────────────────────────────────────────

def test_mission_lifecycle_events(client):
    mission = create_mission(client, "say hello")
    wait_for_status(client, mission["id"], "completed")

    events = client.get(f"/missions/{mission['id']}/events").json()["events"]
    types = [e["type"] for e in events]

    assert types[0] == "mission.created"
    assert types[-1] == "mission.completed"
    for expected in ("mission.status", "agent.spawned", "agent.status",
                     "tool.call", "tool.result", "assistant.delta",
                     "assistant.message"):
        assert expected in types, f"missing {expected}"
    assert types.index("assistant.message") < types.index("mission.completed")

    for e in events:
        assert e["v"] == 1
        assert e["mission_id"] == mission["id"]

    final = next(e for e in events if e["type"] == "assistant.message")
    assert final["payload"] == {"text": "All done, commander.", "final": True}


def test_mission_failed(client):
    mission = create_mission(client, "please fail")
    wait_for_status(client, mission["id"], "failed")
    events = client.get(f"/missions/{mission['id']}/events").json()["events"]
    assert events[-1]["type"] == "mission.failed"
    assert "mock engine failure" in events[-1]["payload"]["error"]


def test_mission_not_found(client):
    assert client.get("/missions/m_nope").status_code == 404


def test_mission_mode_artifacts(client):
    mission = create_mission(client, "do a research mission", mode="mission")
    assert mission["artifacts_dir"] and mission["id"] in mission["artifacts_dir"]


def test_cancel_queued_mission(client):
    # Occupy the single worker, then cancel the mission stuck behind it.
    slow = create_mission(client, "slow task")
    queued = create_mission(client, "second task")
    assert client.post(f"/missions/{queued['id']}/cancel").json()["cancelled"] is True
    wait_for_status(client, queued["id"], "cancelled")
    wait_for_status(client, slow["id"], "completed")
    # A completed mission cannot be cancelled (best-effort contract)
    assert client.post(f"/missions/{slow['id']}/cancel").json()["cancelled"] is False


# ── approvals (A4) ────────────────────────────────────────────────────────────

def test_approval_approve(client):
    mission = create_mission(client, "delete the hello file")
    approval = pending_approval(client)
    assert approval["tier"] == 3  # Remove-Item classifies as destructive

    res = client.post(f"/approvals/{approval['id']}/resolve",
                      json={"decision": "approve"})
    assert res.status_code == 200

    wait_for_status(client, mission["id"], "completed")
    events = client.get(f"/missions/{mission['id']}/events").json()["events"]
    types = [e["type"] for e in events]
    assert "approval.requested" in types and "approval.resolved" in types
    assert any(e["type"] == "tool.call" and e["payload"]["tool"] == "file.delete"
               for e in events)


def test_approval_deny(client):
    mission = create_mission(client, "delete the hello file")
    approval = pending_approval(client)
    client.post(f"/approvals/{approval['id']}/resolve", json={"decision": "deny"})

    wait_for_status(client, mission["id"], "completed")
    final = client.get(f"/missions/{mission['id']}").json()["mission"]
    assert "not approved" in final["result_summary"]
    events = client.get(f"/missions/{mission['id']}/events").json()["events"]
    assert not any(e["type"] == "tool.call" and e["payload"]["tool"] == "file.delete"
                   for e in events)
    assert client.get("/approvals").json()["approvals"][0]["status"] == "denied"


def test_approval_timeout_denies(client_fast_timeout):
    client = client_fast_timeout
    mission = create_mission(client, "delete the hello file")
    wait_for_status(client, mission["id"], "completed", timeout=5.0)
    approval = client.get("/approvals").json()["approvals"][0]
    assert approval["status"] == "expired"
    final = client.get(f"/missions/{mission['id']}").json()["mission"]
    assert "not approved" in final["result_summary"]


def test_approval_double_resolve_conflicts(client):
    create_mission(client, "delete the hello file")
    approval = pending_approval(client)
    assert client.post(f"/approvals/{approval['id']}/resolve",
                       json={"decision": "approve"}).status_code == 200
    assert client.post(f"/approvals/{approval['id']}/resolve",
                       json={"decision": "deny"}).status_code == 409


# ── audit log (A5) ────────────────────────────────────────────────────────────

def test_actions_audit_lineage(client):
    mission = create_mission(client, "delete the hello file")
    approval = pending_approval(client)
    client.post(f"/approvals/{approval['id']}/resolve", json={"decision": "approve"})
    wait_for_status(client, mission["id"], "completed")

    actions = client.get("/actions").json()["actions"]
    assert actions, "audit log is empty"
    assert all(a["mission_id"] == mission["id"] for a in actions)
    assert any(a["confirmed_by"] == "user" for a in actions)   # the gated delete
    assert any(a["confirmed_by"] == "auto" for a in actions)   # tier-1 tool results


# ── event replay (A6) ─────────────────────────────────────────────────────────

def test_event_replay_after(client):
    mission = create_mission(client, "say hello")
    wait_for_status(client, mission["id"], "completed")
    events = client.get(f"/missions/{mission['id']}/events").json()["events"]
    cutoff = events[2]["id"]
    later = client.get(f"/missions/{mission['id']}/events",
                       params={"after": cutoff}).json()["events"]
    assert [e["id"] for e in later] == [e["id"] for e in events[3:]]


# ── websocket stream (A3/A6) ──────────────────────────────────────────────────

def test_ws_stream(client):
    with client.websocket_connect("/ws/events") as ws:
        hello = ws.receive_json()
        assert hello["type"] == "core.status"
        assert hello["payload"]["state"] == "ready"

        mission = create_mission(client, "say hello")
        seen = []
        for _ in range(50):
            event = ws.receive_json()
            if event["mission_id"] != mission["id"]:
                continue
            seen.append(event["type"])
            if event["type"] == "mission.completed":
                break
        assert seen[0] == "mission.created"
        assert seen[-1] == "mission.completed"
        assert "assistant.message" in seen
