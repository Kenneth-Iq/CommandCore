# Reasoning Architecture

## 1. Purpose

Defines how Jarvis goes from raw operational signals to a conclusion worth saying out loud. This document specializes the turn-resolution model already defined in `docs/architecture/Jarvis-Conversation-Architecture.md` §2 (query / navigation / command) into the actual reasoning steps behind it, and underpins the Recommendation Engine, Opportunity Detection, and Risk Detection documents that consume its output.

## 2. Current State (Beta-1)

The Beta-1 Jarvis Conversation Panel and Executive Assistant surfaces (`apps/nexus-console/src/executiveAssistant.ts`) implement reasoning as deterministic rule evaluation over simulated operational state: a mission is "at risk" if a simulated flag says `isBlocked`, an agent is "inefficient to leave idle" if its simulated activity is `idle`, and so on. There is no inference, no weighing of competing signals, and no learning — this is reasoning in the narrowest sense: if-this-then-that over already-computed flags.

## 3. Reasoning Pipeline

Three stages, present even in Beta-1's simplest form and unchanged in shape through V1:

1. **Observation** — raw state is read from CommandCore's dashboards (missions, agents, tools, knowledge, conversations) or, in Beta-1, the simulated overlay in `simulation.ts`.
2. **Evaluation** — observations are scored against known patterns (see Risk Detection and Opportunity Detection documents for the specific patterns). Evaluation produces a candidate conclusion with an attached confidence value and evidence link, never a bare conclusion.
3. **Filtering** — not every evaluated conclusion is worth surfacing. Filtering applies the same significance threshold defined in the Jarvis Conversation Architecture's Notification Rules (§9) before a conclusion becomes a Recommendation Card, briefing highlight, or proactive conversation.

## 4. What Changes Across Versions

- **Beta-1**: Evaluation is hardcoded rule matching against simulated flags (`isBlocked`, `health !== "healthy"`, `growthTrend === "rising"`). Confidence values are deterministic pseudo-random numbers for UI rehearsal purposes, not real probability estimates.
- **Beta-2**: Evaluation runs against real EventBus signals and real dashboard data instead of simulation. Rules remain explicit and inspectable — no opaque model is introduced. Confidence values become rule-derived (e.g., "how many independent signals agree") rather than cosmetic.
- **V1**: Evaluation may incorporate real inference (pattern recognition across historical data, not just current-state rules), but every conclusion must still resolve to the same three-stage pipeline and must still attach evidence (per `Conversation-Evidence.md`) before it can be spoken. Reasoning becoming more sophisticated never removes the requirement that a conclusion be traceable back to its observations.

## 5. Non-Negotiable Properties

- **Every conclusion is explainable.** If Jarvis cannot say "because X, Y, and Z," it should not say the conclusion at all. This applies equally to Beta-1's simple rules and any future inference layer.
- **Reasoning never writes.** The Reasoning Architecture only produces conclusions and recommendations; turning a conclusion into a command intent is the separate, governed path already specified in the Jarvis Conversation Architecture §§6–7 (Approvals, Policy Gate).
- **Reasoning is reproducible for a given state.** The same operational state should produce the same conclusion. This is what makes Beta-1's deterministic simulation a legitimate rehearsal of V1's real reasoning, not a different system pretending to be the same one.

## 6. Cross-References

- `docs/architecture/Jarvis-Conversation-Architecture.md` — the conversation layer this reasoning feeds.
- `docs/architecture/Recommendation-Engine.md` — the primary consumer of reasoning output.
- `docs/architecture/Risk-Detection.md`, `docs/architecture/Opportunity-Detection.md` — the specific pattern libraries evaluation draws on.
- `docs/vision/Jarvis-Nexus-Experience-Vision.md` §2 — the conversational principle this reasoning ultimately serves.

## 7. Risks

- If evaluation logic becomes a black box before evidence-attachment is enforced in code (not just in this document), Jarvis becomes unable to explain itself, directly undermining trust per the Experience Vision.
- Treating Beta-1's pseudo-random confidence values as if they carry real meaning (e.g., reporting them in a demo as "Jarvis is 73% sure") would misrepresent simulation as intelligence — the simulation labeling already present in the UI must be preserved exactly because of this risk.
