from __future__ import annotations

import json
import re
import time

from .base import EngineResult
from ..roles import RoleConfig

# Deterministic scripted engine for tests and keyless UI development.
# Behavior hooks (driven by the prompt text):
#   contains "delete"  -> raises a tier-3 approval via the gate
#   contains "fail"    -> raises, exercising the mission.failed path
#   contains "slow"    -> sleeps 0.5s so cancel/status tests have a window
#   contains "badplan" -> complete() returns non-JSON (planner fallback path)
#   contains "taskfail"-> fleet task failure (mission.failed with partial work)
# Fleet roles researcher/analyst sleep 0.3s so parallelism is observable in
# agent_runs timestamps.

_FLEET_SLEEP_ROLES = ("researcher", "analyst")
_MISSION_RE = re.compile(r"MISSION: (.*)", re.DOTALL)


class MockEngine:
    name = "mock"

    def complete(self, *, role: RoleConfig, prompt: str) -> str:
        mission_prompt = ""
        m = _MISSION_RE.search(prompt)
        if m:
            mission_prompt = m.group(1).strip()

        if "SITREP REQUEST" in prompt:
            return "SITREP: all objectives achieved. Findings consolidated, no blockers."

        # plan request
        if "badplan" in prompt:
            return "I would rather write prose than JSON today."
        return json.dumps({"stages": [
            [{"role": "researcher", "instruction": f"Gather sources on: {mission_prompt}"},
             {"role": "analyst", "instruction": f"Analyze the numbers behind: {mission_prompt}"}],
            [{"role": "writer", "instruction": f"Write the summary for: {mission_prompt}"}],
        ]})

    def run(self, *, mission: dict, role: RoleConfig, emit, approval_gate) -> EngineResult:
        prompt = mission["prompt"].lower()
        emit("agent.spawned", {"role": role.name, "model": "mock"})
        emit("agent.status", {"state": "thinking", "detail": "planning"})

        if "slow" in prompt:
            time.sleep(0.5)
        if "taskfail" in prompt and role.name in _FLEET_SLEEP_ROLES:
            raise RuntimeError("mock fleet task failure (requested by prompt)")
        if "fail" in prompt and "taskfail" not in prompt:
            raise RuntimeError("mock engine failure (requested by prompt)")
        if role.name in _FLEET_SLEEP_ROLES:
            time.sleep(0.3)  # makes stage parallelism observable in timestamps

        emit("tool.call", {"call_id": "t1", "tool": "file.write",
                           "args_preview": "notes/hello.md"})
        time.sleep(0.01)
        emit("tool.result", {"call_id": "t1", "tool": "file.write", "ok": True,
                             "result_preview": "wrote notes/hello.md"})

        if "delete" in prompt:
            emit("agent.status", {"state": "waiting_approval",
                                  "detail": "delete requires approval"})
            decision = approval_gate("Remove-Item notes/hello.md",
                                     "Delete notes/hello.md from the sandbox")
            if decision != "approve":
                text = "Understood — the deletion was not approved, so I left the file in place."
                emit("assistant.message", {"text": text, "final": True})
                return EngineResult(ok=True, final_text=text)
            emit("tool.call", {"call_id": "t2", "tool": "file.delete",
                               "args_preview": "notes/hello.md"})
            emit("tool.result", {"call_id": "t2", "tool": "file.delete", "ok": True,
                                 "result_preview": "deleted notes/hello.md"})

        for chunk in ("All ", "done, ", "commander."):
            emit("assistant.delta", {"text": chunk})
        text = (f"[{role.name}] task complete: {mission['prompt'][:80]}"
                if role.name != "prime" else "All done, commander.")
        emit("assistant.message", {"text": text, "final": True})
        return EngineResult(ok=True, final_text=text)
