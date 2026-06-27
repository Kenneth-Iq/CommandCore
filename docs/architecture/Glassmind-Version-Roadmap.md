# Glassmind Version Roadmap

## 1. Purpose

Consolidates the phased approach already sketched in `docs/architecture/Glassmind-Architecture.md` §7 into a concrete, version-numbered roadmap tied to `docs/roadmap/Version-1.0-Master-Checklist.md`'s milestones, so "Phase 1/2/3" stops being an abstract sequence and becomes a set of dated, trackable commitments.

## 2. Roadmap

### v0.4 (current) — Documentation Only
Glassmind exists only as architecture: `Glassmind-Architecture.md` plus this document's companions (`Glassmind-Retrieval.md`, `Glassmind-Memory-Model.md`, `Glassmind-Ingestion.md`, `Glassmind-Workspace-Knowledge.md`, `Glassmind-Conversations.md`). No code. The frontend's `localStorage`-backed conversation log, watchlist, and pinned-conversations hooks are the simulated rehearsal of what Glassmind will eventually back, per `Glassmind-Conversations.md` §3.

### v0.5 — Phase 1 Foundation
Real durable storage for the memory categories `Memory-Strategy.md` already flagged as needing persistence: follow-ups, deferred decisions, waiting approvals, indexed conversation memory. Ingestion (`Glassmind-Ingestion.md`) goes live for the EventStore and explicit-action sources only — conversation-turn ingestion (the Jarvis source) waits until Beta-2's real conversation engine exists, since there is no real conversation engine to ingest from yet. Retrieval (`Glassmind-Retrieval.md`) supports working-memory and exact-reference lookup only; no scoped expansion, no similarity search.

### v0.6 — Phase 1 Completion
Conversation-turn ingestion goes live once the Beta-2 conversation engine is real, closing the gap `Glassmind-Conversations.md` §4 identifies (Jarvis can stop re-surfacing the same conclusion across sessions). Retrieval gains scoped expansion (§3 of `Glassmind-Retrieval.md`). The frontend's `localStorage` conversation log, watchlist, and pinned-conversations hooks migrate to real Glassmind-backed storage per the table in `Glassmind-Conversations.md` §3, preserving existing UI behavior through the transition.

### v0.7 — Phase 2 Foundation
Company memory becomes real: recurring pattern detection scoped per company/workspace/project, enforcing the isolation principle in `Glassmind-Workspace-Knowledge.md` §2 from day one (this boundary is far cheaper to build in than to retrofit). `Risk-Detection.md` and `Opportunity-Detection.md`'s pattern libraries gain real historical corroboration instead of single-snapshot heuristics.

### v0.8 — Phase 2 Completion
Knowledge memory becomes real, integrated with the Knowledge Centre's existing scope tags per `Glassmind-Workspace-Knowledge.md` §3. Deduplication and promotion (`Glassmind-Ingestion.md` §3, `Glassmind-Architecture.md` §5) are exercised against real accumulated data for the first time — this is the point at which corroboration counts and promotion thresholds should be tuned against real usage, not assumptions.

### v0.9 — Phase 3 Foundation
Vector memory becomes real. Retrieval's similarity fallback (`Glassmind-Retrieval.md` §3 step 4) activates, with the asynchronous "still thinking" handling specified in §5. This phase should not start earlier than v0.9 regardless of schedule pressure — Phases 1 and 2 are what make similarity search meaningful rather than noisy, per `Glassmind-Retrieval.md`'s own caution.

### v0.10 — Phase 3 Completion
Semantic memory becomes real, generalizing across company memory per `Glassmind-Memory-Model.md` §3's `supportingRecordIds` traceability requirement. Cross-scope patterns (`Glassmind-Workspace-Knowledge.md` §4) become possible for the first time, fully audited back to source.

### V1.0 — Integration Complete
Glassmind is the working memory and retrieval substrate behind every Jarvis statement, Nexus evidence link, and proactive recommendation. The `docs/roadmap/Version-1.0-Master-Checklist.md` Conversation and Testing rows reflect real coverage rather than simulated rehearsal.

## 3. Dependencies Across The Roadmap

- v0.6's conversation-turn ingestion depends on Beta-2's real conversation engine (tracked separately in `Jarvis-Conversation-Architecture.md`), not on Glassmind work itself — this is an external blocking dependency, not a Glassmind risk.
- v0.7's company memory depends on Authentication and Permissions existing in some form if company-scoped memory is ever per-user (per `Glassmind-Workspace-Knowledge.md` §6) — this dependency should be revisited once Multi-user is scoped.
- v0.9's vector memory has no hard technical dependency on earlier phases, but `Glassmind-Retrieval.md` §6's caution against starting it early is a deliberate sequencing choice, not a technical blocker.

## 4. Cross-References

- `docs/architecture/Glassmind-Architecture.md` §7 — the original three-phase sketch this roadmap replaces with dated detail.
- `docs/roadmap/Version-1.0-Master-Checklist.md` — the master tracker this roadmap's milestones should be reflected into as each version lands.

## 5. Risks

- This roadmap assumes roughly one Glassmind milestone per minor version; if other streams' work compresses or expands the version cadence, this document's version numbers should be relabeled, not silently ignored — a stale roadmap that nobody updates is worse than no roadmap.
- The biggest schedule risk is v0.6's dependency on the Beta-2 conversation engine landing on time — if that engine slips, conversation-turn ingestion should slip with it rather than being implemented against a still-changing conversation model.
