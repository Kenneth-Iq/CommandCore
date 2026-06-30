import type { GlassmindMemoryRecord, RecordScope, SourceReference } from "./types.js";

/**
 * Shared matching logic used by every in-memory-backed GlassmindStore
 * implementation in this package (InMemoryGlassmindStore directly, and
 * InMemoryGlassmindPersistenceDriver via DurableGlassmindStore). Extracted
 * here specifically so both implementations match records identically —
 * contract-parity tests (see glassmindStoreParity.test.ts) depend on this
 * being one shared implementation, not two independently-written copies
 * that could quietly drift apart.
 */
export function matchesSourceReference(record: GlassmindMemoryRecord, sourceReference: SourceReference): boolean {
  return (
    (sourceReference.conversationId !== undefined && record.sourceReference.conversationId === sourceReference.conversationId) ||
    (sourceReference.messageId !== undefined && record.sourceReference.messageId === sourceReference.messageId) ||
    (sourceReference.recommendationId !== undefined && record.sourceReference.recommendationId === sourceReference.recommendationId) ||
    (sourceReference.eventId !== undefined && record.sourceReference.eventId === sourceReference.eventId)
  );
}

export function matchesScope(record: GlassmindMemoryRecord, scope: RecordScope): boolean {
  return record.scope.entityKind === scope.entityKind && record.scope.entityId === scope.entityId;
}
