"""Live end-to-end check against a running Core (PHASE-0-1.md P1.6).

Drives the §0 demo flow over real HTTP + WebSocket:
  1. chat mission completes and streams events
  2. "delete" mission raises a tier-3 approval; approve it; mission completes
  3. audit actions carry mission lineage

Usage:  python scripts\\e2e_demo.py  (Core must be running, any engine;
        assertions about exact text apply to the mock engine only)
"""
from __future__ import annotations

import asyncio
import json
import sys
import time
import urllib.request

BASE = "http://127.0.0.1:8765"
WS = "ws://127.0.0.1:8765/ws/events"


def rest(method: str, path: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as res:
        return json.loads(res.read())


def wait_for(predicate, timeout=15.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        value = predicate()
        if value:
            return value
        time.sleep(0.05)
    raise TimeoutError("condition not met")


async def main() -> int:
    import websockets

    health = rest("GET", "/health")
    print(f"health: {health}")

    async with websockets.connect(WS) as ws:
        hello = json.loads(await ws.recv())
        assert hello["type"] == "core.status", hello
        print(f"ws connected: engine={hello['payload']['engine']}")

        # 1 — plain chat mission
        mission = rest("POST", "/missions", {"prompt": "say hello", "mode": "chat"})["mission"]
        seen = []
        while True:
            event = json.loads(await asyncio.wait_for(ws.recv(), timeout=15))
            if event["mission_id"] != mission["id"]:
                continue
            seen.append(event["type"])
            if event["type"] in ("mission.completed", "mission.failed"):
                break
        assert seen[-1] == "mission.completed", seen
        assert "assistant.message" in seen
        print(f"chat mission ok — {len(seen)} events: {seen}")

        # 2 — approval flow
        mission2 = rest("POST", "/missions", {"prompt": "delete the hello file"})["mission"]
        approval = wait_for(lambda: next(iter(
            rest("GET", "/approvals?status=pending")["approvals"]), None))
        print(f"approval pending: tier={approval['tier']} action={approval['action']}")
        rest("POST", f"/approvals/{approval['id']}/resolve", {"decision": "approve"})
        final = wait_for(lambda: (m := rest("GET", f"/missions/{mission2['id']}")["mission"])
                         and m["status"] in ("completed", "failed") and m)
        assert final["status"] == "completed", final
        print(f"approval mission ok — status={final['status']}")

        # 3 — audit lineage
        actions = rest("GET", "/actions")["actions"]
        assert any(a["mission_id"] == mission2["id"] and a["confirmed_by"] == "user"
                   for a in actions), actions
        print(f"audit ok — {len(actions)} actions logged")

        # 4 — fleet mission (Phase 2): plan -> approve -> parallel agents -> sitrep
        mission3 = rest("POST", "/missions",
                        {"prompt": "research the local market and summarize",
                         "mode": "mission"})["mission"]
        plan_approval = wait_for(lambda: next(
            (a for a in rest("GET", "/approvals?status=pending")["approvals"]
             if a["action"] == "execute mission plan"), None))
        print(f"plan approval pending:\n{plan_approval['description']}")
        rest("POST", f"/approvals/{plan_approval['id']}/resolve", {"decision": "approve"})

        fleet_seen, sitrep_text = set(), None
        while True:
            event = json.loads(await asyncio.wait_for(ws.recv(), timeout=30))
            if event["mission_id"] != mission3["id"]:
                continue
            if event["type"] == "agent.spawned":
                fleet_seen.add(event["agent_id"])
            if event["type"] == "sitrep":
                sitrep_text = event["payload"]["text"]
            if event["type"] in ("mission.completed", "mission.failed"):
                assert event["type"] == "mission.completed", event
                break
        assert fleet_seen >= {"researcher-1", "analyst-1", "writer-1"}, fleet_seen
        assert sitrep_text, "no sitrep received"
        agents = rest("GET", f"/missions/{mission3['id']}/agents")["agents"]
        print(f"fleet mission ok — agents: {[(a['agent_id'], a['status']) for a in agents]}")
        print(f"sitrep: {sitrep_text[:100]}")

    print("\nE2E DEMO PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
