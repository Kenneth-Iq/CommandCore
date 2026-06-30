import { assertValidSourceReference, GlassmindPersistenceNotConfiguredError, RecordNotFoundError } from "./errors.js";
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
 * Narrow persistence driver seam for DurableGlassmindStore, per
 * docs/architecture/Glassmind-Durable-Adapter-Design.md §3 and §10.
 *
 * apps/glassmind never depends on a specific database technology — a real
 * adapter implements this interface against whatever storage technology is
 * eventually chosen (see the durable adapter design document's explicit
 * deferral of that choice). This skeleton ships no implementation of this
 * interface; only DurableGlassmindStore, which requires one to be injected.
 *
 * Deliberately synchronous in this skeleton, matching GlassmindStore's own
 * synchronous interface exactly — evolving either interface to be async is
 * real, future work (a real database driver will likely need it), not
 * something this skeleton should presuppose or work around quietly.
 */
export interface GlassmindPersistenceDriver {
  insertRecord(record: GlassmindMemoryRecord): GlassmindMemoryRecord;
  updateRecord(record: GlassmindMemoryRecord): GlassmindMemoryRecord;
  findById(kind: GlassmindMemoryRecord["kind"], id: string): GlassmindMemoryRecord | undefined;
  findBySourceReference(sourceReference: SourceReference): GlassmindMemoryRecord[];
  findByScope(scope: RecordScope): GlassmindMemoryRecord[];
}

/**
 * Durable GlassmindStore skeleton, per
 * docs/architecture/Glassmind-Durable-Adapter-Design.md.
 *
 * Implements the exact same GlassmindStore interface InMemoryGlassmindStore
 * does — no interface changes — but delegates all actual storage to an
 * injected GlassmindPersistenceDriver instead of holding records in process
 * memory. With no driver configured (the default), every method throws
 * GlassmindPersistenceNotConfiguredError rather than connecting to a real
 * database or silently behaving like an in-memory store.
 *
 * Provenance enforcement (assertValidSourceReference) and id-not-found
 * rejection (RecordNotFoundError) happen here, in the Glassmind layer,
 * before the driver is ever called — per the durable adapter design's
 * requirement that the application-level check run unconditionally as the
 * first step of every write/update, regardless of what the storage layer
 * itself can or cannot enforce natively.
 *
 * This class never calls anything outside the injected driver — no network
 * call, no CommandCore import, no Nexus import. It cannot become a
 * CommandCore write path because it has no path to CommandCore at all.
 */
export class DurableGlassmindStore implements GlassmindStore {
  constructor(private readonly driver?: GlassmindPersistenceDriver) {}

  private requireDriver(operation: string): GlassmindPersistenceDriver {
    if (!this.driver) {
      throw new GlassmindPersistenceNotConfiguredError(operation);
    }
    return this.driver;
  }

  recordConversationTurn(record: ConversationTurnRecord): ConversationTurnRecord {
    assertValidSourceReference(record.sourceReference, "conversation_turn");
    const driver = this.requireDriver("recordConversationTurn");
    return driver.insertRecord(record) as ConversationTurnRecord;
  }

  recordFollowUp(record: FollowUpMemoryRecord): FollowUpMemoryRecord {
    assertValidSourceReference(record.sourceReference, "follow_up");
    const driver = this.requireDriver("recordFollowUp");
    return driver.insertRecord(record) as FollowUpMemoryRecord;
  }

  recordDeferredDecision(record: DeferredDecisionMemoryRecord): DeferredDecisionMemoryRecord {
    assertValidSourceReference(record.sourceReference, "deferred_decision");
    const driver = this.requireDriver("recordDeferredDecision");
    return driver.insertRecord(record) as DeferredDecisionMemoryRecord;
  }

  recordApprovalWaitingState(record: ApprovalWaitingStateMemoryRecord): ApprovalWaitingStateMemoryRecord {
    assertValidSourceReference(record.sourceReference, "approval_waiting_state");
    const driver = this.requireDriver("recordApprovalWaitingState");
    return driver.insertRecord(record) as ApprovalWaitingStateMemoryRecord;
  }

  retrieveBySourceReference(sourceReference: SourceReference): GlassmindMemoryRecord[] {
    const driver = this.requireDriver("retrieveBySourceReference");
    return driver.findBySourceReference(sourceReference);
  }

  retrieveByScope(scope: RecordScope): GlassmindMemoryRecord[] {
    const driver = this.requireDriver("retrieveByScope");
    return driver.findByScope(scope);
  }

  resolveFollowUp(id: string, input: ResolveFollowUpInput): FollowUpMemoryRecord {
    assertValidSourceReference(input.resolutionSourceReference, "follow_up_resolution");
    const driver = this.requireDriver("resolveFollowUp");

    const existing = driver.findById("follow_up", id) as FollowUpMemoryRecord | undefined;
    if (!existing) {
      throw new RecordNotFoundError("follow_up", id);
    }

    const updated: FollowUpMemoryRecord = {
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
    return driver.updateRecord(updated) as FollowUpMemoryRecord;
  }

  resolveDeferredDecision(id: string, input: ResolveDeferredDecisionInput): DeferredDecisionMemoryRecord {
    assertValidSourceReference(input.resolutionSourceReference, "deferred_decision_resolution");
    const driver = this.requireDriver("resolveDeferredDecision");

    const existing = driver.findById("deferred_decision", id) as DeferredDecisionMemoryRecord | undefined;
    if (!existing) {
      throw new RecordNotFoundError("deferred_decision", id);
    }

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
    return driver.updateRecord(updated) as DeferredDecisionMemoryRecord;
  }

  updateApprovalWaitingState(id: string, input: UpdateApprovalWaitingStateInput): ApprovalWaitingStateMemoryRecord {
    assertValidSourceReference(input.updateSourceReference, "approval_waiting_state_update");
    const driver = this.requireDriver("updateApprovalWaitingState");

    const existing = driver.findById("approval_waiting_state", id) as ApprovalWaitingStateMemoryRecord | undefined;
    if (!existing) {
      throw new RecordNotFoundError("approval_waiting_state", id);
    }

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
    return driver.updateRecord(updated) as ApprovalWaitingStateMemoryRecord;
  }
}
