# Memory Strategy

## 1. Purpose

Expands `docs/architecture/Jarvis-Conversation-Architecture.md` §4 (Conversation Memory) into a complete strategy covering not just conversation turns but the broader "what does Jarvis remember about running this organization" question — previous discussion topics, pending follow-ups, deferred decisions, and waiting approvals, all already rehearsed in Beta-1's Decision Queue and Pending Follow Ups panels (`apps/nexus-console/src/executiveAssistant.ts`).

## 2. Current State (Beta-1)

`buildDecisionQueue()` and `buildFollowUps()` produce simulated `DecisionItem` and `FollowUpItem` lists with no real persistence — they are recomputed from current simulated state on every render. The Briefing & Conversation Timeline (`buildTimeline()`) similarly recomputes a chronological feed rather than reading from a persisted log. This is sufficient to rehearse the UI shape but is not memory in any real sense — nothing here survives a page reload beyond what `localStorage`-backed operator preferences (favourites, watchlist) already persist for unrelated reasons.

## 3. Memory Categories

Four categories, matching the original Stream A spec and already given UI shape in Beta-1:

- **Previous discussion topics** — what has Jarvis and the user already talked about. Maps onto the Conversation/Thread/Message model per the Jarvis Conversation Architecture §4 — this is not new memory infrastructure, it is conversation history, already a first-class CommandCore concept.
- **Pending follow-ups** — questions Jarvis asked that haven't been answered, items waiting on the user, items postponed, items flagged for review. These are short-lived, action-oriented memory items distinct from general conversation history — they need their own tracked status (open/resolved), not just a place in a message log.
- **Deferred decisions** — a decision that was surfaced (via the Recommendation Engine or directly) but the user chose not to act on yet. Deferral is itself a meaningful signal (per `Notification-Orchestration.md`, a deferred item should not be re-surfaced identically next time) and must be remembered as such, not simply forgotten.
- **Waiting approvals** — commands (Beta-2+) sitting in `pending_approval` per the Approval Engine Architecture. This category is the one piece of "memory" that already has a fully specified real-world counterpart outside this document.

## 4. Storage Model

- **Conversation history** persists exactly as any other CommandCore conversation (per Jarvis Conversation Architecture §4) — no separate store.
- **Follow-ups and deferred decisions** should persist as lightweight CommandCore-tracked items correlated to the conversation or recommendation that produced them, with an explicit status field (`open`, `resolved`, `deferred`, `expired`), not as free-floating UI state. Beta-1's `localStorage`-only Decision Queue is a UI rehearsal of this; Beta-2 must back it with a real, queryable store so a follow-up survives across sessions and devices.
- **Waiting approvals** persist via the Approval Engine's own state model — Memory Strategy only specifies that Jarvis's conversational surfaces (briefings, follow-ups panel) read from that same state rather than maintaining a shadow copy.

## 5. Retrieval And Use

Memory exists to be retrieved at the right moment, not just stored:

- A morning briefing (per `Executive-Briefing-Pipeline.md`) should incorporate yesterday's deferred decisions and unresolved follow-ups, not just today's fresh signals.
- A user asking "what were we talking about" should retrieve recent conversation topics scoped to relevance (the current mission, the current page context), not a raw chronological dump.
- A deferred decision that has aged past a reasonable window should resurface with escalated framing (per the Notification Orchestration's significance model), rather than being silently dropped or silently repeated forever unchanged.

## 6. What Changes Across Versions

- **Beta-1**: All four categories are simulated, recomputed per render, `localStorage`-backed only for unrelated favourites/watchlist features.
- **Beta-2**: Follow-ups, deferred decisions, and waiting approvals become real, persisted, status-tracked CommandCore entities; conversation history is real per the existing Conversation model.
- **V1**: Retrieval (§5) becomes genuinely relevance-ranked rather than simple recency-based, once enough real history exists to make ranking meaningful.

## 7. Cross-References

- `docs/architecture/Jarvis-Conversation-Architecture.md` §4, §10 — conversation memory and lifecycle.
- `docs/architecture/Approval-Engine-Architecture.md` — the waiting-approvals category's real backing store.
- `docs/architecture/Notification-Orchestration.md` — how aged deferred items resurface.
- `docs/architecture/Persistence-Architecture.md` — the durability layer all of this ultimately depends on once Beta-2 persistence lands.

## 8. Risks

- If follow-ups and deferred decisions are implemented as throwaway UI state past Beta-1, "Jarvis remembers" becomes a lie the product tells — this is explicitly called out because it is the easiest corner to cut under time pressure and the most damaging one to cut.
- Memory without a forgetting/expiry policy accumulates indefinitely; this document's "aged past a reasonable window" framing in §5 needs a concrete policy before Beta-2 ships, not just an intention.
