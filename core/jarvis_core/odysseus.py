"""Thin, never-raising client for Odysseus's shared memory API (PHASE-3.md §1).

Disabled (a no-op) unless both base_url and api_token are configured, so the
rest of Core pays zero cost when Odysseus isn't wired up.

Uses Odysseus's token-scoped /api/codex/memory routes — the legacy
/api/memory/* routes are session-cookie-only and reject bearer tokens
("API tokens must use a scope-aware API route"). Odysseus has no
token-scoped search endpoint, so search fetches the owner's memory list
and ranks it client-side by keyword overlap; fine for a single-operator
store, revisit if it grows past a few thousand entries.
"""
from __future__ import annotations

import logging
import re

import httpx

logger = logging.getLogger(__name__)

_WORD = re.compile(r"[a-z0-9]+")

# Generic words carry no topical signal — without filtering them, two unrelated
# missions match on "research/market/product/the" and recall pulls in noise.
_STOPWORDS = frozenset("""
a an and are as at be by for from had has have how i if in into is it its of on
or that the this to was we with you your me my our they their them then there
want need full done get got make made turn use using via can could would should
do does over about new idea ideas into product market research analysis report
""".split())

# Odysseus's MemoryAddRequest validator silently coerces unknown categories
# to "fact", so only these are worth passing.
VALID_CATEGORIES = {"fact", "contact", "task", "preference", "identity", "project", "goal"}


def _score(query_words: set[str], text: str) -> int:
    return len(query_words & set(_WORD.findall(text.lower())))


class OdysseusClient:
    def __init__(self, base_url: str | None, api_token: str | None, timeout: float = 5.0):
        self._base_url = (base_url or "").rstrip("/")
        self._api_token = api_token or ""
        self._timeout = timeout

    @property
    def enabled(self) -> bool:
        return bool(self._base_url and self._api_token)

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self._api_token}"}

    def search_memory(self, query: str, max_items: int = 3, min_score: int = 2) -> list[str]:
        if not self.enabled or not query.strip():
            return []
        try:
            resp = httpx.get(
                f"{self._base_url}/api/codex/memory",
                headers=self._headers(),
                timeout=self._timeout,
            )
            resp.raise_for_status()
            memories = resp.json().get("memory", [])
            # Keep only topical words (drop stopwords + 1-2 char tokens) so a
            # match means a real subject overlap, not shared filler.
            query_words = {w for w in _WORD.findall(query.lower())
                           if len(w) > 2 and w not in _STOPWORDS}
            if not query_words:
                return []
            ranked = sorted(
                ((m.get("text", ""), _score(query_words, m.get("text", "")))
                 for m in memories),
                key=lambda pair: pair[1], reverse=True,
            )
            return [text for text, score in ranked[:max_items] if score >= min_score and text]
        except Exception:
            logger.debug("Odysseus search_memory failed", exc_info=True)
            return []

    # ── deep research (PHASE-4.md §2) ───────────────────────────────────────

    def start_research(self, query: str, max_time: int = 300, max_rounds: int = 0) -> str | None:
        """Launch a deep-research job. Returns the session_id, or None on any
        failure (disabled, unreachable, no LLM endpoint configured, ...)."""
        if not self.enabled or not query.strip():
            return None
        try:
            resp = httpx.post(
                f"{self._base_url}/api/codex/research",
                json={"query": query, "max_time": max_time, "max_rounds": max_rounds},
                headers=self._headers(),
                timeout=max(self._timeout, 15.0),
            )
            resp.raise_for_status()
            return resp.json().get("session_id") or None
        except Exception:
            logger.debug("Odysseus start_research failed", exc_info=True)
            return None

    def research_status(self, session_id: str) -> dict | None:
        if not self.enabled or not session_id:
            return None
        try:
            resp = httpx.get(
                f"{self._base_url}/api/codex/research/{session_id}",
                headers=self._headers(),
                timeout=self._timeout,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception:
            logger.debug("Odysseus research_status failed", exc_info=True)
            return None

    def cancel_research(self, session_id: str) -> bool:
        if not self.enabled or not session_id:
            return False
        try:
            resp = httpx.post(
                f"{self._base_url}/api/codex/research/{session_id}/cancel",
                headers=self._headers(),
                timeout=self._timeout,
            )
            resp.raise_for_status()
            return bool(resp.json().get("cancelled"))
        except Exception:
            logger.debug("Odysseus cancel_research failed", exc_info=True)
            return False

    def research_result(self, session_id: str) -> str | None:
        """Fetch the final markdown result (one-shot — Odysseus clears it)."""
        if not self.enabled or not session_id:
            return None
        try:
            resp = httpx.post(
                f"{self._base_url}/api/codex/research/{session_id}/result",
                headers=self._headers(),
                timeout=max(self._timeout, 15.0),
            )
            resp.raise_for_status()
            return resp.json().get("result") or None
        except Exception:
            logger.debug("Odysseus research_result failed", exc_info=True)
            return None

    def add_memory(self, text: str, category: str = "fact") -> bool:
        if not self.enabled or not text.strip():
            return False
        if category not in VALID_CATEGORIES:
            category = "fact"
        try:
            resp = httpx.post(
                f"{self._base_url}/api/codex/memory",
                # Odysseus's MemoryAddRequest caps text at 5000 chars (422 above it)
                json={"text": text[:5000], "category": category, "source": "jarvis-core"},
                headers=self._headers(),
                timeout=self._timeout,
            )
            resp.raise_for_status()
            return True
        except Exception:
            logger.debug("Odysseus add_memory failed", exc_info=True)
            return False
