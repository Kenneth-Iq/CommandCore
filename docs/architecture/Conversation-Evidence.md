# Conversation Evidence Model

## 1. Purpose

Expands the Evidence Links requirement from `docs/architecture/Jarvis-Conversation-Architecture.md` §5 into a complete model: what evidence is, how it is structured, how it is validated before something ships to the user, and how every Beta-1 simulated surface (Jarvis Conversation Panel, Recommendation Centre, Decision Queue, briefings, timeline) already implements this shape today.

## 2. Current State (Beta-1)

Every UI surface that makes a claim already carries an evidence link, structurally:

```text
EvidenceLink { label: string; page: NavPage; selection?: RouteSelection }
```

This exact type (`apps/nexus-console/src/executiveAssistant.ts`) is reused by `RecommendationCard.evidence`, `DecisionItem.evidence`, `FollowUpItem.evidence`, and the Jarvis Conversation Panel's reply `route`. There is one evidence shape in the codebase, not several — this document exists to keep it that way as the system grows.

## 3. What Counts As Evidence

Evidence is a `(page, selection)` pair that, when followed, shows the user the actual Nexus record(s) backing a claim — not a generic page, the specific record. "You have 3 missions that need attention" is not evidenced by a link to Mission Centre's default view; it is evidenced by a link that lands on (at minimum) the first of those three missions, exactly as the existing Relationship Card / Dependency Graph / Relationship Explorer route-chip pattern already works throughout Nexus.

A statement with no resolvable evidence link should not be made. This is stricter than "nice to have a link" — per the Jarvis Conversation Architecture §5, Jarvis should prefer saying less over saying something unverifiable.

## 4. Evidence Validation Pipeline

Before a conclusion (from the Reasoning Architecture) becomes a user-facing statement, card, or briefing line, it passes an evidence check:

1. **Resolution** — can the conclusion's subject (a mission, agent, tool, knowledge asset, conversation, workspace, company, or project) be resolved to a real entity in the current world data?
2. **Selection construction** — can a `RouteSelection` be built that, when navigated, lands on that specific entity's detail view (not just its list page)?
3. **Reject or degrade** — if resolution fails, the conclusion is either dropped entirely or degraded to a page-level (not record-level) link with explicitly weaker framing ("something in Tool Centre may need attention" rather than naming a specific tool) — never silently upgraded to sound more specific than the evidence supports.

## 5. Evidence Across Conversation Memory

Per `Memory-Strategy.md`, conversations, decisions, and follow-ups are persisted. Evidence links persist with them — a decision in the Decision Queue from three days ago must still resolve to working evidence when reviewed later, which means evidence links should reference stable entity identifiers (mission IDs, agent IDs, etc.), never positional or time-relative references ("the third mission in this morning's list") that stop making sense once state has moved on.

## 6. What Changes Across Versions

- **Beta-1**: Evidence links are constructed directly from simulated/seeded data already in memory; validation is implicit (the data either exists or the card/line is simply never generated).
- **Beta-2**: Evidence links must remain valid against real, changing CommandCore state — an entity referenced in a briefing this morning may be gone or changed by the time the user clicks through, and the evidence pipeline must handle "this record no longer matches" gracefully (showing a "no longer available" state, exactly as the existing `detail-empty-state` pattern already does for stale URL selections).
- **V1**: No structural change — the evidence model does not get more permissive as Jarvis gets smarter. If anything, real intelligence increases the risk of plausible-sounding but unverifiable claims, making strict evidence validation more important, not less.

## 7. Cross-References

- `docs/architecture/Jarvis-Conversation-Architecture.md` §5 — the originating requirement.
- `docs/architecture/Reasoning-Architecture.md` §5 — "every conclusion is explainable," which evidence operationalizes.
- `docs/architecture/Recommendation-Engine.md` — the primary structured consumer of this model.
- `docs/architecture/Memory-Strategy.md` — evidence persistence across time.

## 8. Risks

- The single biggest risk to this model is a future contributor adding a new proactive surface that invents its own ad hoc "source" or "reference" field instead of reusing `EvidenceLink` — this document and the existing shared type should be the first thing checked before any new evidence-bearing UI ships.
- Evidence that degrades silently (showing a confident-sounding statement after failing resolution) is worse than no evidence at all, because it looks trustworthy while being wrong.
