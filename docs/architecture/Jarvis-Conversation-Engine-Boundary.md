# Jarvis Conversation Engine Boundary

## 1. Purpose

This document draws an explicit line between what the Nexus frontend's conversation simulation does today and what the real Jarvis conversation engine must do once it exists. `docs/architecture/Jarvis-Conversation-Architecture.md` already specifies the conversation model's shape (turn resolution, evidence links, approvals, escalation, lifecycle); `docs/architecture/Glassmind-Conversations.md` already specifies how today's simulated conversation log graduates to real Glassmind-backed memory. This document sits between them: it is the boundary specification that says, concretely, which side of the line each current frontend behavior is on, so Sprint 10's documentation work and a later coding sprint do not have to re-derive it.

This is a planning document. No feature code is built or changed as part of it, and no frontend file is modified.

## 2. What Currently Exists In The Nexus Frontend Simulation

Everything below is real, working frontend code — but it is simulation, not the conversation engine, per `Jarvis-Conversation-Architecture.md` §11's Beta-1/Beta-2/V1 distinction:

- **`apps/nexus-console/src/conversationOrchestrator.ts`** — a deterministic, keyword-based pipeline: `classifyIntent` (substring matching against a fixed keyword table) → `lookupEvidence` (resolves intent to real `WorldData` records) → `buildSuggestedResponse` (template strings over current simulated state) → `buildApprovalPlaceholder` (flags action-implying messages as `would_require_approval`, never issues anything) → `classifyBadge` (maps a turn to one of five `ConversationBadgeKind` values). `processConversationTurn` composes all five into one `ConversationTurnResult`. No AI calls anywhere in this file.
- **`apps/nexus-console/src/components/JarvisConversationPanel.tsx`** and **`JarvisPresence.tsx`** — the two UI surfaces that call `processConversationTurn` and render its output as chat-style messages, both maintaining their own local, ephemeral `useState` transcript that does not survive a page reload.
- **`apps/nexus-console/src/operatorPrefs.ts`'s `useConversationLog`** — a `localStorage`-backed, capped (20-entry) log of `ConversationLogEntry` records (`summary`, `badge`, `occurredAt`, optional `page`/`selection`), populated both from user-initiated turns and from `JarvisPresence`'s proactive "executive interruption" logic (new recommendations, waiting decisions, briefing-period changes, health-score drops).
- **`usePinnedConversations`** — a `localStorage`-backed `Set<string>` of pinned log-entry IDs, with no payload of its own beyond the ID.
- **`executiveAssistant.ts`'s `buildDecisionQueue`, `buildFollowUps`, `buildApprovalCards`, `buildConversationMemory`** — pure functions that recompute decision/follow-up/approval lists and conversation groupings from scratch on every render, from current simulated state. Nothing here is persisted; calling these functions twice with the same inputs produces the same outputs, but nothing remembers that they were ever called before.
- **`JarvisPresence`'s interruption tracking** — a React `useRef<Set<string>>` of "already alerted" IDs, which resets to empty on every page load. This is the specific gap `Glassmind-Conversations.md` §4 already names.

The unifying property of everything in this section: it is real code, exercised by real tests, but it has no memory across a page reload, and none of it calls anything other than deterministic, in-process logic.

## 3. What Belongs In The Real Jarvis Conversation Engine

Per `Jarvis-Conversation-Architecture.md` §2-§3 and `Reasoning-Architecture.md` §3, the conversation engine owns:

- **Turn resolution** — classifying what a user (or a proactive trigger) is asking, in the same five-stage shape `processConversationTurn` already rehearses (classify → retrieve evidence → compose response → suggest a route → attach an approval disposition). The engine upgrade is an Evaluation-stage swap (real NLU/reasoning in place of keyword matching), not a pipeline redesign — this is the same conclusion `docs/roadmap/Sprint-10-Implementation-Plan.md` §3 already reached.
- **Response composition** — turning a resolved intent and its evidence into natural language, replacing `buildSuggestedResponse`'s templates.
- **Approval disposition** — replacing `buildApprovalPlaceholder`'s simulated flag with a real check against the Approval Engine and Policy Gate (`Jarvis-Conversation-Architecture.md` §6-§7), still never executing anything itself.
- **Session/turn sequencing** — deciding when a conversation is ongoing versus newly started, and when a proactive interruption (briefing due, new risk) should interject versus wait, per the Notification Orchestration model.

