# Risk Detection

## 1. Purpose

Defines the specific signal patterns that produce `risk` and `anomaly` kind recommendations in the Recommendation Engine, mirroring `Opportunity-Detection.md`'s framing for the opposite category. Formalizes what `buildRecommendations()` and the Executive Simulation Layer (`simulation.ts`) already rehearse for blocked missions and degraded tools in Beta-1.

## 2. Current State (Beta-1)

Two risk-shaped patterns already exist in simulation:

- A mission with simulated `isBlocked` produces a `risk` card naming the mission and noting it may miss its completion window.
- A tool with simulated `health !== "healthy"` produces an `anomaly` card naming the tool and its reported health state.
- The Executive Simulation Layer additionally tracks `isOverdue` missions and offline/blocked agents, which currently feed the Briefing Panel's highlights and the Decision Queue more directly than the Recommendation Centre — this document treats both as part of the same risk pattern family, available to whichever surface needs them.

## 3. Risk Pattern Library

- **Blocked progress** — a mission, task, or workflow step that has stopped advancing. Severity scales with how long it has been blocked and how much downstream work depends on it (per the Enterprise World Model's Impact Analysis blast radius).
- **Degraded runtime health** — a tool or agent reporting anything other than its normal healthy/available state. Severity scales with the criticality of what depends on that tool or agent (again, blast radius via Impact Analysis).
- **Policy proximity** — (Beta-2+, once real policy evaluation is wired into reasoning) an objective or command that received a `warn` from the Policy Gate is itself a risk signal worth surfacing proactively, not just passively recorded in the Executive Dashboard.
- **Schedule slippage** — a mission whose progress rate, extrapolated, will miss its expected completion window (`isOverdue` in Beta-1's simulation; a real velocity calculation in Beta-2+).
- **Silent failure** — an entity that stopped producing expected activity entirely (an agent that went offline with in-flight work, a tool that stopped being invoked when it normally would be) — distinct from an active failure signal, and harder to detect because the absence of a signal is the signal.

## 4. Severity And Escalation

Risk severity feeds directly into the escalation model already specified in the Jarvis Conversation Architecture §8: a risk whose severity crosses a threshold should escalate toward the Decision Queue's "waiting" status (requiring explicit user disposition) rather than sitting as a passive Recommendation Centre card. The mapping from "this is a risk" to "this requires a decision" is a severity threshold, not a different detection mechanism — both come from the same pattern library in §3.

## 5. Confidence

Unlike opportunity detection, most risk patterns are close to binary (a mission is blocked or it isn't), so confidence scoring here is less about "is this real" and more about "how severe is this" — the confidence field on a risk `RecommendationCard` should be read as a severity/urgency proxy, not a probability that the risk exists at all. This is a deliberate semantic difference from `Opportunity-Detection.md`'s confidence framing and should be documented clearly in any future UI tooltip or help text.

## 6. What Changes Across Versions

- **Beta-1**: Simulated boolean flags (`isBlocked`, `isOverdue`, unhealthy tool states) stand in for real detection.
- **Beta-2**: Real EventBus/dashboard data drives detection; policy proximity (§3) becomes available once real Policy Gate evaluation is reachable from the reasoning layer.
- **V1**: Silent-failure detection (the hardest pattern in §3) becomes practical once enough historical baseline exists (per `Memory-Strategy.md`) to know what "expected activity" looks like for a given entity.

## 7. Cross-References

- `docs/architecture/Recommendation-Engine.md` — the consumer of risk conclusions.
- `docs/architecture/Opportunity-Detection.md` — the mirror-image pattern library.
- `docs/architecture/Jarvis-Conversation-Architecture.md` §8 — escalation, which severity feeds.

## 8. Risks

- Treating risk confidence as a probability rather than a severity proxy (per §5) would misrepresent binary risk signals as uncertain when they are not, undermining trust in exactly the cases where Jarvis should sound most certain.
- Silent-failure detection without a solid historical baseline will produce false positives for any entity with naturally irregular activity patterns — this pattern should not be enabled until `Memory-Strategy.md`'s baseline data genuinely supports it.
