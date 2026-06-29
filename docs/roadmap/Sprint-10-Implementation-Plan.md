# Sprint 10 Implementation Plan

## 1. Purpose

This document turns the Version 0.4 frontend (Living Jarvis, Executive Workspace, Operational Awareness, Hermes Preview) and the Glassmind planning documents into a concrete Sprint 10 plan. It is documentation only — no feature code lands in this sprint. Sprint 10 is the planning gate before any of `Glassmind-Version-Roadmap.md`'s v0.5 work, any Jarvis conversation-engine work, or any Hermes execution work begins.

## 2. Architecture Rules (Non-Negotiable For Sprint 10 And Beyond)

- Jarvis remains the conversational primary interface. Nothing in this plan moves the locus of interaction away from conversation toward a dashboard-first model.
- Nexus remains the visual evidence layer — the place every Jarvis claim resolves to a real record. Nexus dashboards do not become write paths as part of this plan; see §8.
- CommandCore remains the governed kernel. No part of this plan asks CommandCore's registries or runtimes to become memory stores or to expose new write surfaces.
- Glassmind is memory and retrieval, not the source of truth for current operational state. Per `Glassmind-Architecture.md` §5, Glassmind never caches live state — it stores what was observed and judged worth remembering.
- No opaque memory. Every memory record Glassmind ever produces must carry a `sourceReference` per `Glassmind-Memory-Model.md` §2, full stop. This rule gates every item in §4 below.

## 3. Jarvis Conversation Engine — Next Steps

**Current state:** `apps/nexus-console/src/conversationOrchestrator.ts` implements a deterministic, keyword-based pipeline (`classifyIntent` → `lookupEvidence` → `buildSuggestedResponse` → route suggestion → `buildApprovalPlaceholder`) with zero AI calls, consumed by both `JarvisConversationPanel` and `JarvisPresence`. This is Beta-1-equivalent simulation per `Jarvis-Conversation-Architecture.md` §11.

**Sprint 10 scope (planning only):**
- Specify the intent-classification upgrade path: today's substring-keyword matching in `classifyIntent` is the ceiling of what "deterministic, no AI" can do. Document where a real NLU step would slot into the existing five-stage pipeline without changing the pipeline's shape — `Reasoning-Architecture.md` §3's three-stage model (Observation/Evaluation/Filtering) already anticipates this; the conversation engine's upgrade is an Evaluation-stage swap, not a pipeline redesign.
- Specify how `processConversationTurn`'s output (`IntentClassification`, evidence, `ApprovalPlaceholder`) maps onto real conversation persistence once it exists, reusing the graduation table already defined in `Glassmind-Conversations.md` §3 rather than inventing a second mapping.
- Specify the interruption-memory gap called out in `Glassmind-Conversations.md` §4: `JarvisPresence`'s "already alerted" tracking is a React ref that resets on reload. Document this as the first concrete Glassmind consumer once conversation memory exists (§4 below), not as a frontend bug to fix independently.

**Explicitly out of scope for Sprint 10:** any actual NLU/LLM integration. "No AI calls" remains the rule until a future sprint explicitly lifts it with its own architecture review.

## 4. Glassmind Phase 1 Implementation Path

Per `Glassmind-Version-Roadmap.md`, Sprint 10 sits before v0.5 (Phase 1 Foundation). This section is the bridge: what v0.5 actually requires, broken into implementable units.

1. **Storage for the three already-flagged categories** (`Memory-Strategy.md`): follow-ups, deferred decisions, waiting approvals. These currently live only in `apps/nexus-console/src/operatorPrefs.ts`'s `localStorage`-backed hooks (`useConversationLog`, `usePinnedConversations`) and in-memory `executiveAssistant.ts` builders. Phase 1 requires a real backend store — this is new CommandCore-adjacent service surface, not a Nexus or Jarvis change.
2. **Ingestion limited to two sources** per `Glassmind-Ingestion.md` §2: the CommandCore EventStore and explicit user action (pin/watchlist). Conversation-turn ingestion is explicitly deferred to v0.6 per the roadmap, because there is no real conversation engine yet to ingest from (§3 above is the prerequisite).
3. **Retrieval limited to two stages** per `Glassmind-Retrieval.md` §3: working-memory check and exact-reference lookup. No scoped expansion, no similarity search in Phase 1.
4. **Schema** follows `Glassmind-Memory-Model.md` §2-§3 exactly: every record carries `sourceReference`, `scope`, and `confidence` from day one, even though Phase 1's confidence model is simple. Retrofitting provenance later is far more expensive than requiring it from the first commit.
5. **Isolation boundary built in from the start**, even though company memory itself is v0.7+: per `Glassmind-Workspace-Knowledge.md` §2 and the roadmap's own dependency note, scope-based isolation is "far cheaper to build in than to retrofit." Phase 1's storage layer should key every record by `scope.entityId` against the existing Nexus identifier space (the same IDs `RouteSelection`/`EvidenceLink` already use) even before company memory's pattern detection exists to use it.