The conversation engine does **not** own durable storage of what was said, decided, or pinned — that is Glassmind's job (§4 below). The engine resolves turns; it does not remember them past the point of handing a turn's result to whatever persists it.

## 4. Glassmind Versus CommandCore

This split follows directly from `Glassmind-Architecture.md` §2 and §6, applied specifically to conversation data:

| Belongs to Glassmind | Belongs to CommandCore |
| --- | --- |
| Conversation memory's *index* over conversation history (per `Glassmind-Memory-Model.md` §3: Glassmind indexes the Conversation/Thread/Message model, it does not duplicate it) | The actual Conversation/Thread/Message records themselves — CommandCore's existing conversation model is the source of truth for what was literally said |
| Follow-ups, deferred decisions, waiting-approval *memory* (that something was flagged, when, with what confidence) | The Approval Engine's real approval state (`pending_approval`, `approved`, `rejected`) — Glassmind reads this, never owns it |
| The "already surfaced this to the user" interruption-dedup record (closing the `JarvisPresence` gap in §2) | Current operational state any interruption is *about* (mission status, tool health) — always live-queried, never cached into memory |
| Pinned-conversation metadata (which log entries a user marked as worth keeping, and why that counts as a promotion signal per `Glassmind-Architecture.md` §5) | The audit trail of any action a conversation turn ultimately led to — that is CommandCore's AuditTrail, a different thing from Glassmind's memory of the conversation that preceded it |

Glassmind is never the source of truth for whether a mission is currently blocked, an approval is currently pending, or a conversation is currently active — it is the record of what was observed and judged worth remembering about those things over time. This is the same rule `Glassmind-Architecture.md` §5 already states; this table is its conversation-specific instance.

## 5. Conversation Turns As Evidence-Linked Records

Per `Conversation-Evidence.md` §3-§4, every conversation turn that makes a claim must resolve to a real record, and this requirement does not relax once turns become durable — if anything it tightens, because a durable record is something a user can return to days later and expect to still check out.

A real, durable conversation turn record should carry:
- The same `EvidenceLink`-shaped reference(s) the simulation already attaches (`ConversationTurnResult.evidence`, `routeSuggestion`) — not a new evidence shape, the existing one, per the duplication risk `Conversation-Evidence.md` §6 already warns about.
- A `sourceReference` back to the real Conversation/Thread/Message record that produced it, per `Glassmind-Memory-Model.md` §2's non-negotiable provenance field.
- The turn's `IntentClassification` and `ApprovalPlaceholder`/real-approval-disposition, preserved as part of the record rather than discarded after rendering — today's simulation computes these and then throws them away once the chat bubble is rendered; a durable engine must keep them, because they are exactly what makes a past turn explainable later.

A conversation turn with no resolvable evidence should not be persisted as if it were a confident claim — per `Glassmind-Retrieval.md` §6's degradation rules, an unresolved turn is either dropped or persisted explicitly labeled as low-confidence, never silently upgraded.

## 6. Retrieving Prior Context Without Inventing Memory

Per `Glassmind-Retrieval.md` §3, the engine retrieves prior context in a fixed order and stops as soon as it has a real answer:

1. **Working memory** — the current turn's own context, cheapest and checked first.
2. **Exact-reference lookup** — does Glassmind have a record scoped to this exact entity (mission, conversation, etc.)? This is the common case for "what did we say about this mission before."
3. **Scoped expansion** — only if exact lookup misses, walk the entity's immediate relationships (the same graph `ImpactAnalysis` already computes).
4. **Similarity search** — not available until Glassmind's vector memory is real (`Glassmind-Version-Roadmap.md` v0.9); not relevant to this sprint's scope at all.

The critical rule, repeated here because it is the one most likely to be violated under pressure to make Jarvis "feel smart": **if retrieval returns nothing, Jarvis says it has no memory of this** — per `Glassmind-Retrieval.md` §3 step 5, an empty result is a valid result the engine must be able to act on, not a gap to paper over with a plausible-sounding guess. "I don't recall discussing this before" is always an acceptable answer; a fabricated-sounding recollection is never acceptable, regardless of how natural the surrounding conversation sounds.

