import type { SourceReference } from "./types.js";

/**
 * Thrown when a write to any GlassmindStore method carries a SourceReference
 * with every field empty. This is the single hard gate the storage design
 * document (§8, §13) and the Jarvis Conversation Engine Boundary document
 * (§10, §11) both call out as the rule most likely to erode under schedule
 * pressure: provenance is enforced here, at the store boundary, not left to
 * code review or a linter.
 */
export class InvalidSourceReferenceError extends Error {
  constructor(recordKind: string) {
    super(
      `Refusing to record a ${recordKind}: sourceReference must have at least one populated field ` +
        `(conversationId, messageId, recommendationId, or eventId). Glassmind never stores a memory ` +
        `that cannot be traced back to a real source record.`,
    );
    this.name = "InvalidSourceReferenceError";
  }
}

export function assertValidSourceReference(sourceReference: SourceReference, recordKind: string): void {
  const hasProvenance =
    Boolean(sourceReference.conversationId) ||
    Boolean(sourceReference.messageId) ||
    Boolean(sourceReference.recommendationId) ||
    Boolean(sourceReference.eventId);

  if (!hasProvenance) {
    throw new InvalidSourceReferenceError(recordKind);
  }
}

/**
 * Thrown when a lifecycle method (resolveFollowUp, resolveDeferredDecision,
 * updateApprovalWaitingState) is called with an id that does not match any
 * record currently held by the store. Lifecycle methods mutate an existing
 * memory record; there is no "upsert" — an unknown id is always rejected
 * cleanly rather than silently creating a new record.
 */
export class RecordNotFoundError extends Error {
  constructor(recordKind: string, id: string) {
    super(`No ${recordKind} record found with id "${id}". Lifecycle methods only update existing records.`);
    this.name = "RecordNotFoundError";
  }
}
