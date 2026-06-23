"""Manual smoke test: HermesEngine against NVIDIA NIM (PHASE-0-1.md A8).

Prereqs:
    pip install -e .                      (from core\\)
    pip install -e C:\\Projects\\Hermes-agent
    $env:NVIDIA_API_KEY = "nvapi-..."
Run:
    python scripts\\smoke_nim.py [prompt]
"""
from __future__ import annotations

import os
import sys

from jarvis_core.config import Settings
from jarvis_core.engine import make_engine
from jarvis_core.events import EventHub
from jarvis_core.ledger import Ledger
from jarvis_core.roles import load_roles

DEFAULT_PROMPT = ("Create a file called notes/smoke-test.md containing a one-line "
                  "greeting, then read it back to me.")


def main() -> int:
    if not os.environ.get("NVIDIA_API_KEY"):
        print("NVIDIA_API_KEY is not set — aborting.")
        return 1

    prompt = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PROMPT
    settings = Settings(engine="hermes")
    settings.sandbox_root.mkdir(parents=True, exist_ok=True)

    ledger = Ledger(settings.resolved_ledger_path())
    hub = EventHub(ledger)  # no loop bound — events persist to ledger only
    roles = load_roles(settings.roles_path)
    engine = make_engine("hermes", settings)
    mission = ledger.create_mission(prompt, "chat", "nim-smoke")

    def emit(type_: str, payload: dict, agent: str = "prime") -> None:
        hub.emit(type_, payload, mission["id"], agent)
        print(f"[{type_}] {str(payload)[:160]}")

    def gate(command: str, description: str = "", **_kw) -> str:
        answer = input(f"\nAPPROVAL: {description or command}\n  approve? [y/N] ")
        return "approve" if answer.strip().lower().startswith("y") else "deny"

    print(f"engine=hermes model={roles['prime'].model}\nprompt: {prompt}\n")
    result = engine.run(mission=mission, role=roles["prime"],
                        emit=emit, approval_gate=gate)
    print(f"\n--- final ({'ok' if result.ok else 'FAILED'}) ---\n{result.final_text}")
    return 0 if result.ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