**Sprint 10 deliverable for this stream:** a follow-up architecture note (not written this sprint) scoping the actual storage technology and service boundary for item 1 — this plan only sequences the work; it does not select infrastructure.

## 5. Nexus Evidence Layer Improvements

**Current state:** `evidenceRegistry.ts` indexes every recommendation/decision/follow-up/approval into a single registry; `EvidenceExplorer`, `EvidenceTimeline`, `EvidenceCrossReferenceGraph`, and `EntityEvidencePanel` all read from it. This is real, working frontend logic — not simulated in the sense Jarvis's conversation engine is, since it operates over real (if currently mock/seeded) CommandCore data shapes.

**Sprint 10 scope (planning only):**
- Document the migration path for `evidenceRegistry.ts` once Glassmind Phase 1 lands: today the registry is rebuilt from scratch on every render from `recommendations`/`decisionQueue`/`pendingFollowUps`/`approvalCards`. Once Glassmind has durable storage (§4), the registry should become a *view* over Glassmind-backed records rather than a pure in-memory recomputation — this is a read-path change only, consistent with "Glassmind is not the source of truth for current state" (§2): the registry still reflects current CommandCore state, it just gains a durable memory of past evidence to draw on.
- Fix the `EvidenceLink`/`RelationshipLink` duplication flagged in `Engineering-Quality-Review.md` and repeated, still unresolved, in `Engineering-Review-Sprint-9.md` §4. This is the cheapest, most overdue item in this entire plan and should be the first PR of Sprint 10's implementation phase, independent of and not blocking any Glassmind work.
- Add direct test coverage for `runtimeContext.tsx`, per `Engineering-Review-Sprint-9.md` §7 — it is now the single most load-bearing shared-state module in the frontend and has only indirect test coverage today (via `OperationalHealthRibbon.test.tsx`).

## 6. OperationalHealthRibbon / OperationalPulse Consolidation

Per `Engineering-Review-Sprint-9.md` §4, `OperationalPulse` (tick + health score) and `OperationalHealthRibbon` (health score + five per-entity pulses) are mounted simultaneously in `App.tsx` and overlap: the ribbon's score chip is a superset of what the pulse shows.

**Sprint 10 recommendation:** retire `OperationalPulse` as a standalone component. Fold its tick display (`Tick {simulation.tick}`) into `OperationalHealthRibbon`'s score chip as an additional label, then remove `OperationalPulse.tsx` and its mount point in `App.tsx`. This is a small, low-risk consolidation with no architectural implications — it does not touch `runtimeContext.tsx` or any data flow, only presentation. It should be done early in Sprint 10's implementation phase alongside the `EvidenceLink`/`RelationshipLink` fix (§5), since both are cheap, well-understood, and otherwise tend to keep getting deferred.

## 7. Hermes Preview — Next Steps

**Important finding — two different "Hermes" concepts currently coexist in this repo and must not be conflated:**

1. **"Hermes-Claw"** — referenced in `Tool-Commands-Architecture.md` and `Write-Capability-Architecture.md` as the future real tool-execution layer behind Nexus's `InvokeTool` command surface. This is what the frontend's `hermesBridge.ts` and `HermesPreview` page (Mission/Execution/Tool/Policy/Approval queues) simulate today — a frontend-only, fully disabled preview of what *requesting* tool execution would look like, with no execution path anywhere in the code.
2. **"Hermes"** (`docs/architecture/hermes/01-System-Overview.md` through `10-Recommendations.md`) — a separate, real architecture review of an external agent runtime (`agent-engines/hermes`) being evaluated as a candidate `AgentEngine` implementation underneath CommandCore's future agent interface. This review explicitly recommends a documentation-first, no-integration posture: define a CommandCore `AgentEngine` contract first, add a `HermesEngineAdapter` only after that contract exists, and keep all CommandCore concepts outside Hermes's internals. It is about *which engine executes agents*, not about *the Nexus-facing tool-invocation preview*.

