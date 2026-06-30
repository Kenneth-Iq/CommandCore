import { assertValidSourceReference } from "./errors.js";
import type { GlassmindStore } from "./store.js";
import type {
  ApprovalWaitingStateMemoryRecord,
  ConversationTurnRecord,
  DeferredDecisionMemoryRecord,
  FollowUpMemoryRecord,
  GlassmindMemoryRecord,
  RecordScope,
  SourceReference,
} from "./types.js";

function matchesSourceReference(record: GlassmindMemoryRecord, sourceReference: SourceReference): boolean {
  return (
    (sourceReference.conversationId !== undefined && record.sourceReference.conversationId === sourceReference.conversationId) ||
    (sourceReference.messageId !== undefined && record.sourceReference.messageId === sourceReference.messageId) ||
    (sourceReference.recommendationId !== undefined && record.sourceReference.recommendationId === sourceReference.recommendationId) ||
    (sourceReference.eventId !== undefined && record.sourceReference.eventId === sourceReference.eventId)
  );
}

function matchesScope(record: GlassmindMemoryRecord, scope: RecordScope): boolean {
  return record.scope.entityKind === scope.entityKind && record.scope.entityId === scope.entityId;
}

/**
 * Development/testing-only in-memory implementation of GlassmindStore.
 * Per docs/architecture/Glassmind-Phase-1-Storage-Design.md, no database
 * persistence is added in this skeleton — records live only as long as the
 * process does. A durable backend is a separate, later implementation that
 * should satisfy the same GlassmindStore contract this class implements.
 */
export class InMemoryGlassmindStore implements GlassmindStore {
  private readonly conversationTurns: ConversationTurnRecord[] = [];
  private readonly followUps: FollowUpMemoryRecord[] = [];
  private readonly deferredDecisions: DeferredDecisionMemoryRecord[] = [];
  private readonly approvalWaitingStates: ApprovalWaitingStateMemoryRecord[] = [];

  recordConversationTurn(record: ConversationTurnRecord): ConversationTurnRecord {
    assertValidSourceReference(record.sourceReference, "conversation_turn");
    this.conversationTurns.push(record);
    return record;
  }

  recordFollowUp(record: FollowUpMemoryRecord): FollowUpMemoryRecord {
    assertValidSourceReference(record.sourceReference, "follow_up");
    this.followUps.push(record);
    return record;
  }

  recordDeferredDecision(record: DeferredDecisionMemoryRecord): DeferredDecisionMemoryRecord {
    assertValidSourceReference(record.sourceReference, "deferred_decision");
    this.deferredDecisions.push(record);
    return record;
  }

  recordApprovalWaitingState(record: ApprovalWaitingStateMemoryRecord): ApprovalWaitingStateMemoryRecord {
    assertValidSourceReference(record.sourceReference, "approval_waiting_state");
    this.approvalWaitingStates.push(record);
    return record;
  }

  private allRecords(): GlassmindMemoryRecord[] {
    return [
      ...this.conversationTurns,
      ...this.followUps,
      ...this.deferredDecisions,
      ...this.approvalWaitingStates,
    ];
  }

  retrieveBySourceReference(sourceReference: SourceReference): GlassmindMemoryRecord[] {
    return this.allRecords().filter((record) => matchesSourceReference(record, sourceReference));
  }

  retrieveByScope(scope: RecordScope): GlassmindMemoryRecord[] {
    return this.allRecords().filter((record) => matchesScope(record, scope));
  }
}
