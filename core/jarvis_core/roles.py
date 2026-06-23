from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from pathlib import Path

import yaml

_VAR = re.compile(r"\$\{(\w+)(?::-([^}]*))?\}")


def _substitute(value: str) -> str:
    """Expand ${VAR} and ${VAR:-default} from the environment."""
    def repl(m: re.Match) -> str:
        return os.environ.get(m.group(1), m.group(2) or "")
    return _VAR.sub(repl, value)


@dataclass
class RoleConfig:
    name: str
    display_name: str = ""
    model: str = ""
    base_url: str = ""
    api_key_env: str = ""
    toolsets: list[str] = field(default_factory=list)
    max_tier: int = 3
    system_prompt: str = ""
    max_iterations: int = 30


def load_roles(path: Path) -> dict[str, RoleConfig]:
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    roles: dict[str, RoleConfig] = {}
    for name, cfg in raw.items():
        cfg = dict(cfg or {})
        prompt = ""
        prompt_file = cfg.pop("system_prompt_file", None)
        if prompt_file:
            prompt_path = path.parent / prompt_file
            if prompt_path.exists():
                prompt = prompt_path.read_text(encoding="utf-8")
        for key in ("model", "base_url", "api_key_env", "display_name"):
            if isinstance(cfg.get(key), str):
                cfg[key] = _substitute(cfg[key])
        roles[name] = RoleConfig(name=name, system_prompt=prompt, **cfg)
    return roles
