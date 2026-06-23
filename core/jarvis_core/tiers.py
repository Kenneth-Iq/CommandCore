from __future__ import annotations

import re
from pathlib import Path

# PRD §8.2 tiers: 0 read · 1 draft · 2 send/post · 3 destructive · 4 server write.
# This classifier maps an action string (typically a shell command Hermes
# flagged for approval) to a tier. Unknown-but-flagged actions default to
# tier 2 — Hermes only invokes the approval callback for commands it already
# considers dangerous, so "at least ask the commander" is the safe floor.

_READ_ONLY = re.compile(
    r"^\s*(ls|dir|cat|type|head|tail|pwd|whoami|echo|find|rg|grep|git\s+(status|log|diff)|"
    r"Get-\w+|Select-String|Test-Path)\b",
    re.IGNORECASE,
)
_DESTRUCTIVE = re.compile(
    r"\b(rm|del|erase|rmdir|rd|Remove-Item|Clear-Content|format|mkfs|shutdown|reboot|"
    r"git\s+(reset\s+--hard|clean|push\s+--force))\b",
    re.IGNORECASE,
)
_SEND = re.compile(r"\b(mail|smtp|send|post|publish|tweet|curl\s+-X\s*(POST|PUT|DELETE))\b",
                   re.IGNORECASE)
_WINDOWS_PATH = re.compile(r"[A-Za-z]:\\[^\s\"']*")


def classify(command: str, sandbox_root: Path) -> tuple[int, str]:
    """Return (tier, action_label) for a flagged command."""
    # Odysseus workspace tools pass synthetic commands "odysseus:{tool}:{summary}"
    # with explicit tier semantics (PHASE-4.md §3.2). Checked first so the
    # summary text can never trip the shell-command regexes below.
    if command.startswith("odysseus:"):
        tool = command.split(":", 2)[1]
        if tool == "email_send":
            return 2, "send email"
        return 1, f"workspace tool {tool}"

    if _DESTRUCTIVE.search(command):
        return 3, "destructive command"

    # Absolute paths outside the sandbox escalate to destructive review
    root = str(sandbox_root).rstrip("\\/").lower()
    for raw in _WINDOWS_PATH.findall(command):
        if not raw.lower().startswith(root):
            return 3, "path outside sandbox"

    if _READ_ONLY.match(command):
        return 0, "read-only command"
    if _SEND.search(command):
        return 2, "send/post action"
    return 2, "flagged command"
