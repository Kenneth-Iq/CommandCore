# Glassmind Conversations

## 1. Purpose

Defines specifically how Glassmind integrates with Jarvis conversation turns — the relationship between the real, future Glassmind-backed conversation memory and the frontend simulations already built (`apps/nexus-console/src/executiveAssistant.ts`'s `buildConversationMemory()`, `apps/nexus-console/src/operatorPrefs.ts`'s `useConversationLog`/`usePinnedConversations`, and the conversation-turn pipeline in `apps/nexus-console/src/conversationOrchestrator.ts`). This document is the bridge between what Beta-1/Beta-2's UI already rehearses and what Glassmind must actually back once it is real.

## 2. Current State (Simulated)

Today, "conversation memory" is entirely frontend and entirely local:

- `processConversationTurn()` produces an intent, evidence, a suggested response, and an approval placeholder — all computed fresh, nothing remembered between turns.
- `useConversationLog()` persists a capped list of conversation-log entries to `localStorage`, tagged with a `ConversationBadgeKind` (information/recommendation/warning/decision/approval).
- `usePinnedConversations()` lets a user mark specific log entries as worth keeping.
- `buildConversationMemory()` groups timeline entries into conversation groups and splits follow-ups/decisions into unresolved versus completed.

None of this survives a cleared browser, a different device, or a different session in any real sense — it is a faithful rehearsal of the *shape* Glassmind must eventually support, not Glassmind itself.

## 3. What Graduates, And How

Each frontend piece maps onto a specific Glassmind responsibility once Beta-2 lands:

| Frontend Today | Glassmind Tomorrow |
| --- | --- |
| `useConversationLog`'s capped local list | Conversation memory, indexed and unbounded (subject to retention policy, §5) |
| `ConversationBadgeKind` tagging | Carried through as part of each conversation memory record's metadata, so retrieval can filter by badge kind |
| `usePinnedConversations` | The explicit-action ingestion path from `Glassmind-Ingestion.md` §2 — a pin becomes a promotion signal |
| `buildConversationMemory()`'s unresolved/completed split | A real query against Glassmind's conversation memory and the Decision Queue's persisted state, not a one-time computation over in-memory arrays |
| The interruption logic in `JarvisPresence` (alerting on new recommendations/decisions) | Driven by real Glassmind-detected novelty (a memory that has no prior corroboration is "new") rather than a frontend `Set` of already-seen IDs |

## 4. The Interruption Problem, Specifically

The frontend's executive-interruption logic (Jarvis going to an "alert" state when a new recommendation or waiting decision appears) currently tracks "already seen" purely in a React ref, which resets every page load. Once Glassmind is real, "have I already told the user about this" becomes a real retrieval question — Glassmind should be able to answer "has this exact conclusion already been surfaced to this user" so Jarvis doesn't repeat itself across sessions, which the current simulation cannot do at all.

## 5. Retention

Conversation memory is not pruned by a fixed cap the way the current `localStorage` log is (`CONVERSATION_LOG_LIMIT`). Real retention should follow the same conversation-record lifecycle CommandCore already applies elsewhere, with pinned/promoted entries (per §3) retained longer than unpinned ones — mirroring the promotion rule already specified in `Glassmind-Architecture.md` §5.

## 6. Cross-References

- `docs/architecture/Glassmind-Architecture.md` §3 — conversation memory's place among the seven memory kinds.
- `docs/architecture/Memory-Strategy.md` — the original frontend-facing memory categories this document reconciles with Glassmind's backend model.
- `docs/architecture/Glassmind-Ingestion.md` §2 — the explicit-action path pinning feeds into.

## 7. Risks

- If the migration from `localStorage` to real Glassmind-backed memory is done as a wholesale replacement rather than the mapped graduation in §3, behavior users have come to expect from the simulation (badges, pinning, recent-conversation browsing) could regress during the transition — the table in §3 should be treated as a literal migration checklist, not just documentation.
- The interruption problem in §4 is the one piece of current frontend behavior that is meaningfully *worse* than what Glassmind would enable — this is a concrete, demonstrable case for prioritizing conversation-memory ingestion early in Phase 1 rather than treating it as a nice-to-have.
