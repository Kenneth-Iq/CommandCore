/**
 * Jarvis conversation engine skeleton — core type contracts.
 *
 * These types define the future durable Jarvis conversation pipeline ahead
 * of replacing apps/nexus-console/src/conversationOrchestrator.ts's frontend
 * simulation. Per docs/architecture/Jarvis-Conversation-Engine-Boundary.md,
 * this package is intentionally framework-free and standalone: no import of
 * apps/nexus-console (the frontend it will eventually replace the simulation
 * behind) and no import of apps/glassmind (memory is accepted through a
 * narrow, structurally-independent interface — see JarvisMemoryStore below —
 * not a direct package dependency, mirroring the same "declare independently
 * rather than couple two skeleton packages" precedent apps/glassmind itself
 * used for EvidenceLink).
 */

/** The entity-identifier space already used throughout Nexus and Glassmind. */
export type JarvisEntityScope = {
  entityKind: string;
  entityId: string;
};

/**
 * What the engine is being asked, and where the conversation is scoped.
 * `context` is optional-fields-heavy on purpose — a turn may arrive with no
 * known scope yet (a fresh conversation) and the engine must handle that
 * without inventing one.
 */
export type JarvisConversationContext = {
  conversationId?: string;
  threadId?: string;
  scope?: JarvisEntityScope;
};

export type JarvisConversationInput = {
  message: string;
  context: JarvisConversationContext;
};

/**
 * A single piece of evidence backing a claim in the response. Structurally
 * identical in spirit to Nexus's EvidenceLink and Glassmind's EvidenceLink,
 * declared independently here for the same reason both of those are
 * independently declared in their own packages: no cross-package coupling
 * before an explicit integration decision authorizes it.
 *
 * Every JarvisConversationEvidence the engine returns must trace back to a
 * real source — either a memory record retrieved through JarvisMemoryStore
 * (see MemoryRetrievalStatus) or, in a future real implementation, a live
 * CommandCore query. This skeleton never fabricates an evidence item that
 * doesn't come from one of those two places.
 */
export type JarvisConversationEvidence = {
  label: string;
  page: string;
  selection?: Record<string, string | undefined>;
};

/**
 * Honest accounting of whether memory was consulted and what was found.
 * "no_memory_found" is a first-class, valid outcome — never an error — per
 * Glassmind-Retrieval.md §3 step 5 and the architecture rule that empty
 * retrieval must remain a valid, honest result. "not_queried" is distinct
 * from "no_memory_found": it means no JarvisMemoryStore was configured at
 * all, which is a different, equally honest thing to say than "I looked and
 * found nothing."
 */
export type MemoryRetrievalStatus =
  | { status: "not_queried" }
  | { status: "no_memory_found" }
  | { status: "found"; recordCount: number };

export type JarvisFollowUpKind = "question" | "waiting" | "postponed" | "review";

/** A follow-up the engine wants to surface — mirrors FollowUpKind from the existing frontend simulation and Glassmind's FollowUpKind, kept in sync deliberately, declared independently for the same decoupling reason as JarvisConversationEvidence. */
export type JarvisConversationFollowUp = {
  kind: JarvisFollowUpKind;
  text: string;
};

export type JarvisDeferredDecisionStatus = "waiting" | "deferred";

export type JarvisConversationDecision = {
  title: string;
  detail: string;
  status: JarvisDeferredDecisionStatus;
};

/**
 * Marks that the action implied by this turn would require an approved
 * command before anything could actually happen. This is a marker only —
 * the engine never issues, requests, or simulates issuing a real approval;
 * it only flags that one would be needed, mirroring ApprovalPlaceholder's
 * "would_require_approval" framing in the existing frontend simulation.
 */
export type JarvisApprovalNeededMarker = {
  required: true;
  reason: string;
};

export type JarvisConversationResponse = {
  answerText: string;
  evidence: JarvisConversationEvidence[];
  memoryRetrieval: MemoryRetrievalStatus;
  followUpSuggestion?: JarvisConversationFollowUp;
  deferredDecision?: JarvisConversationDecision;
  approvalNeeded?: JarvisApprovalNeededMarker;
};

export type JarvisConversationTurn = {
  input: JarvisConversationInput;
  response: JarvisConversationResponse;
  occurredAt: string;
};

/**
 * The minimal "ask for memory" interface the engine may be given. Deliberately
 * narrower and more abstract than apps/glassmind's GlassmindStore — this
 * package does not depend on apps/glassmind's exact record shapes, only on
 * "give me a scoped or source-referenced set of small, evidence-bearing
 * facts." A real wiring of GlassmindStore behind this interface is later,
 * separate integration work, not something this skeleton presupposes.
 */
export type JarvisMemoryQuery = {
  scope?: JarvisEntityScope;
  sourceReference?: {
    conversationId?: string;
    messageId?: string;
    recommendationId?: string;
    eventId?: string;
  };
};

export type JarvisMemoryRecord = {
  summary: string;
  evidence?: JarvisConversationEvidence;
};

export interface JarvisMemoryStore {
  retrieve(query: JarvisMemoryQuery): JarvisMemoryRecord[];
}

/** The engine contract every implementation (deterministic skeleton or, later, a real one) satisfies. */
export interface JarvisConversationEngine {
  processTurn(input: JarvisConversationInput): JarvisConversationResponse;
}
