# Notification Orchestration

## 1. Purpose

Expands `docs/architecture/Jarvis-Conversation-Architecture.md` §9 (Notification Rules) into a full orchestration spec: how individual signals from Reasoning, the Recommendation Engine, and Memory Strategy's aging items get combined, timed, and routed into the right surface — a briefing, a proactive conversation, a Decision Queue entry, or nothing at all.

## 2. Current State (Beta-1)

There is no real orchestration yet: Beta-1's briefings, recommendations, decision queue, and follow-ups are each independently computed from the same simulated state on every render, with informal caps (a handful of cards, a handful of decisions) standing in for the significance filtering this document specifies. The Jarvis Conversation Panel's proactive briefing cards are the closest thing to "notification" Beta-1 has, and they are static per render, not actually time-orchestrated.

## 3. Orchestration Responsibilities

1. **Intake** — every candidate signal (a Reasoning Architecture conclusion, a Recommendation Engine card, an aging Memory Strategy item) enters a single intake point rather than each surface independently deciding what to show.
2. **Significance scoring** — reuses the Jarvis Conversation Architecture §9 threshold model: severity, blast radius (via Impact Analysis), and relevance to what the user is currently working on.
3. **Deduplication** — the same underlying issue must not produce a briefing highlight, a Recommendation Card, and a proactive conversation all separately; orchestration is what prevents that triplication, by tracking which underlying entity/issue has already been surfaced and through which channel.
4. **Batching** — multiple low-urgency signals in a short window collapse into one digest entry (typically a briefing highlight) rather than arriving as separate interruptions, exactly as already specified for Jarvis-initiated conversation.
5. **Routing** — a decision, for each surviving signal, about which surface it belongs on: a proactive conversation (high urgency, needs attention now), a briefing highlight (notable but not urgent), a Recommendation Card (actionable but not requiring immediate disposition), or a Decision Queue entry (requires an explicit user decision).

## 4. Routing Decision Table

| Signal Severity | Time Sensitivity | Routes To |
| --- | --- | --- |
| High | Immediate | Jarvis-initiated conversation |
| High | Not immediate | Decision Queue (waiting) + next briefing highlight |
| Medium | Any | Recommendation Centre card |
| Low | Any | Next briefing highlight only, or suppressed if already shown recently |

This table is a starting heuristic, not a fixed formula — it should be tunable as real usage reveals what users actually consider worth an interruption versus a footnote, per the risk already called out in the Jarvis Conversation Architecture §12 (notification tuning will need real iteration).

## 5. Aging And Re-Surfacing

Per `Memory-Strategy.md` §5, a deferred or unresolved item that ages past a threshold should resurface, but not as if it were new — orchestration must mark it as a re-surfaced item ("this has been waiting 3 days") rather than presenting it identically to a fresh signal, so the user can distinguish genuinely new information from a reminder.

## 6. What Changes Across Versions

- **Beta-1**: No real orchestration; informal per-surface caps simulate the effect without the mechanism.
- **Beta-2**: Real intake/scoring/dedup/batching/routing against live EventBus signals, with the routing table in §4 as a configurable starting policy.
- **V1**: Routing may become personalized per user (what this specific executive treats as urgent) rather than one global policy, but the five orchestration responsibilities in §3 remain the same regardless of how personalized the scoring becomes.

## 7. Cross-References

- `docs/architecture/Jarvis-Conversation-Architecture.md` §9 — the originating notification rules.
- `docs/architecture/Recommendation-Engine.md` — one of the routing destinations.
- `docs/architecture/Memory-Strategy.md` — the aging/re-surfacing source this orchestration also handles.
- `docs/architecture/Executive-Briefing-Pipeline.md` — the digest destination for batched low-urgency signals.

## 8. Risks

- Without real deduplication, the same underlying issue appearing in three places (briefing, recommendation, proactive conversation) will feel like noise even though each individual surface is, in isolation, behaving correctly — this is an integration risk, not a per-surface bug, and is exactly why this document exists as connective tissue rather than leaving each surface to filter independently.
- A routing table that is too aggressive toward "Jarvis-initiated conversation" recreates the over-notification risk the Experience Vision warns against; a table too conservative makes Jarvis feel passive. Both failure modes are equally real and the table in §4 should be reviewed against actual usage, not treated as permanently correct on first guess.
