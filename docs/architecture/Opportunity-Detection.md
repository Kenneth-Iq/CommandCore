# Opportunity Detection

## 1. Purpose

Defines the specific signal patterns that produce `opportunity` and `trend` kind recommendations in the Recommendation Engine, contrasting with `Risk-Detection.md`'s patterns. Formalizes what `buildRecommendations()` already rehearses for newly-linked knowledge and rising growth trends in Beta-1.

## 2. Current State (Beta-1)

Two opportunity-shaped patterns already exist in simulation:

- A knowledge asset that was `recentlyLinked` (simulated) produces an `opportunity` card: "a new relationship was formed around this asset — worth reviewing for follow-on value."
- A knowledge asset whose simulated `growthTrend` is `rising` produces a `trend` card noting rising relationship activity.
- An agent with simulated `idle` activity produces an `efficiency` card (capacity available, not currently a risk, but worth acting on) — efficiency and opportunity are closely related kinds and may share detection logic.

## 3. Opportunity Pattern Library

Patterns this document defines as the canonical (non-exhaustive, extensible) opportunity signal set:

- **Underused capacity** — an agent or tool with availability and a matching capability that isn't currently assigned to anything, where queued or blocked work exists elsewhere that it could address. This is the mirror image of a risk (a blocked mission) and an opportunity (spare capacity) being two views of the same underlying state — the engine should be able to surface both from one observation.
- **Knowledge relationship growth** — an asset gaining links faster than its historical rate, suggesting it's becoming a hub worth the user's attention (e.g., for governance, for reuse, for citation in a briefing).
- **Recurring success patterns** — a capability or agent with an unusually high completion rate on a given mission type, suggesting it could be applied more broadly. This pattern requires historical comparison (see `Memory-Strategy.md`) and is not buildable from a single point-in-time snapshot, unlike most Beta-1 simulated patterns.
- **Conversation-to-knowledge conversion** — a conversation thread that touches on a topic with no corresponding knowledge asset yet, suggesting an opportunity to capture institutional knowledge before it's lost in chat history.

## 4. Detection Requires Comparison, Not Just Snapshot

Unlike most risk patterns (which can often be detected from current state alone — a mission is blocked right now), several real opportunity patterns require a baseline to compare against (growth, recurring success, underused capacity relative to demand). This means Opportunity Detection depends more heavily on the Memory Strategy's retained history than Risk Detection does, and should not be implemented as if it were equally snapshot-driven.

## 5. Confidence And Evidence

Opportunity confidence should weigh the strength of the trend (how much above baseline) and the corroboration across multiple weak signals (e.g., both rising knowledge links and increased conversation activity pointing at the same topic). Every opportunity recommendation still requires a resolvable evidence link per `Conversation-Evidence.md` — an opportunity that can't be pointed at is not actionable and should not ship.

## 6. What Changes Across Versions

- **Beta-1**: Simulated `recentlyLinked`/`growthTrend` flags stand in for real trend detection.
- **Beta-2**: Real historical comparison against EventStore-derived baselines (per `Memory-Strategy.md`), still rule-based and inspectable.
- **V1**: Pattern detection may incorporate real statistical or learned trend detection, but the four-pattern library in §3 remains the starting taxonomy to extend, not replace wholesale.

## 7. Cross-References

- `docs/architecture/Recommendation-Engine.md` — the consumer of opportunity conclusions.
- `docs/architecture/Risk-Detection.md` — the mirror-image pattern library.
- `docs/architecture/Memory-Strategy.md` — the historical baseline opportunity detection depends on.

## 8. Risks

- Opportunity detection is more prone to false positives than risk detection (a rising trend may just be noise), so confidence scoring needs to be more conservative here, not equally weighted with risk signals which tend to be more binary (blocked or not).
- Surfacing too many "opportunities" dilutes the ones that matter — the Recommendation Engine's cap-and-rank discipline (§4 of that document) is especially important for this category.
