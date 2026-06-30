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
