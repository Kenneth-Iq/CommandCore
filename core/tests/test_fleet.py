from datetime import datetime

from conftest import wait_for, wait_for_status


def create_mission(client, prompt):
    res = client.post("/missions", json={"prompt": prompt, "mode": "mission"})
    assert res.status_code == 201
    return res.json()["mission"]


def pending_plan_approval(client):
    return wait_for(lambda: next(
        (a for a in client.get("/approvals", params={"status": "pending"}).json()["approvals"]
         if a["action"] == "execute mission plan"), None))


def events_of(client, mission_id):
    return client.get(f"/missions/{mission_id}/events").json()["events"]


def ts(value):
    return datetime.fromisoformat(value)


# ── B1: full fleet lifecycle ──────────────────────────────────────────────────

def test_fleet_lifecycle(client):
    mission = create_mission(client, "research the smart home market")

    approval = pending_plan_approval(client)
    state = client.get(f"/missions/{mission['id']}").json()["mission"]
    assert state["status"] == "awaiting_approval"
    assert state["plan"] and len(state["plan"]["stages"]) == 2

    types = [e["type"] for e in events_of(client, mission["id"])]
    assert "plan.proposed" in types

    client.post(f"/approvals/{approval['id']}/resolve", json={"decision": "approve"})
    final = wait_for_status(client, mission["id"], "completed")
    assert final["result_summary"].startswith("SITREP")

    events = events_of(client, mission["id"])
    spawned = {e["agent_id"] for e in events if e["type"] == "agent.spawned"}
    assert spawned == {"researcher-1", "analyst-1", "writer-1"}
    types = [e["type"] for e in events]
    assert "sitrep" in types
    assert types[-1] == "mission.completed"

    agents = client.get(f"/missions/{mission['id']}/agents").json()["agents"]
    assert [a["status"] for a in agents] == ["done", "done", "done"]


# ── B2: plan denial cancels, nothing executes ────────────────────────────────

def test_plan_deny_cancels(client):
    mission = create_mission(client, "research something sensitive")
    approval = pending_plan_approval(client)
    client.post(f"/approvals/{approval['id']}/resolve", json={"decision": "deny"})
    wait_for_status(client, mission["id"], "cancelled")

    assert client.get(f"/missions/{mission['id']}/agents").json()["agents"] == []
    assert not any(e["type"] == "agent.spawned"
                   for e in events_of(client, mission["id"]))


def test_plan_approval_timeout_cancels(client_fast_timeout):
    client = client_fast_timeout
    mission = create_mission(client, "research with an absent commander")
    wait_for_status(client, mission["id"], "cancelled")
    approval = client.get("/approvals").json()["approvals"][0]
    assert approval["status"] == "expired"


# ── B3: stage tasks run in parallel, stages run in order ─────────────────────

def test_stage_parallelism(client):
    mission = create_mission(client, "research the market in parallel")
    approval = pending_plan_approval(client)
    client.post(f"/approvals/{approval['id']}/resolve", json={"decision": "approve"})
    wait_for_status(client, mission["id"], "completed")

    agents = {a["agent_id"]: a
              for a in client.get(f"/missions/{mission['id']}/agents").json()["agents"]}
    res, ana, wri = agents["researcher-1"], agents["analyst-1"], agents["writer-1"]

    # researcher and analyst overlap (each sleeps 0.3s in the mock engine)
    assert ts(res["started_at"]) < ts(ana["finished_at"])
    assert ts(ana["started_at"]) < ts(res["finished_at"])
    # writer (stage 2) starts only after both stage-1 tasks finished
    assert ts(wri["started_at"]) >= ts(res["finished_at"])
    assert ts(wri["started_at"]) >= ts(ana["finished_at"])


# ── B4: role ceiling auto-denies destructive actions ─────────────────────────

def test_role_ceiling_denies(client):
    # "delete" propagates into fleet instructions; the mock engine then asks
    # the gate for a tier-3 Remove-Item, which tier-1 roles must not get.
    mission = create_mission(client, "research how to delete old records")
    approval = pending_plan_approval(client)
    client.post(f"/approvals/{approval['id']}/resolve", json={"decision": "approve"})
    wait_for_status(client, mission["id"], "completed")

    actions = client.get("/actions").json()["actions"]
    ceiling_denials = [a for a in actions
                       if a["mission_id"] == mission["id"]
                       and a["confirmed_by"] == "ceiling"]
    assert ceiling_denials, "expected at least one ceiling denial"
    # the only broker approval was the plan itself — ceilings never reach the commander
    approvals = client.get("/approvals").json()["approvals"]
    assert [a["action"] for a in approvals] == ["execute mission plan"]


# ── B5: malformed plan falls back to prime-only ──────────────────────────────

def test_badplan_falls_back(client):
    mission = create_mission(client, "badplan do something anyway")
    approval = pending_plan_approval(client)

    state = client.get(f"/missions/{mission['id']}").json()["mission"]
    assert state["plan"] == {"stages": [[{
        "role": "prime", "instruction": "badplan do something anyway"}]]}
    events = events_of(client, mission["id"])
    proposed = next(e for e in events if e["type"] == "plan.proposed")
    assert proposed["payload"]["fallback"] is True

    client.post(f"/approvals/{approval['id']}/resolve", json={"decision": "approve"})
    wait_for_status(client, mission["id"], "completed")
    agents = client.get(f"/missions/{mission['id']}/agents").json()["agents"]
    assert [a["role"] for a in agents] == ["prime"]


# ── task failure: later stages skipped, partial findings reported ────────────

def test_task_failure_skips_later_stages(client):
    mission = create_mission(client, "taskfail this research")
    approval = pending_plan_approval(client)
    client.post(f"/approvals/{approval['id']}/resolve", json={"decision": "approve"})
    final = wait_for_status(client, mission["id"], "failed")
    assert "failed" in final["result_summary"]

    agents = {a["agent_id"]: a["status"]
              for a in client.get(f"/missions/{mission['id']}/agents").json()["agents"]}
    assert agents["researcher-1"] == "failed"
    assert agents["analyst-1"] == "failed"
    assert agents["writer-1"] == "skipped"

    events = events_of(client, mission["id"])
    assert events[-1]["type"] == "mission.failed"
    assert "partial_findings" in events[-1]["payload"]
