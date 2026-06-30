import type { DatabaseClient } from "./databaseDriver.js";
import type { GlassmindMemoryRecord, RecordScope, SourceReference } from "./types.js";

/**
 * Call-tracking fake DatabaseClient, shared by databaseDriver.test.ts and
 * provenanceBoundary.test.ts. Lives outside any *.test.ts file deliberately
 * — vitest re-executes a module's top-level code (including describe()
 * blocks) every time it is imported, so importing one test file from
 * another would silently duplicate that file's test run. Extracting the
 * shared fixture here avoids that without duplicating the fake's logic.
 */
export class FakeDatabaseClient implements DatabaseClient {
  readonly insertCalls: GlassmindMemoryRecord[] = [];
  readonly updateCalls: GlassmindMemoryRecord[] = [];
  readonly findByIdCalls: Array<{ kind: GlassmindMemoryRecord["kind"]; id: string }> = [];
  readonly findBySourceReferenceCalls: SourceReference[] = [];
  readonly findByScopeCalls: RecordScope[] = [];

  private readonly recordsByKind: Record<GlassmindMemoryRecord["kind"], GlassmindMemoryRecord[]> = {
    conversation_turn: [],
    follow_up: [],
    deferred_decision: [],
    approval_waiting_state: [],
  };

  insert(record: GlassmindMemoryRecord): GlassmindMemoryRecord {
    this.insertCalls.push(record);
    this.recordsByKind[record.kind].push(record);
    return record;
  }

  update(record: GlassmindMemoryRecord): GlassmindMemoryRecord {
    this.updateCalls.push(record);
    const list = this.recordsByKind[record.kind];
    const index = list.findIndex((existing) => existing.id === record.id);
    if (index === -1) {
      list.push(record);
    } else {
      list[index] = record;
    }
    return record;
  }

  findById(kind: GlassmindMemoryRecord["kind"], id: string): GlassmindMemoryRecord | undefined {
    this.findByIdCalls.push({ kind, id });
    return this.recordsByKind[kind].find((record) => record.id === id);
  }

  findBySourceReference(sourceReference: SourceReference): GlassmindMemoryRecord[] {
    this.findBySourceReferenceCalls.push(sourceReference);
    return this.allRecords().filter((record) =>
      (sourceReference.conversationId !== undefined && record.sourceReference.conversationId === sourceReference.conversationId) ||
      (sourceReference.messageId !== undefined && record.sourceReference.messageId === sourceReference.messageId) ||
      (sourceReference.recommendationId !== undefined && record.sourceReference.recommendationId === sourceReference.recommendationId) ||
      (sourceReference.eventId !== undefined && record.sourceReference.eventId === sourceReference.eventId),
    );
  }

  findByScope(scope: RecordScope): GlassmindMemoryRecord[] {
    this.findByScopeCalls.push(scope);
    return this.allRecords().filter(
      (record) => record.scope.entityKind === scope.entityKind && record.scope.entityId === scope.entityId,
    );
  }

  private allRecords(): GlassmindMemoryRecord[] {
    return [
      ...this.recordsByKind.conversation_turn,
      ...this.recordsByKind.follow_up,
      ...this.recordsByKind.deferred_decision,
      ...this.recordsByKind.approval_waiting_state,
    ];
  }
}
