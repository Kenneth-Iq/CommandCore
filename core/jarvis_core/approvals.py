from __future__ import annotations

import threading

from .events import EventHub
from .ledger import Ledger


class ApprovalBroker:
    """Bridges blocking engine threads to async commander decisions.

    request() runs on the engine worker thread and blocks until the approval
    is resolved via REST (resolve()) or times out. The ledger's conditional
    UPDATE is the single arbiter of races between resolve and timeout.
    """

    def __init__(self, ledger: Ledger, hub: EventHub, timeout: float = 600.0):
        self._ledger = ledger
        self._hub = hub
        self._timeout = timeout
        self._pending: dict[str, tuple[threading.Event, dict]] = {}
        self._lock = threading.Lock()

    def request(self, *, mission_id: str, agent_id: str | None, tier: int,
                action: str, description: str) -> str:
        """Blocking. Returns "approve" or "deny"."""
        approval = self._ledger.create_approval(
            mission_id=mission_id, agent_id=agent_id, tier=tier,
            action=action, description=description,
        )
        ap_id = approval["id"]
        done = threading.Event()
        holder: dict = {}
        with self._lock:
            self._pending[ap_id] = (done, holder)

        self._hub.emit("approval.requested", {
            "approval_id": ap_id, "tier": tier, "action": action,
            "description": description, "expires_at": None,
        }, mission_id, agent_id)

        try:
            if not done.wait(self._timeout):
                expired = self._ledger.resolve_approval(ap_id, "expired", "timeout")
                if expired is not None:
                    self._hub.emit("approval.resolved", {
                        "approval_id": ap_id, "decision": "expired",
                        "resolved_by": "timeout",
                    }, mission_id, agent_id)
                    return "deny"
                # resolve() won the race after wait() gave up — honor it
                return holder.get("decision", "deny")
            return holder.get("decision", "deny")
        finally:
            with self._lock:
                self._pending.pop(ap_id, None)

    def resolve(self, approval_id: str, decision: str,
                resolved_by: str = "user", note: str | None = None) -> dict | None:
        """Called from the API. Returns the approval row, or None if it was
        not pending (already resolved or expired)."""
        status = "approved" if decision == "approve" else "denied"
        row = self._ledger.resolve_approval(approval_id, status, resolved_by, note)
        if row is None:
            return None
        self._hub.emit("approval.resolved", {
            "approval_id": approval_id, "decision": decision,
            "resolved_by": resolved_by,
        }, row["mission_id"], row["agent_id"])
        with self._lock:
            pending = self._pending.get(approval_id)
        if pending:
            done, holder = pending
            holder["decision"] = "approve" if decision == "approve" else "deny"
            done.set()
        return row
