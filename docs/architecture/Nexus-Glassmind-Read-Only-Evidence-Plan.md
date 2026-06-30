# Nexus ↔ Glassmind Read-Only Evidence Plan

## 1. Purpose

Defines how Nexus may eventually display Glassmind-backed evidence — once a durable backend and a read API exist, per `docs/architecture/Glassmind-Phase-1-Persistence-Path.md` — without becoming a write path into Glassmind, CommandCore, or anything else. This is a plan, not an implementation. No Nexus source file changes as part of this document, and no API is built here.

## 2. Current Nexus Role As Visual Evidence Layer

Nexus already implements the evidence-layer pattern this plan extends, just not yet backed by Glassmind: `EvidenceCard` resolves an `EvidenceLink` to a real record and renders an expandable detail; `EntityEvidencePanel` shows "Related Evidence" computed from `evidenceRegistry.ts`'s in-memory registry over the current session's recommendations/decisions/follow-ups/approvals; `ConversationContextBar`, `DecisionQueuePanel`, `PendingFollowUpsPanel`, and `ApprovalCardsPanel` all render simulated data recomputed fresh on every render, per `apps/nexus-console/src/executiveAssistant.ts`. None of this currently has any memory across a page reload — that gap is exactly what Glassmind closes once wired in, and exactly what this plan specifies the read side of.

## 3. What Glassmind Evidence May Be Displayed Later

Once `Glassmind-Phase-1-Persistence-Path.md`'s persistence paths are real and a read API exists (§9):

- **Conversation history** — past `ConversationTurnRecord`s relevant to the entity currently in view, surfaced as "Jarvis has discussed this before" in `EntityEvidencePanel` or a future memory trace panel (§6).
- **Follow-up history** — both open and resolved `FollowUpMemoryRecord`s, including their `resolution` metadata once resolved, in `PendingFollowUpsPanel`.
- **Decision history** — `DeferredDecisionMemoryRecord`s across all four statuses, in `DecisionQueuePanel`.
- **Approval history** — `ApprovalWaitingStateMemoryRecord`s, explicitly labeled as Glassmind's *memory* of approval activity, never as the live Approval Engine state, in `ApprovalCardsPanel`.

All four categories already have a real, working Nexus UI shape today (built in Sprint 7-9) — what changes when Glassmind is wired in is the *data source* (durable memory instead of recomputed-per-render simulation), not the UI shape itself. This plan does not propose new Nexus components for these four; it proposes how the existing ones eventually read from a real backend.

## 4. What Nexus Must Not Do

Non-negotiable, repeated from every governing document because this is the boundary most likely to be violated by a well-intentioned "just wire it up" shortcut once a backend exists:

- **No writes to Glassmind.** No Nexus component calls `recordConversationTurn`, `recordFollowUp`, `recordDeferredDecision`, `recordApprovalWaitingState`, or any of the three lifecycle methods, ever, directly or indirectly. `PendingFollowUpsPanel`'s current "Mark Resolved" button is local UI state only (per its existing implementation) and must not be reinterpreted as a Glassmind write call when this plan is implemented — if resolution needs to become real, it goes through the conversation engine or another authorized backend process, never directly from Nexus.
- **No direct EventStore ingestion.** Nexus has no relationship to `EventStoreIngestionAdapter` or `DefaultCommandCoreEventBridge` of any kind — those are backend-only, per `Glassmind-Package-Integration-Map.md` §7.
- **No approval/follow-up/decision authority.** Nexus displaying an `ApprovalWaitingStateMemoryRecord` does not make Nexus part of the approval process — it remains a read-only window onto Glassmind's memory of a process that happens entirely in CommandCore and (later) the conversation engine.
- **No direct mutation of memory records.** Not through a hidden API call, not through a "quick fix" admin panel, not through anything. If a displayed memory record is wrong, the fix is in whatever process wrote it (or a deliberate, audited correction process specified elsewhere) — never a Nexus-initiated edit.

## 5. Recommended Read-Only Display Surfaces

