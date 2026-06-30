/**
 * Glassmind Phase 1 type contracts.
 *
 * These types implement docs/architecture/Glassmind-Phase-1-Storage-Design.md
 * sections 4-9 exactly. They are intentionally framework-free and have no
 * dependency on the Nexus frontend or on CommandCore's kernel — Glassmind
 * reads from CommandCore via ingestion (not modeled in this skeleton yet)
 * and is read by Jarvis/Nexus, but never writes back into CommandCore state.
 *
 * Non-goals enforced by this file's shape alone (see storage design §10):
 * no embedding/vector fields, no semantic "pattern" records, no raw event
 * payload duplication — every record below is a small, explainable shape
 * with a mandatory source reference.
 */

/** The entity-identifier space already used throughout Nexus (RouteSelection/EvidenceLink). */
export type EntityKind =
  | "mission"
  | "agent"
  | "tool"
  | "knowledge"
  | "conversation"
  | "workspace"
  | "company"
  | "project"
  | "recommendation";

export type RecordScope = {
  entityKind: EntityKind;
  entityId: string;
};

/**
 * Provenance. Every Glassmind record must carry one of these with at least
 * one field populated — see storage design §8. This is enforced as a hard
 * gate in the store implementations, not merely documented here.
 */
export type SourceReference = {
  conversationId?: string;
  messageId?: string;
  recommendationId?: string;
  eventId?: string;
};

/**
 * The minimum retrieval metadata Phase 1's two supported retrieval stages
 * (working-memory check, exact-reference lookup) need — see storage design §9.
 * No corroboration-count or ranking metadata belongs here; that is company
 * memory's concern (Phase 2), not Phase 1's.
 */
export type RetrievalMetadata = {
  scope: RecordScope;
  occurredAt: string;
  confidence: number;
};

/**
 * Structurally identical to Nexus's EvidenceLink, declared independently so
 * this package has zero dependency on the frontend. `page` and `selection`
 * are intentionally untyped strings/records rather than importing NavPage/
 * RouteSelection from apps/nexus-console.
 */
export type EvidenceLink = {
  label: string;
  page: string;
  selection?: Record<string, string | undefined>;
};

export type ConversationTurnApprovalStatus =
  | "not_required"
  | "would_require_approval"
  | "pending_approval"
  | "approved"
  | "rejected";

export type ConversationTurnRecord = RetrievalMetadata & {
  kind: "conversation_turn";
  id: string;
  conversationId: string;
  threadId?: string;
  sender: "jarvis" | "user";
  intentKind: string;
  intentConfidence: number;
  evidence: EvidenceLink[];
  responseSummary: string;
  approvalStatus: ConversationTurnApprovalStatus;
  sourceReference: SourceReference;
};

/**
 * Lifecycle metadata recorded when a follow-up or deferred decision is
 * resolved. `resolutionSourceReference` is deliberately a separate field
 * from the record's original `sourceReference` — a lifecycle update never
 * overwrites the provenance of why the record was first created; it adds
 * provenance for why/how it was resolved, alongside the original.
 */
export type LifecycleResolution = {
  resolvedAt: string;
  resolvedBy: string;
  resolutionSourceReference: SourceReference;
  resolutionNote?: string;
};

/**
 * Update metadata recorded when an approval waiting-state record's status
 * changes. Approvals use "update" rather than "resolution" vocabulary
 * because a waiting-state record may change status more than once (for
 * example awaiting -> deferred -> approved) rather than reaching one final
 * resolution the way a follow-up or decision does.
 */
export type LifecycleUpdate = {
  updatedAt: string;
  updateSourceReference: SourceReference;
  resolutionNote?: string;
};

export type FollowUpKind = "question" | "waiting" | "postponed" | "review";
export type FollowUpStatus = "open" | "resolved" | "deferred" | "expired";

export type FollowUpMemoryRecord = RetrievalMetadata & {
  kind: "follow_up";
  id: string;
  followUpKind: FollowUpKind;
  text: string;
  status: FollowUpStatus;
  evidence?: EvidenceLink;
  sourceReference: SourceReference;
  resolution?: LifecycleResolution;
};

export type DeferredDecisionStatus = "waiting" | "deferred" | "completed" | "info";

export type DeferredDecisionMemoryRecord = RetrievalMetadata & {
  kind: "deferred_decision";
  id: string;
  title: string;
  detail: string;
  status: DeferredDecisionStatus;
  evidence?: EvidenceLink;
  sourceReference: SourceReference;
  resolution?: LifecycleResolution;
};

export type ApprovalWaitingStatus = "awaiting" | "approved" | "deferred" | "rejected";

/**
 * Glassmind's memory that an approval was requested and what its disposition
 * was — explicitly not the Approval Engine's live state. See storage design
 * §7: once a real Approval Engine exists, this record's `status` should be a
 * read-through reflection of that engine, never an independently-drifting copy.
 */
export type ApprovalWaitingStateMemoryRecord = RetrievalMetadata & {
  kind: "approval_waiting_state";
  id: string;
  title: string;
  detail: string;
  status: ApprovalWaitingStatus;
  evidence?: EvidenceLink;
  sourceReference: SourceReference;
  update?: LifecycleUpdate;
};

export type GlassmindMemoryRecord =
  | ConversationTurnRecord
  | FollowUpMemoryRecord
  | DeferredDecisionMemoryRecord
  | ApprovalWaitingStateMemoryRecord;

export type ResolveFollowUpInput = {
  status: FollowUpStatus;
  resolvedAt: string;
  resolvedBy: string;
  resolutionSourceReference: SourceReference;
  resolutionNote?: string;
};

export type ResolveDeferredDecisionInput = {
  status: DeferredDecisionStatus;
  resolvedAt: string;
  resolvedBy: string;
  resolutionSourceReference: SourceReference;
  resolutionNote?: string;
};

export type UpdateApprovalWaitingStateInput = {
  status: ApprovalWaitingStatus;
  updatedAt: string;
  updateSourceReference: SourceReference;
  resolutionNote?: string;
};
