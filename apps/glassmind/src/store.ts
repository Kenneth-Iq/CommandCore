import type {
  ApprovalWaitingStateMemoryRecord,
  ConversationTurnRecord,
  DeferredDecisionMemoryRecord,
  FollowUpMemoryRecord,
  GlassmindMemoryRecord,
  RecordScope,
  SourceReference,
} from "./types.js";

/**
 * Glassmind Phase 1 storage contract, per
 * docs/architecture/Glassmind-Phase-1-Storage-Design.md §12.
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
 * This interface has no method that mutates a Mission, Agent, Tool,
 * Conversation, or Approval Engine record. Glassmind reads from CommandCore
 * (via a future ingestion path, not modeled here) and is read by Jarvis/Nexus;
 * it never writes back into CommandCore state.
 */
export interface GlassmindStore {
  recordConversationTurn(record: ConversationTurnRecord): ConversationTurnRecord;
  recordFollowUp(record: FollowUpMemoryRecord): FollowUpMemoryRecord;
  recordDeferredDecision(record: DeferredDecisionMemoryRecord): DeferredDecisionMemoryRecord;
  recordApprovalWaitingState(record: ApprovalWaitingStateMemoryRecord): ApprovalWaitingStateMemoryRecord;

  retrieveBySourceReference(sourceReference: SourceReference): GlassmindMemoryRecord[];
  retrieveByScope(scope: RecordScope): GlassmindMemoryRecord[];
}
