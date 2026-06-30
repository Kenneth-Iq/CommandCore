import type {
  ApprovalWaitingStateMemoryRecord,
  ConversationTurnRecord,
  DeferredDecisionMemoryRecord,
  FollowUpMemoryRecord,
  GlassmindMemoryRecord,
  RecordScope,
  ResolveDeferredDecisionInput,
  ResolveFollowUpInput,
  SourceReference,
  UpdateApprovalWaitingStateInput,
} from "./types.js";

/**
 * Glassmind Phase 1 storage contract, per
 * docs/architecture/Glassmind-Phase-1-Storage-Design.md §12 and the lifecycle
 * tightening from docs/engineering/Glassmind-Contract-Review.md §13.
 *
 * Every `record*` method must throw InvalidSourceReferenceError (see errors.ts)
 * when given a record whose sourceReference has no populated field — this is
 * a contract-level requirement, not an implementation detail left to whoever
 * builds a persistent backend later.
 *
 * `retrieveBySourceReference` and `retrieveByScope` are the only two read
 * methods Phase 1 needs, matching the storage design's "no scoped expansion,
 * no similarity search" boundary (§9, §10). An empty result from either is a
 * valid, honest answer — never an error, and callers must not synthesize a
 * recollection when the result is empty.
 *
 * The three lifecycle methods (`resolveFollowUp`, `resolveDeferredDecision`,
 * `updateApprovalWaitingState`) mutate an existing record's status and attach
 * lifecycle metadata (see types.ts `LifecycleResolution`/`LifecycleUpdate`).
 * They never touch the record's original `sourceReference` — only its own
 * resolution/update source reference, which must independently satisfy the
 * same provenance gate as record creation. They reject an unknown id cleanly
 * (RecordNotFoundError) rather than creating a new record.
 *
 * This interface has no method that mutates a Mission, Agent, Tool,
 * Conversation, or Approval Engine record. Glassmind reads from CommandCore
 * (via a future ingestion path, not modeled here) and is read by Jarvis/Nexus;
 * it never writes back into CommandCore state. Lifecycle methods only mutate
 * Glassmind's own remembered copy of a status — they are not, and must not be
 * read as, the authoritative operational state for that approval/follow-up/
 * decision. CommandCore remains the source of truth for current state.
 */
export interface GlassmindStore {
  recordConversationTurn(record: ConversationTurnRecord): ConversationTurnRecord;
  recordFollowUp(record: FollowUpMemoryRecord): FollowUpMemoryRecord;
  recordDeferredDecision(record: DeferredDecisionMemoryRecord): DeferredDecisionMemoryRecord;
  recordApprovalWaitingState(record: ApprovalWaitingStateMemoryRecord): ApprovalWaitingStateMemoryRecord;

  retrieveBySourceReference(sourceReference: SourceReference): GlassmindMemoryRecord[];
  retrieveByScope(scope: RecordScope): GlassmindMemoryRecord[];

  resolveFollowUp(id: string, input: ResolveFollowUpInput): FollowUpMemoryRecord;
  resolveDeferredDecision(id: string, input: ResolveDeferredDecisionInput): DeferredDecisionMemoryRecord;
  updateApprovalWaitingState(id: string, input: UpdateApprovalWaitingStateInput): ApprovalWaitingStateMemoryRecord;
}
