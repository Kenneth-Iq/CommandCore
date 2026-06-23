from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

_SCHEMA = """
CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('chat','mission','research')),
  status TEXT NOT NULL CHECK (status IN
    ('queued','planning','awaiting_approval','running',
     'completed','failed','cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  result_summary TEXT,
  artifacts_dir TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  mission_id TEXT,
  agent_id TEXT,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  ts TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_mission ON events(mission_id, ts);
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  agent_id TEXT,
  tier INTEGER NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','approved','denied','expired')),
  requested_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT,
  note TEXT
);
CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  role TEXT NOT NULL,
  instruction TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','running','done','failed','skipped')),
  result_summary TEXT,
  started_at TEXT,
  finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_agent_runs_mission ON agent_runs(mission_id);
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cron_expr TEXT NOT NULL,
  prompt TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'mission' CHECK (mode IN ('chat','mission')),
  enabled INTEGER NOT NULL DEFAULT 1,
  notify_topic TEXT,
  created_at TEXT NOT NULL,
  last_run_at TEXT,
  last_mission_id TEXT,
  next_run_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  mission_id TEXT,
  agent_id TEXT,
  intent TEXT,
  action_type TEXT,
  target TEXT,
  payload_summary TEXT,
  confirmed_by TEXT,
  result TEXT
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Ledger:
    """Thread-safe SQLite store. Engines write from worker threads; the API
    reads from the event loop thread — a single connection guarded by a lock
    keeps Phase 1 simple (WAL mode keeps readers cheap)."""

    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        with self._lock:
            self._conn.execute("PRAGMA journal_mode=WAL")
            self._conn.executescript(_SCHEMA)
            # Phase 2 additive migration — no-op on fresh databases.
            try:
                self._conn.execute("ALTER TABLE missions ADD COLUMN plan_json TEXT")
            except sqlite3.OperationalError:
                pass  # column already exists
            self._conn.commit()
            self._migrate_mission_modes()

    def _migrate_mission_modes(self) -> None:
        """Phase 4: legacy DBs have CHECK (mode IN ('chat','mission')) baked
        into the table SQL — SQLite can't alter a CHECK, so probe with a
        rolled-back insert and rebuild the table only if needed."""
        try:
            self._conn.execute("BEGIN")
            self._conn.execute(
                "INSERT INTO missions (id,title,prompt,mode,status,created_at,updated_at)"
                " VALUES ('__probe__','p','p','research','queued','x','x')")
            self._conn.execute("ROLLBACK")
            return  # CHECK already allows 'research'
        except sqlite3.IntegrityError:
            self._conn.execute("ROLLBACK")
        cols = ("id,title,prompt,mode,status,created_at,updated_at,"
                "result_summary,artifacts_dir,plan_json")
        self._conn.executescript(f"""
            BEGIN;
            CREATE TABLE missions_new (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              prompt TEXT NOT NULL,
              mode TEXT NOT NULL CHECK (mode IN ('chat','mission','research')),
              status TEXT NOT NULL CHECK (status IN
                ('queued','planning','awaiting_approval','running',
                 'completed','failed','cancelled')),
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              result_summary TEXT,
              artifacts_dir TEXT,
              plan_json TEXT
            );
            INSERT INTO missions_new ({cols}) SELECT {cols} FROM missions;
            DROP TABLE missions;
            ALTER TABLE missions_new RENAME TO missions;
            COMMIT;
        """)

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    # ── missions ────────────────────────────────────────────────────────────

    def create_mission(self, prompt: str, mode: str, title: str,
                       artifacts_dir: str | None = None) -> dict:
        mid = f"m_{uuid.uuid4()}"
        now = _now()
        with self._lock:
            self._conn.execute(
                "INSERT INTO missions (id,title,prompt,mode,status,created_at,updated_at,artifacts_dir)"
                " VALUES (?,?,?,?,?,?,?,?)",
                (mid, title, prompt, mode, "queued", now, now, artifacts_dir),
            )
            self._conn.commit()
        return self.get_mission(mid)

    def update_mission(self, mission_id: str, *, status: str | None = None,
                       result_summary: str | None = None,
                       artifacts_dir: str | None = None,
                       plan_json: str | None = None) -> None:
        sets, vals = ["updated_at = ?"], [_now()]
        if status is not None:
            sets.append("status = ?"); vals.append(status)
        if result_summary is not None:
            sets.append("result_summary = ?"); vals.append(result_summary)
        if artifacts_dir is not None:
            sets.append("artifacts_dir = ?"); vals.append(artifacts_dir)
        if plan_json is not None:
            sets.append("plan_json = ?"); vals.append(plan_json)
        vals.append(mission_id)
        with self._lock:
            self._conn.execute(f"UPDATE missions SET {', '.join(sets)} WHERE id = ?", vals)
            self._conn.commit()

    @staticmethod
    def _mission_dict(row: sqlite3.Row) -> dict:
        d = dict(row)
        raw = d.pop("plan_json", None)
        try:
            d["plan"] = json.loads(raw) if raw else None
        except json.JSONDecodeError:
            d["plan"] = None
        return d

    def get_mission(self, mission_id: str) -> dict | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM missions WHERE id = ?", (mission_id,)).fetchone()
        return self._mission_dict(row) if row else None

    def list_missions(self, limit: int = 100) -> list[dict]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM missions ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        return [self._mission_dict(r) for r in rows]

    # ── agent runs ──────────────────────────────────────────────────────────

    def create_agent_run(self, *, mission_id: str, agent_id: str, role: str,
                         instruction: str) -> dict:
        run_id = f"ar_{uuid.uuid4()}"
        with self._lock:
            self._conn.execute(
                "INSERT INTO agent_runs (id,mission_id,agent_id,role,instruction,status)"
                " VALUES (?,?,?,?,?,'pending')",
                (run_id, mission_id, agent_id, role, instruction),
            )
            self._conn.commit()
        return self.get_agent_run(run_id)

    def update_agent_run(self, run_id: str, *, status: str,
                         result_summary: str | None = None) -> None:
        sets, vals = ["status = ?"], [status]
        if status == "running":
            sets.append("started_at = ?"); vals.append(_now())
        if status in ("done", "failed", "skipped"):
            sets.append("finished_at = ?"); vals.append(_now())
        if result_summary is not None:
            sets.append("result_summary = ?"); vals.append(result_summary)
        vals.append(run_id)
        with self._lock:
            self._conn.execute(
                f"UPDATE agent_runs SET {', '.join(sets)} WHERE id = ?", vals)
            self._conn.commit()

    def get_agent_run(self, run_id: str) -> dict | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM agent_runs WHERE id = ?", (run_id,)).fetchone()
        return dict(row) if row else None

    def list_agent_runs(self, mission_id: str) -> list[dict]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM agent_runs WHERE mission_id = ? ORDER BY rowid",
                (mission_id,)).fetchall()
        return [dict(r) for r in rows]

    # ── events ──────────────────────────────────────────────────────────────

    def insert_event(self, event: dict) -> None:
        with self._lock:
            self._conn.execute(
                "INSERT INTO events (id,mission_id,agent_id,type,payload_json,ts) VALUES (?,?,?,?,?,?)",
                (event["id"], event["mission_id"], event["agent_id"],
                 event["type"], json.dumps(event["payload"]), event["ts"]),
            )
            self._conn.commit()

    def list_events(self, mission_id: str, after: str | None = None) -> list[dict]:
        # rowid gives stable insertion order — ts alone is not unique enough
        # for events emitted in the same microsecond.
        q = "SELECT rowid AS _rid, * FROM events WHERE mission_id = ?"
        vals: list = [mission_id]
        if after:
            q += " AND rowid > (SELECT rowid FROM events WHERE id = ?)"
            vals.append(after)
        q += " ORDER BY rowid"
        with self._lock:
            rows = self._conn.execute(q, vals).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            d.pop("_rid", None)
            d["payload"] = json.loads(d.pop("payload_json"))
            d["v"] = 1
            out.append(d)
        return out

    # ── approvals ───────────────────────────────────────────────────────────

    def create_approval(self, *, mission_id: str, agent_id: str | None, tier: int,
                        action: str, description: str) -> dict:
        ap_id = f"ap_{uuid.uuid4()}"
        with self._lock:
            self._conn.execute(
                "INSERT INTO approvals (id,mission_id,agent_id,tier,action,description,status,requested_at)"
                " VALUES (?,?,?,?,?,?,'pending',?)",
                (ap_id, mission_id, agent_id, tier, action, description, _now()),
            )
            self._conn.commit()
        return self.get_approval(ap_id)

    def resolve_approval(self, approval_id: str, status: str,
                         resolved_by: str | None, note: str | None = None) -> dict | None:
        """Conditional resolve — only transitions a pending approval. Returns
        the updated row, or None if it was already resolved/expired."""
        with self._lock:
            cur = self._conn.execute(
                "UPDATE approvals SET status = ?, resolved_at = ?, resolved_by = ?, note = ?"
                " WHERE id = ? AND status = 'pending'",
                (status, _now(), resolved_by, note, approval_id),
            )
            self._conn.commit()
            changed = cur.rowcount > 0
        return self.get_approval(approval_id) if changed else None

    def get_approval(self, approval_id: str) -> dict | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM approvals WHERE id = ?", (approval_id,)).fetchone()
        return dict(row) if row else None

    def list_approvals(self, status: str | None = None) -> list[dict]:
        q, vals = "SELECT * FROM approvals", []
        if status:
            q += " WHERE status = ?"; vals.append(status)
        q += " ORDER BY requested_at DESC"
        with self._lock:
            rows = self._conn.execute(q, vals).fetchall()
        return [dict(r) for r in rows]

    # ── audit actions ───────────────────────────────────────────────────────

    def insert_action(self, *, mission_id: str | None, agent_id: str | None,
                      intent: str | None, action_type: str, target: str | None,
                      payload_summary: str | None, confirmed_by: str,
                      result: str | None) -> None:
        with self._lock:
            self._conn.execute(
                "INSERT INTO actions (ts,mission_id,agent_id,intent,action_type,target,"
                "payload_summary,confirmed_by,result) VALUES (?,?,?,?,?,?,?,?,?)",
                (_now(), mission_id, agent_id, intent, action_type, target,
                 payload_summary, confirmed_by, result),
            )
            self._conn.commit()

    def list_actions(self, limit: int = 100) -> list[dict]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM actions ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]

    # ── schedules ───────────────────────────────────────────────────────────

    def create_schedule(self, *, name: str, cron_expr: str, prompt: str,
                        mode: str = "mission", notify_topic: str | None = None,
                        next_run_at: str, enabled: bool = True) -> dict:
        sid = f"sched_{uuid.uuid4()}"
        with self._lock:
            self._conn.execute(
                "INSERT INTO schedules (id,name,cron_expr,prompt,mode,enabled,notify_topic,"
                "created_at,next_run_at) VALUES (?,?,?,?,?,?,?,?,?)",
                (sid, name, cron_expr, prompt, mode, 1 if enabled else 0,
                 notify_topic, _now(), next_run_at),
            )
            self._conn.commit()
        return self.get_schedule(sid)

    def update_schedule(self, schedule_id: str, *, name: str | None = None,
                        cron_expr: str | None = None, prompt: str | None = None,
                        mode: str | None = None, enabled: bool | None = None,
                        notify_topic: str | None = None,
                        next_run_at: str | None = None,
                        last_run_at: str | None = None,
                        last_mission_id: str | None = None) -> dict | None:
        sets, vals = [], []
        if name is not None: sets.append("name = ?"); vals.append(name)
        if cron_expr is not None: sets.append("cron_expr = ?"); vals.append(cron_expr)
        if prompt is not None: sets.append("prompt = ?"); vals.append(prompt)
        if mode is not None: sets.append("mode = ?"); vals.append(mode)
        if enabled is not None: sets.append("enabled = ?"); vals.append(1 if enabled else 0)
        if notify_topic is not None: sets.append("notify_topic = ?"); vals.append(notify_topic)
        if next_run_at is not None: sets.append("next_run_at = ?"); vals.append(next_run_at)
        if last_run_at is not None: sets.append("last_run_at = ?"); vals.append(last_run_at)
        if last_mission_id is not None: sets.append("last_mission_id = ?"); vals.append(last_mission_id)
        if not sets:
            return self.get_schedule(schedule_id)
        vals.append(schedule_id)
        with self._lock:
            self._conn.execute(f"UPDATE schedules SET {', '.join(sets)} WHERE id = ?", vals)
            self._conn.commit()
        return self.get_schedule(schedule_id)

    def get_schedule(self, schedule_id: str) -> dict | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM schedules WHERE id = ?", (schedule_id,)).fetchone()
        return dict(row) if row else None

    def get_schedule_by_name(self, name: str) -> dict | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM schedules WHERE name = ?", (name,)).fetchone()
        return dict(row) if row else None

    def list_schedules(self) -> list[dict]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM schedules ORDER BY created_at").fetchall()
        return [dict(r) for r in rows]

    def list_due_schedules(self, now_iso: str) -> list[dict]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM schedules WHERE enabled = 1 AND next_run_at <= ?",
                (now_iso,)).fetchall()
        return [dict(r) for r in rows]

    def delete_schedule(self, schedule_id: str) -> bool:
        with self._lock:
            cur = self._conn.execute("DELETE FROM schedules WHERE id = ?", (schedule_id,))
            self._conn.commit()
        return cur.rowcount > 0
