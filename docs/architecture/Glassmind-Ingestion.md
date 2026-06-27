# Glassmind Ingestion

## 1. Purpose

`docs/architecture/Glassmind-Architecture.md` specifies what Glassmind remembers and how it is retrieved, but not how memories get created in the first place. This document defines ingestion: what triggers a write, how duplicates are avoided, and which CommandCore/Nexus/Jarvis surfaces are allowed to write into Glassmind at all.

## 2. Ingestion Sources

Three sources, and only three — Glassmind does not ingest from anywhere else:

- **CommandCore EventStore** — the primary source. Mission completions, agent assignment failures, tool health transitions, and similar events are the raw material company memory and knowledge memory are built from. Glassmind subscribes to relevant event types rather than polling.
- **Jarvis conversation turns** — per `Glassmind-Conversations.md`, completed conversation turns (a question asked, a conclusion given, evidence shown) become conversation memory entries once Beta-2's real conversation engine exists.
- **Explicit user action** — pinning a conversation, adding something to a watchlist, or otherwise explicitly marking something as worth remembering (the same `usePinnedConversations`/`useWatchlist` pattern already used in the frontend) is a direct, high-confidence ingestion signal — explicit marks should be weighted higher than passively observed patterns.

Nothing else writes to Glassmind. In particular, Nexus's read-only dashboards never become an ingestion source on their own — viewing a record is not the same as the system judging it memorable.

## 3. Ingestion Pipeline

1. **Trigger** — an event arrives from one of the three sources in §2.
2. **Relevance filter** — not every event is worth remembering. A routine, expected-outcome event (a mission completing on schedule with no anomalies) is lower ingestion priority than one a real reasoning step already flagged as a risk or opportunity (per `Risk-Detection.md` / `Opportunity-Detection.md`). Ingestion should reuse the Recommendation Engine's existing significance filtering rather than inventing a second threshold model.
3. **Deduplication** — before writing, check whether an equivalent memory (same scope, same pattern) already exists. If so, increment `occurrenceCount` on the existing company-memory record rather than writing a new one — this is what makes corroboration counts in `Glassmind-Memory-Model.md` §3 meaningful instead of inflated by repeated near-identical writes.
4. **Write** — a `MemoryRecord` is created with full provenance (`sourceReference` always populated, per the Memory Model's non-negotiable rule).
5. **Promotion check** — per Architecture §5, a freshly ingested memory does not automatically become long-term; it is evaluated for promotion only after corroboration or explicit marking.

## 4. Rate And Volume Considerations

Ingestion from the EventStore could in principle fire on every event in the system. It must not. The relevance filter in §2 step 2 is the primary volume control — Glassmind should ingest a small, judged subset of events, not a full event mirror. If ingestion volume ever approaches "most events get written," that is a signal the relevance filter has failed, not that Glassmind needs a bigger store.

## 5. What Happens On Ingestion Failure

If an event arrives that the relevance filter cannot confidently classify, the safe default is to not ingest it rather than ingest it speculatively — an under-remembered Glassmind degrades gracefully (per `Glassmind-Retrieval.md` §6, "no memory" is a valid, honest answer); an over-remembered one full of noise actively undermines trust by surfacing low-value "memories" that have no real significance behind them.

## 6. Cross-References

- `docs/architecture/Glassmind-Memory-Model.md` — the schema every ingested record must conform to.
- `docs/architecture/Recommendation-Engine.md` §4 — the significance filtering ingestion reuses.
- `docs/architecture/Glassmind-Conversations.md` — conversation-turn ingestion specifically.

## 7. Risks

- The biggest risk to this pipeline is scope creep on §2's source list — the moment some other surface (a third-party integration, a future automation) is allowed to write into Glassmind without going through the same relevance filter and provenance requirement, the "glass" half of Glassmind's promise (full traceability) breaks quietly.
- Deduplication that is too aggressive (collapsing genuinely distinct incidents into one inflated corroboration count) would make company memory's pattern detection overconfident — the dedup key (§3 step 3) should match on scope *and* pattern, not scope alone.