These are plausibly the same long-term initiative — a real Hermes engine would be exactly what eventually sits behind "Hermes-Claw" execution — but nothing in either document set states that connection explicitly, and the two have been developed independently (the agent-engine review predates this sprint's frontend work). **Sprint 10 should not assume they're the same thing without an explicit reconciling note**, and should not let the agent-engine review's "documentation-first, no integration yet" posture be read as license to start wiring the frontend's Hermes Preview toward real execution, or vice versa.

**Sprint 10 scope (planning only):**
- Write the reconciling note described above as an early Sprint 10 deliverable: does "Hermes-Claw" become the product name for what the `agent-engines/hermes` evaluation produces, or are they unrelated and the naming collision should be resolved by renaming one? This is a naming and scope decision for whoever owns both documents, not something this plan should decide unilaterally.
- Until that reconciliation happens, the Hermes Preview's own next steps stay narrow: the queues' current data (`buildHermesQueues`) are derived entirely from existing Mission/Tool/Approval data already in `RuntimeContext`. Any enhancement should continue deriving from real (seeded/live) CommandCore data, never inventing parallel mock data — consistent with the existing pattern.
- Per the agent-engine review's own recommendation ("Sprint 1 Fit" module: "defer runtime integration until CommandCore interfaces are written"), no `AgentEngine`/`HermesEngineAdapter` work should start in Sprint 10 either. Both halves of "Hermes" stay documentation/preview-only this sprint.
- Per §8 below, Hermes Preview's "Execute (Disabled)" button and "Execution Disabled / Preview Mode" labeling must remain exactly as strict through Sprint 10 — no relaxation, no partial-execution mode, no "dry run that actually calls something."

## 8. What Must Remain Simulated Versus What Can Become Durable Backend State

This is the load-bearing distinction for Sprint 10 and should be treated as a checklist, not a paragraph to skim:

| Must remain simulated (no backend write path) | Can become durable backend state (Glassmind/CommandCore) |
| --- | --- |
| Hermes execution of any kind — `HermesQueueBoard`'s "Execute (Disabled)" stays disabled | Follow-ups, deferred decisions, waiting approvals (§4 item 1) |
| Any Jarvis conversation turn that implies an action (`ApprovalPlaceholder.status === "would_require_approval"`) — these remain placeholders, never real commands | Conversation memory and the conversation log, once a real conversation engine exists (v0.6) |
| Approval Cards' four statuses (`awaiting`/`approved`/`deferred`/`rejected`) — still simulated rehearsal per `executiveAssistant.ts`'s own comments, not real approval-engine state | Company memory and knowledge memory (v0.7-v0.8), scoped per `Glassmind-Workspace-Knowledge.md` |
| Galaxy/Planet navigation preview — single galaxy, single planet, explicitly labeled preview | Evidence registry's underlying data, once it becomes a Glassmind-backed view (§5) rather than pure recomputation |
| Any write button anywhere in Nexus — none exist today and none should be added this sprint | Nothing about *current* CommandCore state (mission status, agent runtime status, tool health) — that remains live-queried, never cached into memory, per `Glassmind-Architecture.md` §5 |

The right-hand column becoming real does not change the left-hand column's status. Glassmind going from simulated to real durable memory is orthogonal to Hermes going from preview to real execution — the two should not be conflated in scheduling or in review, and nothing in §4's Glassmind Phase 1 work implies or justifies relaxing any item in the left column.

## 9. Test Plan For Sprint 10

Sprint 10 is documentation-only, so no new tests are written this sprint. This section specifies what Sprint 10's eventual implementation phase must test, so the test plan exists before the code does:

- **`EvidenceLink`/`RelationshipLink` consolidation (§5):** a regression test confirming every existing consumer of either type still compiles and behaves identically post-merge — this is a refactor, and refactors need before/after behavioral parity tests, not new-feature tests.
- **`OperationalPulse`/`OperationalHealthRibbon` consolidation (§6):** update `OperationalHealthRibbon.test.tsx` to assert the tick label now renders within the ribbon; delete the (currently nonexistent) need for a separate `OperationalPulse` test.
- **`runtimeContext.tsx` direct coverage (§5):** a new `runtimeContext.test.tsx` exercising `RuntimeProvider` directly — recommendation/decision/evidence-registry derivation from a known `WorldData` + simulated state, using the existing `buildMockWorld`/`buildMockSimulation` test utilities. This is the single highest-priority new test in Sprint 10's eventual implementation phase per `Engineering-Review-Sprint-9.md` §7.
- **Glassmind Phase 1 (§4), once implemented:** tests belong at the service boundary (storage read/write, ingestion filter, retrieval exact-match), not in the frontend — `evidenceRegistry.ts`'s frontend tests should only need updating if its data source changes shape, not its logic.
- **No fragile tests:** consistent with `Nexus-Frontend-Testing-Strategy.md` §4's existing guidance, avoid snapshot tests and avoid asserting on animation/timing details (e.g., `JarvisPresence`'s alert-state timeout) — assert on state transitions and rendered content, not on wall-clock behavior.

