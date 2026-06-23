"""Odysseus workspace tools for Hermes agents (PHASE-4.md §3).

Registers an "odysseus" toolset (email + calendar) whose handlers call
Odysseus's token-scoped /api/codex/* routes. Approval is enforced through a
thread-local gate the engine installs per run: handlers build a synthetic
command "odysseus:{tool}:{summary}" which tiers.classify maps to tier 2 for
email_send (commander approval) and tier 1 for everything else (audited,
auto-approved) — the role ceiling still applies, so tier-1 roles can never
send mail.
"""
from __future__ import annotations

import json
import logging
import threading

import httpx

logger = logging.getLogger(__name__)

# Set by HermesEngine.run before run_conversation, cleared after. Each fleet
# task runs its whole agent on one worker thread, so this is race-free.
_gate_local = threading.local()


def set_thread_gate(gate) -> None:
    _gate_local.gate = gate


def clear_thread_gate() -> None:
    _gate_local.gate = None


def _gate(tool: str, summary: str) -> str:
    """Returns "approve" or "deny". No gate installed (e.g. engine.complete
    contexts) -> deny outward actions, approve the rest, mirroring the
    tier-1/tier-2 split without an audit row."""
    gate = getattr(_gate_local, "gate", None)
    command = f"odysseus:{tool}:{summary[:160]}"
    if gate is None:
        return "deny" if tool == "email_send" else "approve"
    return gate(command, summary)


