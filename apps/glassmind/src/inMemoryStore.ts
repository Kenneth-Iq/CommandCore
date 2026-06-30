import { assertValidSourceReference, RecordNotFoundError } from "./errors.js";
import { matchesScope, matchesSourceReference } from "./recordMatchers.js";
import type { GlassmindStore } from "./store.js";
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

  resolveFollowUp(id: string, input: ResolveFollowUpInput): FollowUpMemoryRecord {
    assertValidSourceReference(input.resolutionSourceReference, "follow_up_resolution");

    const index = this.followUps.findIndex((record) => record.id === id);
    if (index === -1) {
      throw new RecordNotFoundError("follow_up", id);
    }

    const existing = this.followUps[index];
    const updated: FollowUpMemoryRecord = {
      ...existing,
      // sourceReference is never reassigned here — only resolution metadata is added.
      sourceReference: existing.sourceReference,
      status: input.status,
      resolution: {
        resolvedAt: input.resolvedAt,
        resolvedBy: input.resolvedBy,
        resolutionSourceReference: input.resolutionSourceReference,
        resolutionNote: input.resolutionNote,
      },
    };
    this.followUps[index] = updated;
    return updated;
  }

  resolveDeferredDecision(id: string, input: ResolveDeferredDecisionInput): DeferredDecisionMemoryRecord {
    assertValidSourceReference(input.resolutionSourceReference, "deferred_decision_resolution");

    const index = this.deferredDecisions.findIndex((record) => record.id === id);
    if (index === -1) {
      throw new RecordNotFoundError("deferred_decision", id);
    }

    const existing = this.deferredDecisions[index];
    const updated: DeferredDecisionMemoryRecord = {
      ...existing,
      sourceReference: existing.sourceReference,
      status: input.status,
      resolution: {
        resolvedAt: input.resolvedAt,
        resolvedBy: input.resolvedBy,
        resolutionSourceReference: input.resolutionSourceReference,
        resolutionNote: input.resolutionNote,
      },
    };
    this.deferredDecisions[index] = updated;
    return updated;
  }

  updateApprovalWaitingState(id: string, input: UpdateApprovalWaitingStateInput): ApprovalWaitingStateMemoryRecord {
    assertValidSourceReference(input.updateSourceReference, "approval_waiting_state_update");

    const index = this.approvalWaitingStates.findIndex((record) => record.id === id);
    if (index === -1) {
      throw new RecordNotFoundError("approval_waiting_state", id);
    }

    const existing = this.approvalWaitingStates[index];
    const updated: ApprovalWaitingStateMemoryRecord = {
      ...existing,
      sourceReference: existing.sourceReference,
      status: input.status,
      update: {
        updatedAt: input.updatedAt,
        updateSourceReference: input.updateSourceReference,
        resolutionNote: input.resolutionNote,
      },
    };
    this.approvalWaitingStates[index] = updated;
    return updated;
  }
}
