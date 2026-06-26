# Executive Briefing Pipeline

## 1. Purpose

Defines how Jarvis assembles the Morning Briefing, Afternoon Update, and Evening Summary already implemented in Beta-1's Executive Briefing Panel (`apps/nexus-console/src/executiveAssistant.ts`'s `buildBriefings()` and `resolveGreeting()`), and how that assembly should evolve as the underlying data moves from simulated to real.

## 2. Current State (Beta-1)

`resolveGreeting()` selects a period (morning / afternoon / evening) from the local clock; `buildBriefings()` produces all three briefings at once from current simulated state, and the UI highlights whichever period matches the current time while still showing all three for context. Each briefing has a `title`, a one-line `summary`, and a short list of `highlights`. There is no real scheduling — Beta-1 briefings are recomputed on every render from current state, not generated once at a fixed time and cached.

## 3. Pipeline Stages

1. **Trigger** — a period boundary (morning/afternoon/evening) or, in Beta-2+, an explicit time-based schedule (e.g., 8am, 1pm, 6pm in the user's configured timezone) rather than Beta-1's "whichever period matches right now."
2. **Aggregation** — pull the current state of missions, agents, tools, knowledge, and conversations (real dashboards in Beta-2+, simulation in Beta-1).
3. **Summarization** — condense aggregated state into the `title` + `summary` + `highlights` shape already locked by the UI. Summarization should prioritize what changed since the last briefing over restating the same unchanging facts — a briefing that says the same thing three times a day teaches the user to stop reading it.
4. **Evidence attachment** — every highlight should be capable of resolving to an evidence link (per `Conversation-Evidence.md`) if the user asks "show me," even if the briefing card itself doesn't render a button for every line.
5. **Delivery** — rendered in the Executive Briefing Panel and logged into the Briefing & Conversation Timeline (`buildTimeline()`), so a briefing is both a momentary surface and a permanent record.

## 4. Cadence And Change-Awareness

A real (Beta-2+) briefing pipeline must be change-aware: the afternoon update should foreground what happened since the morning briefing, not recompute the same snapshot from scratch. This requires the pipeline to retain the previous briefing's key figures (mission counts, blocked counts, etc.) as a comparison baseline — a small but real piece of state the Beta-1 simulation does not need (it has no "since last time" because everything is recomputed live), but which Beta-2 must introduce deliberately.

## 5. Relationship To Recommendations And Decisions

Briefings are a digest, not the primary surface for any single risk or opportunity — those belong in the Recommendation Centre and Decision Queue respectively. A briefing's `highlights` should summarize counts and point at the Recommendation Centre / Decision Queue for detail ("3 missions need attention — see Recommendations") rather than duplicating full recommendation content inline. This keeps the briefing skimmable, consistent with the Experience Vision's "calm under load" design language.

## 6. What Changes Across Versions

- **Beta-1**: Stateless recomputation on every render; no real cadence; no "since last time" comparison.
- **Beta-2**: Real scheduled generation (possibly server-side, possibly client-triggered at period boundaries), with a retained baseline for change-aware summarization, sourced from real EventBus/dashboard data.
- **V1**: Briefings may become genuinely personalized (weighted toward what this specific user has been working on, per their conversation history and watchlist) rather than a single canonical summary for any user — but the three-period cadence and the digest-not-detail principle (§5) remain.

## 7. Cross-References

- `docs/architecture/Jarvis-Conversation-Architecture.md` §3, §9, §10 — Jarvis-initiated conversation, notification rules, and lifecycle, which briefings are a scheduled instance of.
- `docs/architecture/Recommendation-Engine.md`, `docs/architecture/Memory-Strategy.md` — the detail surfaces briefings point toward.
- `docs/runbooks/Nexus-Beta-1-Demo-Walkthrough.md` — where briefing behavior should be exercised during review.

## 8. Risks

- Without a retained baseline, every briefing in Beta-2+ risks feeling identical to the last, which is the single fastest way to make users stop reading Jarvis's proactive output — directly against the Experience Vision's "the right Jarvis speaks rarely, but every time it does, the user is glad it did."
- Briefings that inline full recommendation/decision detail instead of summarizing and pointing outward will grow unboundedly long over time as the organization's data grows — the digest principle in §5 is also a scalability safeguard, not just a UX preference.