class _Codex:
    """Minimal httpx wrapper over the codex routes (sync, short timeouts)."""

    def __init__(self, base_url: str, api_token: str, timeout: float = 15.0):
        self.base_url = base_url.rstrip("/")
        self.headers = {"Authorization": f"Bearer {api_token}"}
        self.timeout = timeout

    def get(self, path: str, params: dict | None = None) -> dict:
        resp = httpx.get(f"{self.base_url}/api/codex{path}", params=params,
                         headers=self.headers, timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()

    def post(self, path: str, body: dict) -> dict:
        resp = httpx.post(f"{self.base_url}/api/codex{path}", json=body,
                          headers=self.headers, timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()

    def put(self, path: str, body: dict) -> dict:
        resp = httpx.put(f"{self.base_url}/api/codex{path}", json=body,
                         headers=self.headers, timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()

    def delete(self, path: str) -> dict:
        resp = httpx.delete(f"{self.base_url}/api/codex{path}",
                            headers=self.headers, timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()


def _ok(data) -> str:
    return json.dumps(data) if not isinstance(data, str) else data


def _err(message: str) -> str:
    return json.dumps({"error": message})


def _wrap(fn):
    """Uniform error surface: Odysseus 503s ("integration is not available")
    and network failures come back as clean tool errors the model can relay."""
    def inner(args, **_kw):
        try:
            return fn(args or {})
        except httpx.HTTPStatusError as exc:
            detail = ""
            try:
                detail = exc.response.json().get("detail", "")
            except Exception:
                detail = exc.response.text[:200]
            return _err(f"Odysseus returned {exc.response.status_code}: {detail}")
        except Exception as exc:
            logger.debug("odysseus tool failed", exc_info=True)
            return _err(f"Odysseus call failed: {type(exc).__name__}: {exc}")
    return inner


def build_tools(base_url: str, api_token: str) -> list[tuple[str, callable, str, dict]]:
    """Returns [(name, handler, description, parameters_schema), ...].
    Separate from registration so the handlers are testable without the
    hermes-agent package."""
    codex = _Codex(base_url or "", api_token or "")

    # ── email ────────────────────────────────────────────────────────────────

    def email_list(args):
        data = codex.get("/emails", {
            "folder": args.get("folder", "INBOX"),
            "limit": min(int(args.get("limit", 10) or 10), 50),
            "filter": args.get("filter", "all"),
        })
        return _ok(data)

    def email_read(args):
        uid = str(args.get("uid", "")).strip()
        if not uid:
            return _err("uid is required")
        return _ok(codex.get(f"/emails/{uid}", {"folder": args.get("folder", "INBOX")}))

    def _email_body(args) -> dict:
        body = {
            "to": str(args.get("to", "")).strip(),
            "subject": str(args.get("subject", "")).strip(),
            "body": str(args.get("body", "")),
        }
        for key in ("cc", "in_reply_to", "references"):
            if args.get(key):
                body[key] = str(args[key])
        return body

    def email_draft(args):
        body = _email_body(args)
        if not body["to"] or not body["subject"]:
            return _err("to and subject are required")
        if _gate("email_draft", f"draft to {body['to']}: {body['subject']}") != "approve":
            return _err("drafting was not approved")
        return _ok(codex.post("/emails/draft", body))

    def email_send(args):
        body = _email_body(args)
        if not body["to"] or not body["subject"]:
            return _err("to and subject are required")
        decision = _gate("email_send", f"send to {body['to']}: {body['subject']}")
        if decision != "approve":
            return _err("the commander did not approve sending this email")
        return _ok(codex.post("/emails/send", body))

    # ── calendar ─────────────────────────────────────────────────────────────

    def calendar_list(args):
        start, end = str(args.get("start", "")).strip(), str(args.get("end", "")).strip()
        if not start or not end:
            return _err("start and end (ISO dates) are required")
        return _ok(codex.get("/calendar/events", {"start": start, "end": end}))

    def calendar_create(args):
        summary = str(args.get("summary", "")).strip()
        dtstart = str(args.get("dtstart", "")).strip()
        if not summary or not dtstart:
            return _err("summary and dtstart are required")
        if _gate("calendar_create", f"create event: {summary} at {dtstart}") != "approve":
            return _err("event creation was not approved")
        body = {"summary": summary, "dtstart": dtstart}
        for key in ("dtend", "description", "location"):
            if args.get(key):
                body[key] = str(args[key])
        if args.get("all_day"):
            body["all_day"] = True
        return _ok(codex.post("/calendar/events", body))

    def calendar_update(args):
        uid = str(args.get("uid", "")).strip()
        if not uid:
            return _err("uid is required")
        body = {k: str(args[k]) for k in
                ("summary", "dtstart", "dtend", "description", "location")
                if args.get(k)}
        if not body:
            return _err("nothing to update")
        if _gate("calendar_update", f"update event {uid}") != "approve":
            return _err("event update was not approved")
        return _ok(codex.put(f"/calendar/events/{uid}", body))

    def calendar_delete(args):
        uid = str(args.get("uid", "")).strip()
        if not uid:
            return _err("uid is required")
        if _gate("calendar_delete", f"delete event {uid}") != "approve":
            return _err("event deletion was not approved")
        return _ok(codex.delete(f"/calendar/events/{uid}"))

    return [
        ("email_list", email_list,
         "List emails from the commander's mailbox (via Odysseus). Read-only.",
         {"type": "object", "properties": {
             "folder": {"type": "string", "description": "Mail folder, default INBOX"},
             "limit": {"type": "integer", "description": "Max messages (1-50), default 10"},
             "filter": {"type": "string", "description": "all | unread"},
         }}),
        ("email_read", email_read,
         "Read one email by uid. Read-only.",
         {"type": "object", "properties": {
             "uid": {"type": "string", "description": "Message uid from email_list"},
             "folder": {"type": "string", "description": "Mail folder, default INBOX"},
         }, "required": ["uid"]}),
        ("email_draft", email_draft,
         "Save an email draft (does NOT send). Use email_send to actually send.",
         {"type": "object", "properties": {
             "to": {"type": "string"}, "subject": {"type": "string"},
             "body": {"type": "string", "description": "Plain text / markdown body"},
             "cc": {"type": "string"},
             "in_reply_to": {"type": "string", "description": "Message-ID being replied to"},
         }, "required": ["to", "subject", "body"]}),
        ("email_send", email_send,
         "SEND an email. Outward-facing: always requires commander approval. "
         "Prefer email_draft unless sending was explicitly requested.",
         {"type": "object", "properties": {
             "to": {"type": "string"}, "subject": {"type": "string"},
             "body": {"type": "string", "description": "Plain text / markdown body"},
             "cc": {"type": "string"},
             "in_reply_to": {"type": "string", "description": "Message-ID being replied to"},
         }, "required": ["to", "subject", "body"]}),
        ("calendar_list", calendar_list,
         "List the commander's calendar events in a date range. Read-only.",
         {"type": "object", "properties": {
             "start": {"type": "string", "description": "Range start, ISO 8601 date"},
             "end": {"type": "string", "description": "Range end, ISO 8601 date"},
         }, "required": ["start", "end"]}),
        ("calendar_create", calendar_create,
         "Create a calendar event.",
         {"type": "object", "properties": {
             "summary": {"type": "string"}, "dtstart": {"type": "string", "description": "ISO 8601"},
             "dtend": {"type": "string", "description": "ISO 8601"},
             "all_day": {"type": "boolean"},
             "description": {"type": "string"}, "location": {"type": "string"},
         }, "required": ["summary", "dtstart"]}),
        ("calendar_update", calendar_update,
         "Update fields of an existing calendar event (uid from calendar_list).",
         {"type": "object", "properties": {
             "uid": {"type": "string"},
             "summary": {"type": "string"}, "dtstart": {"type": "string"},
             "dtend": {"type": "string"}, "description": {"type": "string"},
             "location": {"type": "string"},
         }, "required": ["uid"]}),
        ("calendar_delete", calendar_delete,
         "Delete a calendar event (uid from calendar_list).",
         {"type": "object", "properties": {
             "uid": {"type": "string"},
         }, "required": ["uid"]}),
    ]


def register_odysseus_tools(base_url: str, api_token: str) -> bool:
    """Idempotent. Returns True if the toolset was registered (or already
    was). Requires the hermes-agent package on the path."""
    try:
        from tools.registry import registry
    except ImportError:
        return False

    if getattr(register_odysseus_tools, "_done", False):
        return True

    enabled = bool(base_url and api_token)

    def check(*_a, **_kw) -> bool:
        return enabled

    for name, fn, description, parameters in build_tools(base_url, api_token):
        registry.register(
            name=name,
            toolset="odysseus",
            schema={"name": name, "description": description, "parameters": parameters},
            handler=_wrap(fn),
            check_fn=check,
            description=description,
        )

    register_odysseus_tools._done = True
    return True
