from __future__ import annotations

import os
import re

from .base import EngineResult
from ..config import Settings
from ..roles import RoleConfig

# nemotron-super is a reasoning model — by default it emits large <think>
# blocks that blow the output-token budget and truncate tool calls mid-stream
# (the model then hallucinates "no results"). This directive keeps it concise
# and tool-focused. Harmless on non-nemotron models (ignored).
THINK_OFF = "detailed thinking off"

# When nemotron narrates a search instead of calling the tool, it tends to write
# `web_search(query="...")` in prose — we mine those to rescue the query.
_NARRATED_QUERY = re.compile(
    r'web_search\s*\(\s*(?:query\s*=\s*)?["\']([^"\']{3,200})["\']', re.IGNORECASE)


# nemotron sometimes returns nothing, or refuses a reasoning task with a
# "couldn't find a function" message because it has tools but no obvious one to
# call. Detect both so we can retry the agent tool-free.
_REFUSAL_MARKERS = (
    "couldn't find a function", "could not find a function",
    "no suitable function", "function that suits",
    "couldn't find a tool", "could not find a tool", "tool that suits",
)


def _is_degenerate(text: str) -> bool:
    t = (text or "").strip()
    if len(t) < 15:
        return True
    low = t.lower()
    return any(m in low for m in _REFUSAL_MARKERS)


def _provider_search(queries, limit: int = 5) -> str:
    """Run searches directly through the registered provider and format the
    hits. Used to rescue agents that don't actually execute web_search. Never
    raises; returns '' when nothing usable comes back."""
    try:
        from agent.web_search_registry import get_active_search_provider
        provider = get_active_search_provider()
    except Exception:
        return ""
    if provider is None:
        return ""
    blocks = []
    for q in queries:
        try:
            res = provider.search(q, limit=limit)
        except Exception:
            continue
        if not isinstance(res, dict) or not res.get("success"):
            continue
        web = (res.get("data") or {}).get("web") or []
        if not web:
            continue
        lines = [f'Results for "{q}":']
        for it in web:
            lines.append(f"- {it.get('title','')} — {it.get('url','')}\n  {it.get('description','')}")
        blocks.append("\n".join(lines))
    return "\n\n".join(blocks)


def _preview(value, limit: int = 300) -> str:
    text = str(value)
    return text if len(text) <= limit else text[:limit] + "…"


def _final_text(result) -> str:
    """run_conversation returns a result dict on current Hermes — surface just
    the assistant text, not the repr of the whole envelope (which otherwise
    leaks into sitreps, ntfy bodies, and memory write-backs)."""
    if isinstance(result, dict):
        return str(result.get("final_response") or "").strip() or str(result)
    return result if isinstance(result, str) else str(result)


