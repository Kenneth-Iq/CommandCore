import { describe, expect, it } from "vitest";
import { DatabaseGlassmindPersistenceDriver, type DatabaseClient } from "./databaseDriver.js";
import type { FollowUpMemoryRecord, GlassmindMemoryRecord, RecordScope, SourceReference } from "./types.js";

/**
 * Fake DatabaseClient for tests — tracks call counts/arguments so tests can
 * assert the driver delegates correctly, and stores records exactly as
 * given so tests can assert nothing is mutated or enriched in transit.
 * Exported for reuse by glassmindStoreParity.test.ts's third
 * implementation entry (DurableGlassmindStore + DatabaseGlassmindPersistenceDriver).
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

function buildFollowUp(overrides: Partial<FollowUpMemoryRecord> = {}): FollowUpMemoryRecord {
  return {
    kind: "follow_up",
    id: "followup-1",
    followUpKind: "question",
    text: "Should I reassign this mission?",
    status: "open",
    sourceReference: { conversationId: "conv-1" },
    scope: { entityKind: "mission", entityId: "m-1" },
    occurredAt: "2026-06-30T00:00:00.000Z",
    confidence: 60,
    ...overrides,
  };
}

describe("DatabaseGlassmindPersistenceDriver", () => {
  it("delegates insertRecord to the client's insert method", () => {
    const client = new FakeDatabaseClient();
    const driver = new DatabaseGlassmindPersistenceDriver(client);
    const record = buildFollowUp();

    const result = driver.insertRecord(record);

    expect(client.insertCalls).toEqual([record]);
    expect(result).toBe(record);
  });

  it("delegates updateRecord to the client's update method", () => {
    const client = new FakeDatabaseClient();
    const driver = new DatabaseGlassmindPersistenceDriver(client);
    const record = buildFollowUp({ status: "resolved" });

    const result = driver.updateRecord(record);

    expect(client.updateCalls).toEqual([record]);
    expect(result).toBe(record);
  });

  it("delegates findById to the client's findById method", () => {
    const client = new FakeDatabaseClient();
    const driver = new DatabaseGlassmindPersistenceDriver(client);
    client.insert(buildFollowUp({ id: "followup-find" }));

    const result = driver.findById("follow_up", "followup-find");

    expect(client.findByIdCalls).toEqual([{ kind: "follow_up", id: "followup-find" }]);
    expect(result?.id).toBe("followup-find");
  });

  it("delegates findBySourceReference to the client's findBySourceReference method", () => {
    const client = new FakeDatabaseClient();
    const driver = new DatabaseGlassmindPersistenceDriver(client);
    client.insert(buildFollowUp({ sourceReference: { conversationId: "conv-42" } }));

    const results = driver.findBySourceReference({ conversationId: "conv-42" });

    expect(client.findBySourceReferenceCalls).toEqual([{ conversationId: "conv-42" }]);
    expect(results).toHaveLength(1);
  });

  it("delegates findByScope to the client's findByScope method", () => {
    const client = new FakeDatabaseClient();
    const driver = new DatabaseGlassmindPersistenceDriver(client);
    client.insert(buildFollowUp({ scope: { entityKind: "mission", entityId: "m-99" } }));

    const results = driver.findByScope({ entityKind: "mission", entityId: "m-99" });

    expect(client.findByScopeCalls).toEqual([{ entityKind: "mission", entityId: "m-99" }]);
    expect(results).toHaveLength(1);
  });

  it("returns [] for retrieval with no matches — empty retrieval is honest, not an error", () => {
    const client = new FakeDatabaseClient();
    const driver = new DatabaseGlassmindPersistenceDriver(client);

    expect(driver.findBySourceReference({ eventId: "no-such-event" })).toEqual([]);
    expect(driver.findByScope({ entityKind: "mission", entityId: "no-such-mission" })).toEqual([]);
    expect(driver.findById("follow_up", "no-such-id")).toBeUndefined();
  });

  it("does not mutate or enrich records with raw payloads — the record returned is exactly what the client returned", () => {
    const client = new FakeDatabaseClient();
    const driver = new DatabaseGlassmindPersistenceDriver(client);
    const record = buildFollowUp();

    const inserted = driver.insertRecord(record);

    expect(inserted).toEqual(record);
    expect(Object.keys(inserted)).toEqual(Object.keys(record));
    expect((inserted as Record<string, unknown>).payload).toBeUndefined();
    expect((inserted as Record<string, unknown>).rawEvent).toBeUndefined();
  });
});
