from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Protocol

from ..roles import RoleConfig

# emit(type, payload, agent_id="prime") — forwards to the EventHub with the
# mission id already bound.
EmitFn = Callable[..., None]

# approval_gate(command, description="", allow_permanent=False, **kw)
#   -> "approve" | "deny"
# Matches the Hermes approval-callback contract so HermesEngine can install
# it directly via tools.terminal_tool.set_approval_callback.
ApprovalGate = Callable[..., str]


@dataclass
class EngineResult:
    ok: bool
    final_text: str = ""
    error: str | None = None


class Engine(Protocol):
    name: str

    def run(self, *, mission: dict, role: RoleConfig,
            emit: EmitFn, approval_gate: ApprovalGate) -> EngineResult:
        """Blocking; invoked on a worker thread by MissionManager.
        Must be safe to call concurrently (fleet tasks run in parallel)."""
        ...

    def complete(self, *, role: RoleConfig, prompt: str) -> str:
        """Single tool-light completion — used for plan generation and
        sitrep synthesis. Blocking."""
        ...
