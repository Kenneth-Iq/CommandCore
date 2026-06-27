# Glassmind Retrieval

## 1. Purpose

Expands `docs/architecture/Glassmind-Architecture.md` §4's retrieval flow into a complete specification: how a query is formed, ranked, scored, and degraded gracefully when the ideal answer doesn't exist. This document exists because "retrieval" was previously described in five sentences; it needs a real algorithm before Phase 1 implementation begins.

## 2. Query Shape

Every retrieval request into Glassmind carries three things, never fewer:

- **Scope** — the entity or entities the query is about (a mission ID, a company ID, a conversation ID), matching the same `RouteSelection`-shaped scoping already used throughout Nexus.
- **Intent** — what kind of answer is wanted: a fact ("what happened last time"), a pattern ("does this recur"), or a disposition ("was this already decided"). This maps directly onto the three Reasoning Architecture stages — retrieval intent should mirror the conclusion the caller is trying to reach, not be a generic "search."
- **Recency bound** — how far back the caller is willing to look. A briefing pipeline asking "since yesterday" is a different query than Risk Detection asking "has this ever happened."

## 3. Retrieval Algorithm

1. **Working memory check** — cheapest, checked first. If the answer is already active in the current turn's working memory, return immediately with provenance pointing at the current conversation.
2. **Exact reference lookup** — query conversation, company, or knowledge memory by the scope's exact entity ID. This is the common case and should resolve in a single indexed lookup, not a scan.
3. **Scoped expansion** — if exact lookup misses, expand to the entity's immediate relationships (the same `RelationshipLink`/`ImpactAnalysis` graph Nexus already computes) before falling back further. A mission's memory should be findable via its project if the mission itself has no direct history yet.
4. **Similarity fallback** — only once vector memory is real (Phase 3 per the Architecture document) does a similarity search run, and only after exact and scoped lookups have both missed.
5. **Empty result is a valid result** — retrieval returning nothing is not an error state; it is information ("Glassmind has no memory of this") that the caller (Jarvis's reasoning pipeline) must be able to act on without inventing an answer.

## 4. Ranking And Scoring

When more than one memory matches a query, rank by, in order: scope specificity (an exact entity match beats a scope-expanded match), recency within the requested bound, and corroboration count (a fact backed by three independent prior observations outranks one backed by a single mention). Confidence returned to the caller is derived from this ranking, not assigned arbitrarily — consistent with `Reasoning-Architecture.md` §5's reproducibility requirement.

## 5. Latency Budget

Retrieval sits in the path of conversational response time, so it has a budget, not an unlimited search window. Working-memory and exact-reference lookups should resolve in the time it takes to query a single indexed table — effectively immediate. Scoped expansion may walk a small relationship graph and should stay bounded (the same blast-radius caps `ImpactAnalysis` already applies). Similarity search, once real, is the only stage allowed a larger budget, and it should run asynchronously with a graceful "still thinking" state rather than blocking the turn.

## 6. Degradation Rules

- If a query's scope cannot be resolved to a real entity, retrieval returns empty rather than guessing at a nearby entity — silent substitution is exactly the failure mode `Conversation-Evidence.md` warns against.
- If similarity search (once real) returns low-confidence matches only, those matches must be labeled as exploratory ("this might be related") rather than presented with the same confidence as an exact match.
- A retrieval result whose source memory has since been corrected or superseded must say so, not silently serve the stale version.

## 7. Cross-References

- `docs/architecture/Glassmind-Architecture.md` §4 — the originating retrieval flow this document expands.
- `docs/architecture/Reasoning-Architecture.md` — the consumer of every retrieval result.
- `docs/architecture/Conversation-Evidence.md` — the evidence/provenance contract retrieval results must satisfy.

## 8. Risks

- A retrieval algorithm that silently expands scope too aggressively (always falling back to "something related") will make Glassmind feel smarter than it is at the cost of accuracy — the explicit ordering in §3 exists specifically to prevent that shortcut.
- Without an enforced latency budget, similarity search in Phase 3 risks making every conversation turn feel slow the moment vector memory grows large — this should be load-tested before Phase 3 ships, not after.