class HermesEngine:
    """Embeds a Hermes AIAgent as Jarvis Prime.

    Requires the hermes-agent package on the path:
      dev:    pip install -e C:\\Projects\\Hermes-agent
      docker: pip install git+https://github.com/NousResearch/hermes-agent@<ref>

    skip_memory / skip_context_files are deliberate for Phase 1 — Hermes
    memory comes online with the shared ChromaDB decision in Phase 3.
    """

    name = "hermes"

    def __init__(self, settings: Settings):
        self.settings = settings
        # Fleet tasks run concurrently and Hermes tools operate relative to
        # CWD — a per-run chdir would race. Pin the whole core process to the
        # sandbox once instead.
        settings.sandbox_root.mkdir(parents=True, exist_ok=True)
        os.chdir(settings.sandbox_root)
        # Workspace tools (PHASE-4.md §3) — registered once; the toolset's
        # check_fn hides it from agents when Odysseus isn't configured.
        from .odysseus_tools import register_odysseus_tools
        register_odysseus_tools(settings.odysseus_base_url, settings.odysseus_api_token)
        # Web search — Hermes registers search providers through its plugin
        # system, which the embedded-library path never runs, so the
        # researcher's web_search tool has no backend and errors out. Register
        # the SearXNG provider directly. No-op unless SEARXNG_URL is set.
        self._register_web_search()
        # Auxiliary LLM (context compression) — Hermes resolves the aux
        # provider from config.yaml which doesn't exist in the container.
        # Tell it to use the same "custom" endpoint (NVIDIA NIM) so the
        # "No auxiliary LLM provider configured" warning is silenced and long
        # research sessions get proper mid-turn summarisation.
        self._register_auxiliary()

    @staticmethod
    def _register_auxiliary() -> None:
        """Tell Hermes' auxiliary client to use the same NIM endpoint for
        context compression. Without this, Hermes searches for config.yaml
        (absent in the container) and emits a 'No auxiliary LLM provider
        configured' warning, then skips mid-turn summarisation on long runs."""
        model = os.getenv("JARVIS_MODEL", "").strip()
        if not model:
            return
        try:
            from agent.auxiliary_client import set_runtime_main
            set_runtime_main("custom", model)
        except Exception as exc:
            import logging
            logging.getLogger(__name__).debug(
                "Could not register auxiliary LLM provider: %s", exc)

    @staticmethod
    def _register_web_search() -> None:
        if not os.getenv("SEARXNG_URL", "").strip():
            return
        try:
            from agent.web_search_registry import register_provider
            from plugins.web.searxng.provider import SearXNGWebSearchProvider
            register_provider(SearXNGWebSearchProvider())
        except Exception as exc:  # hermes layout changed / plugin absent
            import logging
            logging.getLogger(__name__).warning(
                "SearXNG web search provider not registered: %s", exc)

    def complete(self, *, role, prompt: str) -> str:
        from run_agent import AIAgent  # lazy import — heavy

        agent = AIAgent(
            base_url=role.base_url or None,
            api_key=(os.environ.get(role.api_key_env, "") or None) if role.api_key_env else None,
            model=role.model,
            # No tools — planning + synthesis are pure text/JSON. With a toolset
            # present, nemotron fabricates "No Suitable Function" pseudo-calls
            # instead of answering, which corrupts the sitrep AND makes the
            # planner JSON unparseable (→ silent fallback to a prime-only plan).
            # `[]` (not None) yields zero tools; None would mean "all defaults".
            enabled_toolsets=[],
            max_iterations=3,
            max_tokens=1536,   # headroom so the sitrep doesn't truncate mid-report
            quiet_mode=True,
            skip_context_files=True,
            skip_memory=True,
            ephemeral_system_prompt=THINK_OFF,
        )
        return _final_text(agent.run_conversation(prompt))

    def run(self, *, mission: dict, role: RoleConfig, emit, approval_gate) -> EngineResult:
        from run_agent import AIAgent  # lazy import — heavy
        from .odysseus_tools import clear_thread_gate, set_thread_gate
        try:
            from tools.terminal_tool import set_approval_callback
        except ImportError:
            set_approval_callback = None

        # Install the commander gate on this worker thread before any tool
        # can run (pattern: tools/approval.py:732, delegate_tool.py).
        if set_approval_callback is not None:
            set_approval_callback(
                lambda command, description="", **kw: approval_gate(command, description, **kw)
            )
        # Same gate for the Odysseus workspace tools (thread-local;
        # PHASE-4.md §3.2).
        set_thread_gate(approval_gate)

        api_key = os.environ.get(role.api_key_env, "") if role.api_key_env else ""
        searched = {"web": False}

        def on_tool_start(call_id, name, args):
            if str(name) == "web_search":
                searched["web"] = True
            emit("tool.call", {"call_id": str(call_id), "tool": str(name),
                               "args_preview": _preview(args)})

        def on_tool_complete(call_id, name, args, result):
            emit("tool.result", {"call_id": str(call_id), "tool": str(name),
                                 "ok": True, "result_preview": _preview(result)})

        def on_delta(*args, **_kw):
            text = "".join(str(a) for a in args if isinstance(a, str))
            if text:
                emit("assistant.delta", {"text": text})

        def on_status(kind, message, *_a, **_kw):
            emit("agent.status", {"state": "acting", "detail": f"{kind}: {message}"})

        agent = AIAgent(
            base_url=role.base_url or None,
            api_key=api_key or None,
            model=role.model,
            enabled_toolsets=role.toolsets or None,
            max_iterations=role.max_iterations,
            quiet_mode=True,
            skip_context_files=True,
            skip_memory=True,
            # NB: do NOT force "detailed thinking off" on tool-using fleet
            # agents — with reasoning off, nemotron tends to narrate a tool call
            # as prose (`web_search(query=...)`) instead of emitting a real
            # call. Keep its native reasoning so tool calls actually fire.
            ephemeral_system_prompt=role.system_prompt or None,
            tool_start_callback=on_tool_start,
            tool_complete_callback=on_tool_complete,
            stream_delta_callback=on_delta,
            status_callback=on_status,
        )
        emit("agent.spawned", {"role": role.name, "model": role.model})
        try:
            text = _final_text(agent.run_conversation(mission["prompt"]))
        finally:
            clear_thread_gate()
        # Rescue: a web-capable agent that never actually executed a search
        # (nemotron sometimes narrates `web_search(query=...)` as prose). Run
        # the searches ourselves and have it write findings from real results.
        if not searched["web"] and role.toolsets and "web" in role.toolsets:
            rescued = self._rescue_research(role, mission, text, emit)
            if rescued:
                text = rescued
        # Rescue: empty output or a "no suitable function" refusal — nemotron
        # sometimes stalls on a reasoning task because it has tools but none
        # obviously fits. Retry once tool-free so it just reasons.
        if _is_degenerate(text):
            retried = self._rescue_degenerate(role, mission, emit)
            if retried and not _is_degenerate(retried):
                text = retried
        emit("assistant.message", {"text": text, "final": True})
        return EngineResult(ok=True, final_text=text)

    def _rescue_degenerate(self, role, mission, emit) -> str | None:
        from run_agent import AIAgent
        emit("agent.status", {"state": "acting", "detail": "retry: reasoning tool-free"})
        api_key = os.environ.get(role.api_key_env, "") if role.api_key_env else ""
        agent = AIAgent(
            base_url=role.base_url or None,
            api_key=api_key or None,
            model=role.model,
            enabled_toolsets=[],     # no tools → nothing to refuse over
            max_iterations=2,
            max_tokens=1536,
            quiet_mode=True, skip_context_files=True, skip_memory=True,
            ephemeral_system_prompt=role.system_prompt or None,
        )
        prompt = (
            f"{mission['prompt']}\n\nReason through this directly and answer in "
            f"full. You do not need any tool — do not say you cannot find a "
            f"function; just do the analysis."
        )
        try:
            return _final_text(agent.run_conversation(prompt))
        except Exception:
            return None

    def _rescue_research(self, role, mission, prior_text, emit) -> str | None:
        from run_agent import AIAgent
        queries = _NARRATED_QUERY.findall(prior_text or "")
        if not queries:
            first_line = (mission["prompt"].strip().splitlines() or [""])[0]
            queries = [first_line[:160]]
        queries = [q.strip() for q in queries[:3] if q.strip()]
        results = _provider_search(queries)
        if not results:
            return None
        # surface the rescued search so the UI/ledger shows research happened
        emit("tool.call", {"tool": "web_search", "rescued": True,
                           "args_preview": "; ".join(queries)[:200]})
        emit("tool.result", {"tool": "web_search", "ok": True,
                             "result_preview": _preview(results)})
        prompt = (
            f"{mission['prompt']}\n\nWEB SEARCH RESULTS (use these; do NOT say "
            f"no results were found):\n{results}\n\nWrite your FINDINGS from "
            f"these results — 3-8 bullets, each with its source URL."
        )
        api_key = os.environ.get(role.api_key_env, "") if role.api_key_env else ""
        agent = AIAgent(
            base_url=role.base_url or None,
            api_key=api_key or None,
            model=role.model,
            enabled_toolsets=[],        # results in hand — just write them up
            max_iterations=2,
            quiet_mode=True, skip_context_files=True, skip_memory=True,
            ephemeral_system_prompt=THINK_OFF,
        )
        try:
            return _final_text(agent.run_conversation(prompt))
        except Exception:
            return None