| Surface | Role once Glassmind-backed |
| --- | --- |
| `EvidenceCard` | Already structurally ready — its expand/collapse pattern resolving an `EvidenceLink` to a real record's mini-detail extends naturally to a Glassmind-backed evidence item with no shape change. |
| `ConversationContextBar` | Its `investigation` field (currently set from in-session navigation, per `executiveAssistant.ts`'s `buildConversationContext`) could be informed by recent Glassmind conversation memory once available — a "what was I just asked about" signal, read-only. |
| `DecisionQueuePanel` | Reads `DeferredDecisionMemoryRecord`s instead of `buildDecisionQueue`'s recomputed list; same four-column UI shape. |
| `PendingFollowUpsPanel` | Reads `FollowUpMemoryRecord`s instead of `buildFollowUps`'s recomputed list; same kind-grouped UI shape, with resolution status now durable instead of session-local. |
| `ApprovalCardsPanel` | Reads `ApprovalWaitingStateMemoryRecord`s instead of `buildApprovalCards`'s recomputed list; same four-status UI shape, with the "Glassmind's memory, not live state" framing made explicit in copy (see §8). |
| **Future memory trace panel** | A new, not-yet-built surface showing a chronological trace of all Glassmind memory touching a given entity — conversation turns, follow-ups, decisions, approvals, interleaved by time. This is the natural evolution of `ConversationMemoryTimeline`'s existing grouping logic once it has durable data to group, not a new concept. |

No existing component needs a new prop shape to support this — each already accepts data and an `onNavigate` callback; the change when implemented will be in what populates that data (a Glassmind-backed read API response instead of an `executiveAssistant.ts` builder function), which is exactly why this can remain a plan today without any frontend code change.

## 6. How Evidence Links Should Resolve

No change from Nexus's existing pattern, restated for Glassmind specifically: a Glassmind-backed evidence item's `EvidenceLink` (`label`, `page`, `selection`) resolves through the same `onNavigate`/route-chip mechanism every other evidence link in Nexus already uses. Per `Conversation-Evidence.md` §3, the link must land on the *specific* record, not a generic page — this requirement does not relax because the evidence now comes from Glassmind instead of live CommandCore data; if anything it matters more, since durable memory will be reviewed further from when it was created than in-session simulation ever was.

## 7. How "No Memory Found" Should Appear Honestly

Mirrors `apps/jarvis-engine`'s already-implemented `MemoryRetrievalStatus` distinction exactly, surfaced in the UI rather than invented anew:

- **`not_queried`** — Nexus hasn't asked Glassmind anything yet for this view (e.g., the read API call hasn't completed, or this surface doesn't query Glassmind at all). Should render as a neutral loading or "not available here" state, never as if memory were checked and found empty.
- **`no_memory_found`** — Glassmind was asked and has nothing. Should render as an explicit, calm statement ("No prior memory of this") — using the same `empty-state`/`simulation-empty` visual language already established throughout Nexus for "nothing here right now," not an error state, not a blank gap that looks broken.
- **`found`** — render the records. No partial-credit state exists between "found" and "no memory found" in Phase 1 — there is no ranking or confidence-weighted partial result to show yet (§8 covers confidence display specifically).

This is a direct UI-level restatement of the same honesty rule `Glassmind-Retrieval.md` §3 step 5 and `Jarvis-Conversation-Engine-Boundary.md` §6 already establish for the conversation engine — Nexus must not be a place where that honesty quietly erodes because "the UI looked better with something there."

## 8. How Stale/Low-Confidence Memory Should Be Represented Later

Phase 1's `confidence` field is a simple, explainable number (per `Glassmind-Phase-1-Storage-Design.md` §9) — not yet a ranking signal. When Nexus eventually displays Glassmind evidence, two things should be visually distinct from a fresh, live CommandCore fact, consistent with the evidence-health pattern `EvidenceExplorer`/`EvidenceCrossReferenceGraph` already established in Sprint 7-8:

- **Age** — a Glassmind memory item should show when it was recorded (`occurredAt`) and, for resolved/updated items, when that happened (`resolution.resolvedAt`/`update.updatedAt`), so a user can judge for themselves whether week-old memory is still relevant — Nexus should not make that judgment silently on the user's behalf by hiding the timestamp.
- **Approval-specific staleness** — per §4 and `Glassmind-Phase-1-Persistence-Path.md` §3.4, an `ApprovalWaitingStateMemoryRecord` should always be labeled as Glassmind's memory, with its `update.updatedAt` shown, so a user cannot mistake a possibly-stale memory record for the live Approval Engine's current state. If the real Approval Engine is reachable for a live check, that live state — not Glassmind's memory — is what any "is this still pending" question should resolve against.

True confidence-weighted display (e.g., visually de-emphasizing low-confidence memory) is Phase 2+ territory once company memory's corroboration model exists (`Glassmind-Memory-Model.md` §3) — Sprint 11 should not attempt to simulate that with Phase 1's simple confidence number.

## 9. API Boundary Between Nexus And Glassmind

Per `Glassmind-Package-Integration-Map.md` §6 and §9, and reaffirmed here: **Nexus never imports `apps/glassmind` directly.** A thin, backend-hosted read API sits between them — conceptually similar to how `apps/jarvis-engine`'s `GlassmindReadOnlyMemoryAdapter` reaches Glassmind through a narrow, independently-declared structural interface rather than an npm dependency, except here the boundary is a real network/process boundary (Nexus is a browser application; Glassmind's durable store runs server-side), not just a TypeScript-level decoupling. This API:

- Exposes read operations only — at minimum, something shaped like `retrieveBySourceReference`/`retrieveByScope`, mapped onto whatever HTTP/RPC shape Nexus's existing `commandcoreApi.ts` pattern already establishes for read-only dashboard data.
- Returns the same honest `MemoryRetrievalStatus`-shaped outcome (§7) Nexus needs to render correctly — the API boundary is exactly where "not queried" vs. "no memory found" vs. "found" should be made explicit, not left for the frontend to infer from an empty array versus a missing field.
- Has no corresponding write endpoint reachable from Nexus, structurally — per §4, this is enforced by the API's own surface, not by Nexus's restraint alone.

Designing this API's exact shape (REST vs. RPC, response envelope, error format) is implementation work for whichever sprint builds it, not specified further here — this section establishes that it must exist as a distinct, read-only layer, not where exactly its routes live.

## 10. Test Requirements

- **Read API contract tests**, once built: confirm the API's response shape correctly distinguishes `not_queried`/`no_memory_found`/`found`, matching `apps/jarvis-engine`'s existing `MemoryRetrievalStatus` semantics, so Nexus and Jarvis present memory honesty consistently rather than each inventing their own convention.
- **No-write-surface tests**: a structural test (mirroring `commandCoreEventBridge.test.ts`'s "no CommandCore import" pattern) confirming the read API's exposed surface has no mutating endpoint reachable from a client — this should be checked mechanically, not left to code review alone, per the same reasoning `Glassmind-Durable-Adapter-Design.md` §8 applies to the provenance gate.
- **Frontend display tests**, once components are wired (not in Sprint 11): existing component tests (`DecisionQueuePanel.test.tsx`, `PendingFollowUpsPanel.test.tsx`, `ApprovalCardsPanel.test.tsx`, etc.) should gain cases for the Glassmind-backed empty/found/not-queried states, using the established `buildMockWorld`/`buildMockSimulation` test-utility pattern extended with a mock read-API response — not new test infrastructure.
- **No fragile tests** — assert on the honesty/boundary contract, never on a specific API transport's wire format.

## 11. Non-Goals For Sprint 11

- **No frontend wiring of any kind.** This entire document is a plan; `apps/nexus-console` source is unmodified by it.
- **No read API implementation.** §9 specifies that one must exist and what it must guarantee; building it is later work.
- **No new Nexus components.** §5's "future memory trace panel" is named as a future direction, not built this sprint.
- **No confidence-weighted ranking UI.** Per §8, that is explicitly Phase 2+ territory.
- **No change to how `PendingFollowUpsPanel`'s "Mark Resolved" button currently behaves.** It stays local-only UI state until a real, authorized resolution path exists per `Glassmind-Phase-1-Persistence-Path.md` §3.2 — this plan does not repurpose it.

## 12. Cross-References

- `docs/architecture/Glassmind-Phase-1-Persistence-Path.md` — the write-side companion to this read-side plan.
- `docs/architecture/Glassmind-Package-Integration-Map.md` §4, §6, §9 — the Nexus-facing boundary rules this plan restates and applies concretely to named components.
- `docs/architecture/Conversation-Evidence.md` — the evidence-link resolution rules §6 follows.
- `docs/architecture/Glassmind-Retrieval.md` §3 step 5 — the empty-retrieval honesty rule §7 applies to the UI layer.
- `apps/jarvis-engine/src/glassmindReadAdapter.ts` — the precedent for a narrow, structurally-typed read-only adapter §9 follows the spirit of.
- `docs/roadmap/Sprint-11-Implementation-Plan.md` §3 item 6 — the backlog item this document delivers.
