from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

import yaml
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from .approvals import ApprovalBroker
from .config import Settings
from .engine import make_engine
from .events import EventHub, make_envelope
from .ledger import Ledger
from .missions import MissionManager
from .odysseus import OdysseusClient
from .roles import load_roles
from .scheduler import Scheduler, next_run_after
from .telegram import TelegramBridge

logger = logging.getLogger(__name__)


class MissionCreate(BaseModel):
    prompt: str = Field(min_length=1)
    mode: str = Field(default="chat", pattern="^(chat|mission|research)$")
    title: str | None = None


class ApprovalResolve(BaseModel):
    decision: str = Field(pattern="^(approve|deny)$")
    note: str | None = None


class ScheduleCreate(BaseModel):
    name: str = Field(min_length=1)
    cron_expr: str = Field(min_length=1)
    prompt: str = Field(min_length=1)
    mode: str = Field(default="mission", pattern="^(chat|mission)$")
    notify_topic: str | None = None
    enabled: bool = True


class ScheduleUpdate(BaseModel):
    name: str | None = None
    cron_expr: str | None = None
    prompt: str | None = None
    mode: str | None = Field(default=None, pattern="^(chat|mission)$")
    notify_topic: str | None = None
    enabled: bool | None = None


def _load_default_schedules(ledger: Ledger, path) -> None:
    if not path.exists():
        return
    try:
        entries = yaml.safe_load(path.read_text(encoding="utf-8")) or []
    except Exception:
        logger.exception("Failed to load default schedules from %s", path)
        return
    for entry in entries:
        name = entry.get("name")
        if not name or ledger.get_schedule_by_name(name) is not None:
            continue
        cron_expr = entry["cron_expr"]
        ledger.create_schedule(
            name=name, cron_expr=cron_expr, prompt=entry["prompt"],
            mode=entry.get("mode", "mission"),
            notify_topic=entry.get("notify_topic"),
            enabled=bool(entry.get("enabled", True)),
            next_run_at=next_run_after(cron_expr),
        )


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        ledger = Ledger(settings.resolved_ledger_path())
        hub = EventHub(ledger)
        hub.bind_loop(asyncio.get_running_loop())
        broker = ApprovalBroker(ledger, hub, timeout=settings.approval_timeout)
        engine = make_engine(settings.engine, settings)
        roles = load_roles(settings.roles_path)
        odysseus = OdysseusClient(settings.odysseus_base_url, settings.odysseus_api_token)
        manager = MissionManager(settings, ledger, hub, broker, engine, roles, odysseus)
        _load_default_schedules(ledger, settings.schedules_path)
        scheduler = Scheduler(settings, ledger, manager)
        scheduler.start()
        telegram = TelegramBridge(settings, ledger, hub, broker, manager)
        telegram.start()
        app.state.ledger = ledger
        app.state.hub = hub
        app.state.broker = broker
        app.state.manager = manager
        app.state.settings = settings
        app.state.odysseus = odysseus
        app.state.scheduler = scheduler
        app.state.telegram = telegram
        logger.info("Jarvis Core ready — engine=%s sandbox=%s",
                    engine.name, settings.sandbox_root)
        yield
        await telegram.stop()
        scheduler.stop()
        manager.shutdown()
        ledger.close()

    app = FastAPI(title="Jarvis Core", version=settings.version, lifespan=lifespan)

    # ── health ────────────────────────────────────────────────────────────────

    @app.get("/health")
    def health():
        return {"status": "ok", "engine": app.state.manager.engine.name,
                "version": settings.version}

    # ── missions ──────────────────────────────────────────────────────────────

    @app.post("/missions", status_code=201)
    def create_mission(body: MissionCreate):
        mission = app.state.manager.create(body.prompt, body.mode, body.title)
        return {"mission": mission}

    @app.get("/missions")
    def list_missions():
        return {"missions": app.state.ledger.list_missions()}

    @app.get("/missions/{mission_id}")
    def get_mission(mission_id: str):
        mission = app.state.ledger.get_mission(mission_id)
        if mission is None:
            raise HTTPException(404, "mission not found")
        return {"mission": mission}

    @app.get("/missions/{mission_id}/events")
    def get_mission_events(mission_id: str, after: str | None = None):
        if app.state.ledger.get_mission(mission_id) is None:
            raise HTTPException(404, "mission not found")
        return {"events": app.state.ledger.list_events(mission_id, after)}

    @app.get("/missions/{mission_id}/agents")
    def get_mission_agents(mission_id: str):
        if app.state.ledger.get_mission(mission_id) is None:
            raise HTTPException(404, "mission not found")
        return {"agents": app.state.ledger.list_agent_runs(mission_id)}

    @app.post("/missions/{mission_id}/cancel", status_code=202)
    def cancel_mission(mission_id: str):
        if app.state.ledger.get_mission(mission_id) is None:
            raise HTTPException(404, "mission not found")
        return app.state.manager.cancel(mission_id)

    # ── approvals ─────────────────────────────────────────────────────────────

    @app.get("/approvals")
    def list_approvals(status: str | None = None):
        return {"approvals": app.state.ledger.list_approvals(status)}

    @app.post("/approvals/{approval_id}/resolve")
    def resolve_approval(approval_id: str, body: ApprovalResolve):
        if app.state.ledger.get_approval(approval_id) is None:
            raise HTTPException(404, "approval not found")
        row = app.state.broker.resolve(approval_id, body.decision, "user", body.note)
        if row is None:
            raise HTTPException(409, "approval already resolved or expired")
        return {"approval": row}

    # ── audit ─────────────────────────────────────────────────────────────────

    @app.get("/actions")
    def list_actions(limit: int = 100):
        return {"actions": app.state.ledger.list_actions(limit)}

    # ── schedules (Sentinel) ─────────────────────────────────────────────────

    @app.get("/schedules")
    def list_schedules():
        return {"schedules": app.state.ledger.list_schedules()}

    @app.post("/schedules", status_code=201)
    def create_schedule(body: ScheduleCreate):
        try:
            next_run_at = next_run_after(body.cron_expr)
        except Exception as exc:
            raise HTTPException(400, f"invalid cron expression: {exc}")
        schedule = app.state.ledger.create_schedule(
            name=body.name, cron_expr=body.cron_expr, prompt=body.prompt,
            mode=body.mode, notify_topic=body.notify_topic,
            enabled=body.enabled, next_run_at=next_run_at,
        )
        return {"schedule": schedule}

    @app.get("/schedules/{schedule_id}")
    def get_schedule(schedule_id: str):
        schedule = app.state.ledger.get_schedule(schedule_id)
        if schedule is None:
            raise HTTPException(404, "schedule not found")
        return {"schedule": schedule}

    @app.patch("/schedules/{schedule_id}")
    def update_schedule(schedule_id: str, body: ScheduleUpdate):
        if app.state.ledger.get_schedule(schedule_id) is None:
            raise HTTPException(404, "schedule not found")
        next_run_at = None
        if body.cron_expr is not None:
            try:
                next_run_at = next_run_after(body.cron_expr)
            except Exception as exc:
                raise HTTPException(400, f"invalid cron expression: {exc}")
        schedule = app.state.ledger.update_schedule(
            schedule_id, name=body.name, cron_expr=body.cron_expr,
            prompt=body.prompt, mode=body.mode, enabled=body.enabled,
            notify_topic=body.notify_topic, next_run_at=next_run_at,
        )
        return {"schedule": schedule}

    @app.delete("/schedules/{schedule_id}", status_code=204)
    def delete_schedule(schedule_id: str):
        if not app.state.ledger.delete_schedule(schedule_id):
            raise HTTPException(404, "schedule not found")
        return None

    # ── event stream ──────────────────────────────────────────────────────────

    @app.websocket("/ws/events")
    async def ws_events(ws: WebSocket):
        await ws.accept()
        # Connect-time status goes straight to this socket (not persisted —
        # it is per-connection state, not mission history).
        await ws.send_json(make_envelope("core.status", {
            "state": "ready", "engine": app.state.manager.engine.name,
            "version": settings.version,
        }, None, None))
        queue = app.state.hub.subscribe()
        try:
            while True:
                event = await queue.get()
                await ws.send_json(event)
        except WebSocketDisconnect:
            pass
        finally:
            app.state.hub.unsubscribe(queue)

    return app
