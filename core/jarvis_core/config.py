from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

_DEFAULT_SANDBOX = r"C:\jarvis" if os.name == "nt" else os.path.expanduser("~/jarvis")
_PKG_ROOT = Path(__file__).resolve().parent.parent


@dataclass
class Settings:
    host: str = field(default_factory=lambda: os.environ.get("JARVIS_HOST", "127.0.0.1"))
    port: int = field(default_factory=lambda: int(os.environ.get("JARVIS_PORT", "8765")))
    engine: str = field(default_factory=lambda: os.environ.get("JARVIS_ENGINE", "hermes"))
    sandbox_root: Path = field(
        default_factory=lambda: Path(os.environ.get("JARVIS_SANDBOX", _DEFAULT_SANDBOX))
    )
    roles_path: Path = field(
        default_factory=lambda: Path(
            os.environ.get("JARVIS_ROLES", str(_PKG_ROOT / "agents" / "roles.yaml"))
        )
    )
    ledger_path: Path | None = None  # default resolves under sandbox_root
    approval_timeout: float = field(
        default_factory=lambda: float(os.environ.get("JARVIS_APPROVAL_TIMEOUT", "600"))
    )
    odysseus_base_url: str = field(default_factory=lambda: os.environ.get("ODYSSEUS_BASE_URL", ""))
    odysseus_api_token: str = field(default_factory=lambda: os.environ.get("ODYSSEUS_API_TOKEN", ""))
    ntfy_base_url: str = field(default_factory=lambda: os.environ.get("NTFY_BASE_URL", "http://ntfy:80"))
    ntfy_topic: str = field(default_factory=lambda: os.environ.get("NTFY_TOPIC", "jarvis"))
    schedules_path: Path = field(
        default_factory=lambda: Path(
            os.environ.get("JARVIS_SCHEDULES", str(_PKG_ROOT / "agents" / "schedules.yaml"))
        )
    )
    scheduler_tick: float = field(
        default_factory=lambda: float(os.environ.get("JARVIS_SCHEDULER_TICK", "30"))
    )
    research_poll: float = field(
        default_factory=lambda: float(os.environ.get("JARVIS_RESEARCH_POLL", "5"))
    )
    research_timeout: float = field(
        default_factory=lambda: float(os.environ.get("JARVIS_RESEARCH_TIMEOUT", "1800"))
    )
    telegram_bot_token: str = field(
        default_factory=lambda: os.environ.get("TELEGRAM_BOT_TOKEN", "")
    )
    telegram_chat_id: str = field(
        default_factory=lambda: os.environ.get("TELEGRAM_CHAT_ID", "")
    )
    version: str = "0.1.0"

    def resolved_ledger_path(self) -> Path:
        if self.ledger_path is not None:
            return self.ledger_path
        return self.sandbox_root / "jarvis-log" / "ledger.db"