## 10. Risks And Sequencing

**Sequencing, in order:**
1. `EvidenceLink`/`RelationshipLink` fix and `OperationalPulse` consolidation (§5, §6) — cheap, independent, no dependencies, should not wait for anything else.
2. `runtimeContext.tsx` test coverage (§5) — should land before any further `RuntimeProvider` changes, so Phase 1's eventual integration (§4 item 1's read-path change) has a safety net.
3. Glassmind Phase 1 storage/ingestion/retrieval (§4) — the largest item, gated on a separate infrastructure-scoping note this plan defers (§4's stated deliverable).
4. Jarvis conversation engine evaluation-stage groundwork (§3) — can proceed in parallel with item 3 once item 2's test coverage exists, since both touch `processConversationTurn`'s consumers.
5. Hermes Preview enhancements (§7) — lowest priority; current preview is functionally complete for its stated scope and has no urgent gap.

**Risks:**
- **Scope bleed between "Glassmind Phase 1" and "Jarvis conversation engine."** Both involve `processConversationTurn` and conversation memory; without the explicit graduation table in `Glassmind-Conversations.md` §3 as the shared reference, these two streams risk independently inventing incompatible conversation-memory shapes. Mitigation: both streams' implementers should review `Glassmind-Conversations.md` §3 before writing any code, not just this plan.
- **The "no opaque memory" rule being treated as a guideline rather than a hard gate.** Per §2, this is repeated here because it is the rule most likely to be quietly relaxed under schedule pressure once real storage work starts feeling slow without it. Any Phase 1 PR that writes a memory record without a populated `sourceReference` should be rejected in review, not merged with a follow-up ticket to fix it later.
- **Hermes execution scope creep.** §7 and §8 are deliberately repetitive about Hermes execution staying disabled — this is because Hermes Preview is the part of this codebase closest to looking like it could "just" be wired up to something real, and that temptation should be named explicitly rather than left implicit.
- **Environment instability unrelated to this plan.** The repo's working environment (a network-mounted drive) has shown intermittent disconnects during large file operations in recent sessions. This is an infrastructure risk to Sprint 10's execution logistics, not an architecture risk, and should be tracked separately from the technical risks above.

## 11. Cross-References

- `docs/vision/Jarvis-Nexus-Experience-Vision.md` — the product vision this plan stays inside of.
- `docs/architecture/Jarvis-Conversation-Architecture.md`, `docs/architecture/Reasoning-Architecture.md` — the conversation engine's existing architecture (§3).
- `docs/architecture/Glassmind-Architecture.md` and its six companion documents — the memory architecture this plan sequences (§4).
- `docs/engineering/Engineering-Review-Sprint-9.md` — the source of the consolidation and test-coverage recommendations in §5-§6.
- `docs/architecture/hermes/01-System-Overview.md` through `10-Recommendations.md` — the separate agent-engine review surfaced in §7; flagged here so it is not missed again in future planning.
- `docs/architecture/Tool-Commands-Architecture.md`, `docs/architecture/Write-Capability-Architecture.md` — the "Hermes-Claw" references §7 reconciles against the agent-engine review.
- `docs/roadmap/Version-1.0-Master-Checklist.md` — the master tracker this plan's completed items should be reflected into.
- `docs/testing/Nexus-Frontend-Testing-Strategy.md` — the testing conventions §9 follows.
