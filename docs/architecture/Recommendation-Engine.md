# Recommendation Engine

## 1. Purpose

Defines the engine behind Jarvis's proactive Recommendation Centre (risks, opportunities, anomalies, efficiencies, trends), formalizing what `apps/nexus-console/src/executiveAssistant.ts`'s `buildRecommendations()` already rehearses in simulation for Beta-1. Consumes the Reasoning Architecture's evaluated conclusions; produces the `RecommendationCard` shape already implemented in the UI.

## 2. Current State (Beta-1)

`buildRecommendations()` derives a small, capped list of cards from simulated mission/agent/tool/knowledge state, each with a `kind` (risk / opportunity / anomaly / efficiency / trend), a deterministic pseudo-random `confidence`, a list of `affectedSystems`, and a mandatory `evidence` link into Nexus. The Recommendation Centre component renders these as cards with an "Open Nexus" button. This is the real UI; the data behind it is simulated.

## 3. Recommendation Shape (Already Locked By The UI)

```text
RecommendationCard {
  id
  kind: risk | opportunity | anomaly | efficiency | trend
  title
  detail
  confidence: 0-100
  affectedSystems: string[]
  evidence: { label, page, selection }
}
```

This shape should not change without updating the Recommendation Centre UI in lockstep — the engine and its presentation are specified together, not independently, because a recommendation with no evidence link is not a recommendation this product can trust (see `Conversation-Evidence.md`).

## 4. Engine Responsibilities

- **Generation** — pull candidate conclusions from the Reasoning Architecture's evaluation stage, one per detected pattern (see `Risk-Detection.md`, `Opportunity-Detection.md`).
- **Scoring** — assign confidence based on signal strength and corroboration (multiple independent signals pointing the same way score higher than one). In Beta-1 this is a placeholder; in Beta-2+ it must be derived from real signal counts, not cosmetic.
- **Deduplication** — the same underlying issue (e.g., a single blocked mission) should not produce multiple overlapping recommendation cards across kinds; one issue, one card, the same dedup principle already specified for notifications in the Jarvis Conversation Architecture §9.
- **Ranking and capping** — recommendations are capped to a small, reviewable count (Beta-1 caps at roughly 4–5 cards), highest-confidence and highest-impact first, never an unbounded feed.
- **Affected-systems resolution** — `affectedSystems` is derived from the same relationship data the Enterprise World Model already computes (Impact Analysis's blast radius), not a separately maintained list.

## 5. Relationship To Decision Queue And Briefings

A recommendation is not automatically a decision. Some recommendations are purely informational (trends, low-stakes efficiencies); others warrant entry into the Decision Queue (per `Memory-Strategy.md`) when they require explicit user disposition. The engine's `kind` field is a hint for downstream routing, not the decision itself — that routing logic belongs to the Executive Briefing Pipeline and Decision Queue, not the Recommendation Engine.

## 6. What Changes Across Versions

- **Beta-1**: Patterns are hardcoded against simulated flags; confidence is cosmetic.
- **Beta-2**: Patterns run against real EventBus/dashboard data; confidence is signal-derived; recommendations that imply a possible action (not just an observation) can link forward into a draft Command per the Write Capability Architecture, but the engine itself never executes anything.
- **V1**: Pattern detection may use real inference rather than fixed rules, but the `RecommendationCard` shape, the mandatory evidence link, and the cap-and-rank discipline remain unchanged.

## 7. Cross-References

- `docs/architecture/Reasoning-Architecture.md` — upstream evaluation this engine consumes.
- `docs/architecture/Conversation-Evidence.md` — the evidence requirement every card must satisfy.
- `docs/architecture/Risk-Detection.md`, `docs/architecture/Opportunity-Detection.md` — pattern libraries.
- `docs/architecture/Memory-Strategy.md` — how a recommendation becomes a tracked decision.

## 8. Risks

- An unbounded or unranked recommendation feed becomes noise, violating the Experience Vision's notification guardrail (§11) just as surely as unbounded Jarvis-initiated conversations would.
- Recommendations without a real confidence model in Beta-2+ risk training operators to ignore the confidence value entirely, making it decorative rather than useful — confidence must be retired or made real, never left permanently cosmetic past Beta-1.
