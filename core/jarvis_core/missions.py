from __future__ import annotations

import json
import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from . import planner
from .approvals import ApprovalBroker
from .config import Settings
from .engine.base import Engine, EngineResult
from .events import EventHub
from .ledger import Ledger
from .odysseus import OdysseusClient
from .roles import RoleConfig
from .tiers import classify

logger = logging.getLogger(__name__)

FLEET_PARALLELISM = 3

# Cap on the stored sitrep / research report. Was 500 — far too small, it chopped
# every mission result mid-sentence. result_summary is SQLite TEXT (no real
# limit); this is just a sane bound on the event payload.
RESULT_SUMMARY_LIMIT = 8000

CANCELLABLE_STATUSES = ("planning", "awaiting_approval", "running")


class _Cancelled(Exception):
    """Raised inside a mission thread when a cancel was requested; caught in
    _run, which marks the mission cancelled."""


class MissionManager:
    """Owns the mission lifecycle.

    mode=chat    -> direct Prime run (Phase 1 behavior, unchanged)
    mode=mission -> plan -> commander approval -> staged fleet -> sitrep
                    (PHASE-2.md §4)

    One mission executes at a time; fleet tasks within a stage run in
    parallel on their own pool.
    """

    def __init__(self, settings: Settings, ledger: Ledger, hub: EventHub,
                 broker: ApprovalBroker, engine: Engine, roles: dict[str, RoleConfig],
                 odysseus: OdysseusClient | None = None):
        self.settings = settings
        self.ledger = ledger
        self.hub = hub
        self.broker = broker
        self.engine = engine
        self.roles = roles
        self.odysseus = odysseus or OdysseusClient(settings.odysseus_base_url,
                                                    settings.odysseus_api_token)
        self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="mission")
        self._fleet = ThreadPoolExecutor(max_workers=FLEET_PARALLELISM,
                                         thread_name_prefix="fleet")
        self._cancel_requested: set[str] = set()
        self._cancel_lock = threading.Lock()
        # research missions register their Odysseus session here so cancel can
        # propagate to the remote job (mission_id -> session_id)
        self._research_sessions: dict[str, str] = {}

    def shutdown(self) -> None:
        self._executor.shutdown(wait=False, cancel_futures=True)
        self._fleet.shutdown(wait=False, cancel_futures=True)

    # ── API surface ──────────────────────────────────────────────────────────

    def create(self, prompt: str, mode: str = "chat", title: str | None = None,
               auto_approve_max_tier: int | None = None) -> dict:
        title = title or (prompt[:57] + "…" if len(prompt) > 60 else prompt)
        artifacts_dir = None
        if mode == "mission":
            artifacts_dir = str(self.settings.sandbox_root / "missions")
        mission = self.ledger.create_mission(prompt, mode, title, artifacts_dir)
        if mode == "mission":
            per_mission = Path(mission["artifacts_dir"]) / mission["id"]
            per_mission.mkdir(parents=True, exist_ok=True)
            self.ledger.update_mission(mission["id"], artifacts_dir=str(per_mission))
        self.hub.emit("mission.created",
                      {"title": title, "prompt": prompt, "mode": mode},
                      mission["id"])
        self._executor.submit(self._run, mission["id"], auto_approve_max_tier)
        return self.ledger.get_mission(mission["id"])

    def cancel(self, mission_id: str) -> dict:
        """Queued missions stop immediately. Running ones are flagged and
        stop at the next safe point (PHASE-5.md §3): before planning, on
        approval resolution, between fleet stages, or per research poll.
        A running engine turn still finishes — interrupting inside a Hermes
        loop stays out of scope. Returns {"cancelled": bool, "pending": bool}.
        """
        mission = self.ledger.get_mission(mission_id)
        if mission is None:
            return {"cancelled": False, "pending": False}
        if mission["status"] == "queued":
            self._set_status(mission_id, "cancelled")
            return {"cancelled": True, "pending": False}
        if mission["status"] not in CANCELLABLE_STATUSES:
            return {"cancelled": False, "pending": False}
        with self._cancel_lock:
            self._cancel_requested.add(mission_id)
        # unblock a thread parked on the plan approval
        for approval in self.ledger.list_approvals("pending"):
            if approval["mission_id"] == mission_id:
                self.broker.resolve(approval["id"], "deny", resolved_by="cancel")
        # propagate to a remote research job (best-effort)
        session_id = self._research_sessions.get(mission_id)
        if session_id:
            self.odysseus.cancel_research(session_id)
        return {"cancelled": False, "pending": True}

    def _check_cancelled(self, mission_id: str) -> None:
        with self._cancel_lock:
            if mission_id in self._cancel_requested:
                raise _Cancelled()

    # ── shared helpers ───────────────────────────────────────────────────────

    def _set_status(self, mission_id: str, status: str) -> None:
        self.ledger.update_mission(mission_id, status=status)
        self.hub.emit("mission.status", {"status": status}, mission_id)

    def _make_emit(self, mission: dict, agent_id: str):
        def emit(type_: str, payload: dict, agent: str = agent_id) -> None:
            self.hub.emit(type_, payload, mission["id"], agent)
            if type_ == "tool.result":
                self.ledger.insert_action(
                    mission_id=mission["id"], agent_id=agent,
                    intent=mission["mode"], action_type=payload.get("tool", "tool"),
                    target=None, payload_summary=payload.get("result_preview"),
                    confirmed_by="auto", result="ok" if payload.get("ok") else "error",
                )
        return emit

    def _make_gate(self, mission: dict, role: RoleConfig, agent_id: str):
        def approval_gate(command: str, description: str = "", **_kw) -> str:
            tier, action = classify(command, self.settings.sandbox_root)
            if tier > role.max_tier:
                self.ledger.insert_action(
                    mission_id=mission["id"], agent_id=agent_id, intent=mission["mode"],
                    action_type=action, target=None, payload_summary=command[:200],
                    confirmed_by="ceiling", result="denied (above role ceiling)",
                )
                return "deny"
            if tier <= 1:
                self.ledger.insert_action(
                    mission_id=mission["id"], agent_id=agent_id, intent=mission["mode"],
                    action_type=action, target=None, payload_summary=command[:200],
                    confirmed_by="auto", result="approved",
                )
                return "approve"
            decision = self.broker.request(
                mission_id=mission["id"], agent_id=agent_id, tier=tier,
                action=action, description=description or command,
            )
            self.ledger.insert_action(
                mission_id=mission["id"], agent_id=agent_id, intent=mission["mode"],
                action_type=action, target=None, payload_summary=command[:200],
                confirmed_by="user" if decision == "approve" else "user-denied",
                result=decision,
            )
            return decision
        return approval_gate

    # ── mission thread ───────────────────────────────────────────────────────

    def _run(self, mission_id: str, auto_approve_max_tier: int | None = None) -> None:
        mission = self.ledger.get_mission(mission_id)
        if mission is None or mission["status"] != "queued":
            return  # cancelled while waiting in the queue
        try:
            if mission["mode"] == "mission":
                self._run_mission(mission, auto_approve_max_tier)
            elif mission["mode"] == "research":
                self._run_research(mission)
            else:
                self._run_chat(mission)
        except _Cancelled:
            self._set_status(mission_id, "cancelled")
        except Exception as exc:  # never let an engine crash take down core
            logger.exception("Mission %s failed", mission_id)
            self.ledger.update_mission(mission_id, status="failed",
                                       result_summary=str(exc)[:500])
            self.hub.emit("mission.failed", {"error": str(exc)[:500]}, mission_id)
        finally:
            with self._cancel_lock:
                self._cancel_requested.discard(mission_id)
            self._research_sessions.pop(mission_id, None)

    def _run_research(self, mission: dict) -> None:
        """mode=research — Odysseus's deep-research engine does the work;
        Core streams progress and lands the report as the sitrep
        (PHASE-4.md §2). No plan/approval step: research is read-only and
        runs at the researcher ceiling."""
        import time as _time

        mid = mission["id"]
        agent = "researcher-1"
        if not self.odysseus.enabled:
            self.ledger.update_mission(mid, status="failed",
                                       result_summary="Odysseus is not configured")
            self.hub.emit("mission.failed",
                          {"error": "Odysseus is not configured (research mode "
                                    "requires ODYSSEUS_BASE_URL + ODYSSEUS_API_TOKEN)"}, mid)
            return

        self._set_status(mid, "running")
        self.hub.emit("agent.spawned", {"role": "researcher", "model": "odysseus-research"},
                      mid, agent)
        session_id = self.odysseus.start_research(mission["prompt"])
        if session_id:
            self._research_sessions[mid] = session_id
            self.hub.emit("research.progress",
                          {"phase": "started", "detail": {"session_id": session_id}},
                          mid, agent)
        if session_id is None:
            error = ("Odysseus rejected the research request — is an LLM endpoint "
                     "configured in its Settings?")
            self.ledger.update_mission(mid, status="failed", result_summary=error)
            self.hub.emit("mission.failed", {"error": error}, mid)
            return

        deadline = _time.monotonic() + self.settings.research_timeout
        last_progress = None
        while _time.monotonic() < deadline:
            self._check_cancelled(mid)
            status = self.odysseus.research_status(session_id)
            if status is None:
                error = "Lost contact with Odysseus mid-research"
                self.ledger.update_mission(mid, status="failed", result_summary=error)
                self.hub.emit("mission.failed", {"error": error}, mid)
                return
            progress = status.get("progress") or {}
            if progress != last_progress:
                last_progress = progress
                self.hub.emit("research.progress",
                              {"phase": status.get("status", ""), "detail": progress},
                              mid, agent)
            # Odysseus's terminal statuses are "done"/"error"/"cancelled"
            # (research_handler.py); accept "completed" too for safety.
            state = status.get("status", "")
            if state in ("done", "completed"):
                report = self.odysseus.research_result(session_id) or \
                    "(research completed but the report could not be retrieved)"
                self.hub.emit("sitrep", {"text": report}, mid, "prime")
                self.odysseus.add_memory(
                    f"Research: {mission['prompt']}\n\n{report}", category="fact")
                summary = report[:RESULT_SUMMARY_LIMIT]
                self.ledger.update_mission(mid, status="completed",
                                           result_summary=summary)
                self.hub.emit("mission.completed", {
                    "result_summary": summary,
                    "artifacts_dir": mission.get("artifacts_dir"),
                }, mid)
                return
            if state in ("failed", "cancelled", "error"):
                error = f"Research {state}: {status.get('error') or 'no detail'}"
                self.ledger.update_mission(mid, status="failed", result_summary=error)
                self.hub.emit("mission.failed", {"error": error}, mid)
                return
            _time.sleep(self.settings.research_poll)

        error = f"Research timed out after {int(self.settings.research_timeout)}s"
        self.ledger.update_mission(mid, status="failed", result_summary=error)
        self.hub.emit("mission.failed", {"error": error}, mid)

    def _run_chat(self, mission: dict) -> None:
        role = self.roles["prime"]
        self._set_status(mission["id"], "running")
        result: EngineResult = self.engine.run(
            mission=mission, role=role,
            emit=self._make_emit(mission, "prime"),
            approval_gate=self._make_gate(mission, role, "prime"))
        self._finish(mission, result)

    def _run_mission(self, mission: dict, auto_approve_max_tier: int | None = None) -> None:
        mid = mission["id"]

        # 0 — recall relevant shared memory (PHASE-3.md §1.1)
        memory_block = ""
        if self.odysseus.enabled:
            items = self.odysseus.search_memory(mission["prompt"])
            if items:
                memory_block = (
                    "\n\n---\nBACKGROUND from earlier missions — use ONLY if "
                    "directly relevant to THIS mission; otherwise ignore it "
                    "entirely and do not mention it:\n"
                    + "\n".join(f"- {item[:400]}" for item in items))
                self.hub.emit("memory.recalled", {"items": items}, mid, "prime")

        # 1 — plan (mission first; recalled memory is subordinate background)
        self._check_cancelled(mid)
        self._set_status(mid, "planning")
        plan_input = f"{mission['prompt']}{memory_block}" if memory_block else mission["prompt"]
        plan, used_fallback = planner.generate_plan(self.engine, self.roles, plan_input)
        self.ledger.update_mission(mid, plan_json=json.dumps(plan))

        # 2 — commander approval (reuses the standard broker/dialog flow),
        # unless every task's role is within the auto-approval ceiling
        # (scheduled/unattended missions — PHASE-3.md §2.3).
        auto_approved = (
            auto_approve_max_tier is not None
            and all(self.roles[task["role"]].max_tier <= auto_approve_max_tier
                    for stage in plan["stages"] for task in stage)
        )
        self.hub.emit("plan.proposed",
                      {"plan": plan, "fallback": used_fallback,
                       "approval_required": not auto_approved,
                       "auto_approved": auto_approved}, mid, "prime")
        if auto_approved:
            self.ledger.insert_action(
                mission_id=mid, agent_id="prime", intent=mission["mode"],
                action_type="execute mission plan", target=None,
                payload_summary=planner.summarize_plan(plan)[:200],
                confirmed_by="auto", result="approved",
            )
        else:
            self._set_status(mid, "awaiting_approval")
            decision = self.broker.request(
                mission_id=mid, agent_id="prime", tier=2,
                action="execute mission plan",
                description=planner.summarize_plan(plan))
            self._check_cancelled(mid)
            if decision != "approve":
                self._set_status(mid, "cancelled")
                return

        # 3 — staged fleet execution
        self._set_status(mid, "running")
        ordinals: dict[str, int] = {}
        stage_runs: list[list[dict]] = []
        for stage in plan["stages"]:
            runs = []
            for task in stage:
                ordinals[task["role"]] = ordinals.get(task["role"], 0) + 1
                agent_id = f"{task['role']}-{ordinals[task['role']]}"
                runs.append(self.ledger.create_agent_run(
                    mission_id=mid, agent_id=agent_id,
                    role=task["role"], instruction=task["instruction"]))
            stage_runs.append(runs)

        completed: list[dict] = []
        for stage_index, runs in enumerate(stage_runs):
            try:
                self._check_cancelled(mid)
            except _Cancelled:
                for later in stage_runs[stage_index:]:
                    for run in later:
                        self.ledger.update_agent_run(run["id"], status="skipped")
                raise
            context = planner.findings_block(completed)
            if memory_block:
                context = f"{context}{memory_block}" if context else memory_block
            futures = [
                self._fleet.submit(self._run_task, mission, run, context)
                for run in runs
            ]
            results = [f.result() for f in futures]
            completed.extend(results)
            if any(r["status"] == "failed" for r in results):
                for later in stage_runs[stage_index + 1:]:
                    for run in later:
                        self.ledger.update_agent_run(run["id"], status="skipped")
                failed = [r for r in results if r["status"] == "failed"]
                error = "; ".join(
                    f"{r['agent_id']} failed: {r.get('result_summary') or 'unknown'}"
                    for r in failed)[:400]
                partial = planner.findings_block(completed)[:400]
                self.ledger.update_mission(mid, status="failed",
                                           result_summary=error)
                self.hub.emit("mission.failed",
                              {"error": error, "partial_findings": partial}, mid)
                return

        # 4 — sitrep synthesis
        try:
            sitrep = self.engine.complete(
                role=self.roles["prime"],
                prompt=planner.build_sitrep_prompt(mission["prompt"], completed))
        except Exception as exc:
            logger.warning("Sitrep synthesis failed: %s", exc)
            sitrep = "Sitrep synthesis unavailable — raw findings:\n" + \
                     planner.findings_block(completed)[:1500]
        self.hub.emit("sitrep", {"text": sitrep}, mid, "prime")
        if self.odysseus.enabled:
            self.odysseus.add_memory(
                f"Mission: {mission['prompt']}\n\n{sitrep}", category="fact")
        summary = sitrep[:RESULT_SUMMARY_LIMIT]
        self.ledger.update_mission(mid, status="completed", result_summary=summary)
        self.hub.emit("mission.completed", {
            "result_summary": summary,
            "artifacts_dir": mission.get("artifacts_dir"),
        }, mid)

    def _run_task(self, mission: dict, run: dict, context: str) -> dict:
        """Executes one fleet task on the fleet pool. Returns the final
        agent_run row (never raises — failures are captured in the row)."""
        role = self.roles[run["role"]]
        agent_id = run["agent_id"]
        instruction = run["instruction"]
        if context:
            instruction += f"\n\nFindings so far:\n{context}"

        self.ledger.update_agent_run(run["id"], status="running")
        task_mission = {**mission, "prompt": instruction}
        emit = self._make_emit(mission, agent_id)
        try:
            result = self.engine.run(
                mission=task_mission, role=role, emit=emit,
                approval_gate=self._make_gate(mission, role, agent_id))
            if result.ok:
                self.ledger.update_agent_run(run["id"], status="done",
                                             result_summary=result.final_text)
                emit("agent.status", {"state": "done", "detail": ""})
            else:
                self.ledger.update_agent_run(run["id"], status="failed",
                                             result_summary=result.error)
                emit("agent.status", {"state": "failed",
                                      "detail": result.error or ""})
        except Exception as exc:
            logger.exception("Task %s failed", agent_id)
            self.ledger.update_agent_run(run["id"], status="failed",
                                         result_summary=str(exc)[:500])
            emit("agent.status", {"state": "failed", "detail": str(exc)[:200]})
        return self.ledger.get_agent_run(run["id"])

    def _finish(self, mission: dict, result: EngineResult) -> None:
        mid = mission["id"]
        if result.ok:
            summary = (result.final_text or "")[:500]
            self.ledger.update_mission(mid, status="completed",
                                       result_summary=summary)
            self.hub.emit("mission.completed", {
                "result_summary": summary,
                "artifacts_dir": mission.get("artifacts_dir"),
            }, mid)
        else:
            self.ledger.update_mission(mid, status="failed",
                                       result_summary=result.error or "unknown error")
            self.hub.emit("mission.failed",
                          {"error": result.error or "unknown error"}, mid)
