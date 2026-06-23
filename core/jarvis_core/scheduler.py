"""In-process Sentinel scheduler (PHASE-3.md §2).

A background thread that ticks periodically, fires due schedules as
missions via MissionManager (with the auto-approval ceiling so unattended
runs don't hang on a commander who isn't watching), and pushes the result
to ntfy.
"""
from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timezone

import httpx
from croniter import croniter

from .config import Settings
from .ledger import Ledger
from .missions import MissionManager

logger = logging.getLogger(__name__)

TERMINAL_STATUSES = {"completed", "failed", "cancelled"}
POLL_INTERVAL = 5.0
POLL_TIMEOUT = 3600.0
SENTINEL_AUTO_APPROVE_TIER = 1


def next_run_after(cron_expr: str, after: datetime | None = None) -> str:
    after = after or datetime.now(timezone.utc)
    return croniter(cron_expr, after).get_next(datetime).astimezone(timezone.utc).isoformat()


class Scheduler:
    def __init__(self, settings: Settings, ledger: Ledger, manager: MissionManager):
        self.settings = settings
        self.ledger = ledger
        self.manager = manager
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        self._thread = threading.Thread(target=self._loop, name="scheduler", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=2.0)

    # ── tick loop ────────────────────────────────────────────────────────────

    def _loop(self) -> None:
        while not self._stop.is_set():
            try:
                self._tick()
            except Exception:
                logger.exception("Scheduler tick failed")
            self._stop.wait(self.settings.scheduler_tick)

    def _tick(self) -> None:
        now = datetime.now(timezone.utc)
        for sched in self.ledger.list_due_schedules(now.isoformat()):
            self._fire(sched, now)

    def _fire(self, sched: dict, now: datetime) -> None:
        try:
            next_run_at = next_run_after(sched["cron_expr"], now)
        except Exception:
            logger.exception("Bad cron expression for schedule %s", sched["id"])
            next_run_at = sched["next_run_at"]

        mission = self.manager.create(
            sched["prompt"], mode=sched["mode"],
            title=f"[Sentinel] {sched['name']}",
            auto_approve_max_tier=SENTINEL_AUTO_APPROVE_TIER,
        )
        self.ledger.update_schedule(
            sched["id"], next_run_at=next_run_at,
            last_run_at=now.isoformat(), last_mission_id=mission["id"],
        )
        threading.Thread(
            target=self._await_and_notify, args=(sched, mission["id"]),
            name=f"sched-notify-{sched['id']}", daemon=True,
        ).start()

    # ── completion + ntfy ────────────────────────────────────────────────────

    def _await_and_notify(self, sched: dict, mission_id: str) -> None:
        deadline = time.monotonic() + POLL_TIMEOUT
        mission = self.ledger.get_mission(mission_id)
        while mission and mission["status"] not in TERMINAL_STATUSES:
            if time.monotonic() >= deadline:
                return
            time.sleep(POLL_INTERVAL)
            mission = self.ledger.get_mission(mission_id)
        if mission is None:
            return
        self._notify(sched, mission)

    def _notify(self, sched: dict, mission: dict) -> None:
        topic = sched.get("notify_topic") or self.settings.ntfy_topic
        url = f"{self.settings.ntfy_base_url.rstrip('/')}/{topic}"
        status = mission["status"]
        if status == "completed":
            title = f"Jarvis - {sched['name']}"
            body = (mission.get("result_summary") or "(no summary)")[:2000]
        else:
            title = f"Jarvis - {sched['name']} needs attention"
            body = (f"Mission {status}: "
                    f"{(mission.get('result_summary') or 'no details')[:1900]} "
                    f"(mission_id={mission['id']})")
        try:
            httpx.post(url, content=body.encode("utf-8"),
                       headers={"Title": title}, timeout=5.0)
        except Exception:
            logger.debug("ntfy notification failed", exc_info=True)
