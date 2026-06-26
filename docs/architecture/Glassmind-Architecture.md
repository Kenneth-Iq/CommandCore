# Glassmind Architecture

## 1. Purpose

Glassmind is the memory and retrieval substrate underneath Jarvis. Where `docs/architecture/Memory-Strategy.md` specified *what* Jarvis needs to remember (previous discussion topics, pending follow-ups, deferred decisions, waiting approvals) and `docs/architecture/Reasoning-Architecture.md` specified *how* Jarvis turns observations into conclusions, neither document specifies *where any of that actually lives* or *how it is recalled*. Glassmind is that system. The name is deliberate: a "glass" mind is a transparent one — every memory Glassmind holds must be inspectable and traceable back to its source, never an opaque embedding nobody can explain. This directly continues `docs/architecture/Conversation-Evidence.md`'s requirement that every Jarvis statement be explainable.

Glassmind was listed as an unscoped Version 1.0 tracking category in `docs/roadmap/Version-1.0-Master-Checklist.md`; this document is its first defining architecture.

## 2. Responsibilities

- Own durable storage for every memory category specified in `Memory-Strategy.md` (conversation history, follow-ups, deferred decisions) plus the categories specific to Glassmind's own internal organization (below).
- Provide a retrieval interface that Jarvis's reasoning pipeline (`Reasoning-Architecture.md` §3, the "Observation" stage) calls into, rather than each consumer querying CommandCore registries directly for historical context.
- Maintain the boundary between *what CommandCore knows right now* (registries, runtimes — live, authoritative, not Glassmind's to own) and *what has been remembered about it over time* (Glassmind's actual domain). Glassmind never becomes a second source of truth for current state; it is a record of what mattered, when, and why.
- Enforce the evidence requirement from `Conversation-Evidence.md` at the storage layer: a memory written without a resolvable source reference should be rejected at write time, not caught later by a UI-side check.

## 3. Memory Ownership

Glassmind organizes memory into seven kinds. These are not separate databases by necessity, but they are separate *concerns*, and any implementation must keep them distinguishable:

- **Working memory** — the active context of a single in-progress conversation turn: what was just asked, what is currently being resolved. Short-lived, cleared once a turn resolves into a conclusion or a stored memory.
- **Conversation memory** — the persisted record of conversation turns, matching the existing CommandCore Conversation/Thread/Message model (`Jarvis-Conversation-Architecture.md` §4). Glassmind does not duplicate this store; it indexes it for retrieval.
- **Company memory** — durable facts and patterns scoped to a specific company/workspace/project in the Enterprise World Model: recurring risk patterns, past decisions, prior outcomes for that scope specifically. This is what lets a briefing say "this is the third time this quarter" instead of treating every signal as if the organization has no history.
- **Knowledge memory** — the relationship between Glassmind and the Knowledge Centre's assets: which assets have been cited, when, and in what reasoning context, distinct from the assets themselves (which CommandCore's Knowledge registry owns).
- **Vector memory** — embedding-based similarity storage, used for "have we seen something like this before" retrieval rather than exact-match lookup. This is the one memory kind with no Beta-1/Beta-2 simulated equivalent; it does not become real until Phase 3 (§6).
- **Semantic memory** — generalized facts and relationships abstracted away from any single conversation or event ("agents with capability X tend to be assigned to missions of type Y"). Built from patterns across company and knowledge memory, not stored independently from the start.
- **Long-term memory** — the subset of all the above that survives indefinitely rather than being pruned. Long-term promotion is a deliberate operation (see §5), not the default fate of every memory.

## 4. Retrieval Flow

1. **Query formation** — a consumer (Jarvis's reasoning pipeline, a briefing pipeline, the Recommendation Engine) asks Glassmind a scoped question: about an entity, a time window, or a topic — never an unscoped "tell me everything."
2. **Working-memory check** — if the answer is already in the active turn's working memory, return it directly; no need to reach further.
3. **Indexed lookup** — conversation, company, and knowledge memory are queried by exact reference (entity ID, conversation ID) wherever possible, matching `Conversation-Evidence.md`'s preference for record-level over page-level evidence.
4. **Similarity fallback** — only when exact lookup is insufficient does vector memory get consulted, and only once vector memory is real (Phase 3). Until then, retrieval is reference-based only — which is consistent with Beta-1/Beta-2 having no semantic search anywhere else in the product either.
5. **Response with provenance** — every retrieval result carries the source memory's origin (which conversation, which decision, which event) so the consumer can build a `Conversation-Evidence.md`-compliant evidence link from it, never a bare fact with no traceable origin.

## 5. Memory Lifecycle And Promotion

A memory is not retained forever by default. Working memory clears at the end of a turn. Conversation memory persists per the Conversation model's own retention rules. Company, knowledge, and semantic memory require an explicit promotion step — something becomes long-term only when it has been corroborated more than once (the same pattern recurring) or explicitly marked important by a user action (pinning, watchlist entry, per `operatorPrefs.ts`'s existing watchlist hook). This prevents long-term memory from silently accumulating every transient observation Jarvis ever made.

## 6. Interaction With Other Systems

- **Jarvis** — the primary consumer. Every stage of the Reasoning Architecture that needs historical context (not just current state) calls into Glassmind rather than re-deriving it.
- **CommandCore** — the source of truth for current state and the conversation/event/audit stores Glassmind indexes. Glassmind reads from CommandCore's registries and EventStore; it never writes back to them — that boundary mirrors the dashboard services' strict read-only discipline already enforced elsewhere in CommandCore.
- **Nexus** — the evidence layer (`Evidence-Explorer`, `Conversation-Evidence.md`) surfaces Glassmind-backed memories the same way it surfaces any other evidence: as a resolvable link into a real record, never a black-box "Jarvis remembers this" claim.
- **Odysseus** — when multi-agent planning intelligence is eventually scoped, it will need historical outcome data (which plans worked, which didn't) — that is company/semantic memory Glassmind owns, not something Odysseus should maintain independently.
- **Hermes** — tool execution history relevant to "has this tool been reliable" reasoning belongs in Glassmind's company memory, sourced from Hermes's execution records once Hermes itself is architected.

## 7. Future Implementation Phases

- **Phase 1 (Beta-2)** — Glassmind exists only as durable storage for the memory categories `Memory-Strategy.md` already specifies as needing real persistence (follow-ups, deferred decisions, waiting approvals) plus indexed retrieval over the existing Conversation model. No vector memory, no semantic memory yet.
- **Phase 2 (post-Beta-2)** — Company memory becomes real: recurring pattern detection across a scoped company/workspace/project, feeding `Opportunity-Detection.md` and `Risk-Detection.md`'s pattern libraries with actual historical corroboration instead of single-snapshot heuristics.
- **Phase 3 (V1)** — Vector memory and semantic memory become real, enabling similarity-based retrieval ("has something like this happened before") and generalized pattern recall. This phase should not start until Phases 1 and 2 have produced enough real historical data for similarity search to be meaningful rather than noisy.

## 8. Non-Negotiable Properties

- Every memory Glassmind returns must be traceable to a source record — no memory is ever invented or summarized away from its provenance.
- Glassmind is never a write path into CommandCore. It remembers; it does not act.
- Glassmind's confidence in a retrieved memory should degrade visibly over time and with weak corroboration, not be presented as uniformly certain regardless of how it was derived — consistent with `Reasoning-Architecture.md` §5's explainability requirement.