## 7. Graduating Pinned Conversations, Follow-Ups, Deferred Decisions, And Approvals From localStorage

This follows the table already specified in `Glassmind-Conversations.md` §3, restated here scoped to what each item actually requires to graduate:

- **`useConversationLog`'s entries** → real, indexed conversation memory (§4 above), unbounded subject to a retention policy rather than the current hard 20-entry cap. Each entry's `badge` (`ConversationBadgeKind`) carries through as record metadata so retrieval can filter by it.
- **`usePinnedConversations`** → the explicit-action ingestion path (`Glassmind-Ingestion.md` §2): a pin becomes a promotion signal, not a separate storage mechanism. There should not be a "pinned conversations table" distinct from conversation memory with a `promotedAt` or equivalent flag set.
- **Follow-ups and deferred decisions** (`buildFollowUps`, `buildDecisionQueue`'s `waiting`/`deferred` items) → real CommandCore-tracked items with an explicit status field (`open`/`resolved`/`deferred`/`expired`), per `Memory-Strategy.md` §4, correlated back to whatever recommendation or conversation produced them. This is new CommandCore-adjacent service surface, not a Nexus or Jarvis change, and not Glassmind's to own outright — Glassmind remembers that a follow-up existed and what was said about it; the follow-up's live status is CommandCore's, per §4's table.
- **Approval cards** (`buildApprovalCards`) → real Approval Engine state once that engine exists. Nothing about this graduation changes the simulated four statuses' meaning (`awaiting`/`approved`/`deferred`/`rejected`); it only makes them real instead of rehearsed.

None of this graduation work is in scope for Sprint 10 (§8). This section exists so the later coding sprint that does it has a single, already-agreed table to implement against instead of re-litigating the mapping.

## 8. What Must Remain Simulated In Sprint 10

Sprint 10 is documentation-only for this stream specifically. Concretely, nothing changes about:

- `conversationOrchestrator.ts` — stays deterministic, keyword-based, zero AI calls.
- `useConversationLog`/`usePinnedConversations` — stay `localStorage`-backed with no durable backend.
- `JarvisPresence`'s interruption-dedup `useRef` — stays a per-session, reload-resetting check; the real fix (§4, §6) is a later coding sprint's work, not this one's.
- `buildFollowUps`/`buildDecisionQueue`/`buildApprovalCards`/`buildConversationMemory` — stay pure, stateless recomputation functions.
- Every `ApprovalPlaceholder` — stays a placeholder. No conversation turn triggers a real command or a real approval-engine entry.

## 9. What Should Be Implemented First In A Later Coding Sprint

In dependency order:

1. **Durable storage for follow-ups, deferred decisions, and waiting approvals** (§7) — this is `Glassmind-Version-Roadmap.md` v0.5's own first item and has no dependency on the conversation engine being real yet.
2. **The evidence-linked turn record shape** (§5) — should be designed alongside item 1, since both need the same `sourceReference`/`EvidenceLink` discipline, but the turn record itself doesn't need to be populated by anything smarter than today's `conversationOrchestrator.ts` to start being persisted.
3. **Conversation-turn ingestion into Glassmind** (§4, §6) — explicitly gated on a real conversation engine existing (`Glassmind-Version-Roadmap.md` v0.6), so this cannot start before the conversation engine's Evaluation-stage upgrade (§3) lands, or at minimum before there's a stable turn shape to ingest from item 2.
4. **The `JarvisPresence` interruption-dedup fix** (§2, §6) — naturally falls out of item 3 once conversation memory can answer "have I already told this user about this," and should not be solved as a standalone frontend patch before then.
5. **Pinned-conversation and follow-up/decision/approval graduation** (§7) — depends on items 1-3 each being real for the category being graduated; these can graduate independently of each other once their respective backing store exists.

## 10. Required Tests And Acceptance Criteria

**For Sprint 10 (this document only):** none — no code changes accompany this document.

**For the later coding sprint, per category:**

- **Turn resolution / evidence (§3, §5):** every persisted turn record must have a non-empty `sourceReference` or must not be persisted at all — a unit test asserting this invariant at the storage boundary, not just at the frontend display layer, is the single most important test in this entire boundary. Acceptance criterion: attempting to persist a turn without provenance is a rejected write, not a logged warning.
- **Retrieval (§6):** a retrieval query against an empty store returns an explicit "no memory of this" result distinguishable from an error; a retrieval query with an exact-reference match never falls through to scoped expansion. Acceptance criterion: both behaviors are asserted directly, not inferred from end-to-end conversation output.
- **Graduation (§7):** for each category graduating off `localStorage`, a before/after parity test confirming existing UI behavior (what `JarvisPresence`'s Recent/Pinned tabs show) is unchanged immediately after migration, per the same parity-test approach `Sprint-10-Implementation-Plan.md` §9 already specifies for the `EvidenceLink`/`RelationshipLink` consolidation.
- **Interruption dedup (§2, §6, §9 item 4):** a test simulating the same recommendation appearing across two separate sessions (not just two renders within one session) and asserting it is not re-alerted — this is the regression test that proves the Glassmind-backed fix actually closes the gap, as opposed to just moving the `Set` somewhere else that still resets.
- **No fragile tests:** consistent with `Nexus-Frontend-Testing-Strategy.md` §4 and `Sprint-10-Implementation-Plan.md` §9, none of the above should assert on timing, animation, or exact wording of a composed response — assert on state, provenance, and structural invariants.

## 11. Risks And Sequencing

**Sequencing** follows §9 directly. The risks specific to this boundary, beyond what `Sprint-10-Implementation-Plan.md` §10 already names:

- **The provenance rule being treated as a migration nicety instead of a hard gate.** Repeated once more here because it is the rule this document's entire §5 and §10 exist to protect: a turn record persisted without a `sourceReference` "to be fixed in a follow-up" is the single most likely way this boundary gets quietly violated under schedule pressure. Any PR introducing durable turn storage should be reviewed specifically for this before anything else.
- **Conflating "the conversation engine is smarter" with "the conversation engine remembers more."** These are orthogonal upgrades (§3 versus §4/§6) and the roadmap already sequences real conversation-turn ingestion (v0.6) after Phase 1 storage (v0.5) for exactly this reason — a smarter engine with no memory is still bounded by §8's simulation limits; a engine with real memory but no reasoning upgrade is still bounded by today's keyword-matching. Neither alone closes the full gap, and Sprint 10 planning work should not imply that shipping one makes the other unnecessary.
- **Glassmind being asked to answer questions about current state instead of remembered state.** §4's table is the guard against this; the risk is that "what's the status of this mission" and "have we discussed this mission's status before" get implemented against the same store because they feel similar. They must not be — the former stays a live CommandCore query regardless of how good Glassmind's memory gets.
- **Environment/tooling risk carried over from prior sprints.** Unrelated to this document's content, but worth repeating: the working environment's network-mounted drive has shown repeated git-index corruption and intermittent disconnects during large file operations. This is a logistics risk to whichever sprint implements §9's items, not an architecture risk, and should be tracked separately.

## 12. Cross-References

- `docs/architecture/Jarvis-Conversation-Architecture.md` — the conversation model this document's engine/simulation boundary sits inside of.
- `docs/architecture/Reasoning-Architecture.md` — the three-stage reasoning model §3's engine upgrade slots into.
- `docs/architecture/Glassmind-Architecture.md`, `Glassmind-Memory-Model.md`, `Glassmind-Retrieval.md`, `Glassmind-Ingestion.md`, `Glassmind-Conversations.md`, `Glassmind-Version-Roadmap.md` — the full Glassmind documentation set §4, §6, §7, and §9 draw on directly.
- `docs/architecture/Conversation-Evidence.md` — the evidence/provenance rules §5 and §10 enforce.
- `docs/architecture/Memory-Strategy.md` — the original frontend-facing memory categories §7 graduates.
- `docs/roadmap/Sprint-10-Implementation-Plan.md` — the broader Sprint 10 plan this document is a deeper dive on, specifically its §3-§4 and §9-§10.
- `docs/architecture/Hermes-Scope-Decision.md` — unrelated in subject matter but the most recent example of this repo's discipline around naming/scope clarification documents, which this document follows the same spirit of.
- `docs/testing/Nexus-Frontend-Testing-Strategy.md` — the testing conventions §10 follows.
