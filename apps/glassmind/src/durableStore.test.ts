import { describe, expect, it, vi } from "vitest";
import { DurableGlassmindStore, type GlassmindPersistenceDriver } from "./durableStore.js";
import { GlassmindPersistenceNotConfiguredError, InvalidSourceReferenceError } from "./errors.js";
import type { FollowUpMemoryRecord, GlassmindMemoryRecord } from "./types.js";

function buildFollowUp(overrides: Partial<FollowUpMemoryRecord> = {}): FollowUpMemoryRecord {
  return {
    kind: "follow_up",
    id: "followup-1",
    followUpKind: "question",
    text: "Should I reassign this mission?",
    status: "open",
    sourceReference: { conversationId: "conv-1" },
    scope: { entityKind: "mission", entityId: "m-1" },
    occurredAt: "2026-06-29T00:00:00.000Z",
    confidence: 60,
    ...overrides,
  };
}

/** Minimal in-memory fake of GlassmindPersistenceDriver, for delegation tests only. */
function createFakeDriver(): GlassmindPersistenceDriver & { records: GlassmindMemoryRecord[] } {
  const records: GlassmindMemoryRecord[] = [];
  return {
    records,
    insertRecord: vi.fn((record: GlassmindMemoryRecord) => {
      records.push(record);
      return record;
    }),
    updateRecord: vi.fn((record: GlassmindMemoryRecord) => {
      const index = records.findIndex((existing) => existing.kind === record.kind && existing.id === record.id);
      if (index !== -1) {
        records[index] = record;
      }
      return record;
    }),
    findById: vi.fn((kind: GlassmindMemoryRecord["kind"], id: string) =>
      records.find((record) => record.kind === kind && record.id === id),
    ),
    findBySourceReference: vi.fn((sourceReference) =>
      records.filter(
        (record) =>
          (sourceReference.conversationId !== undefined && record.sourceReference.conversationId === sourceReference.conversationId) ||
          (sourceReference.messageId !== undefined && record.sourceReference.messageId === sourceReference.messageId) ||
          (sourceReference.recommendationId !== undefined && record.sourceReference.recommendationId === sourceReference.recommendationId) ||
          (sourceReference.eventId !== undefined && record.sourceReference.eventId === sourceReference.eventId),
      ),
    ),
    findByScope: vi.fn((scope) =>
      records.filter((record) => record.scope.entityKind === scope.entityKind && record.scope.entityId === scope.entityId),
    ),
  };
}

describe("DurableGlassmindStore — without a configured driver", () => {
  it("rejects recordFollowUp with a clear not-configured error", () => {
    const store = new DurableGlassmindStore();
    expect(() => store.recordFollowUp(buildFollowUp())).toThrow(GlassmindPersistenceNotConfiguredError);
  });

  it("rejects retrieveByScope with a clear not-configured error", () => {
    const store = new DurableGlassmindStore();
    expect(() => store.retrieveByScope({ entityKind: "mission", entityId: "m-1" })).toThrow(GlassmindPersistenceNotConfiguredError);
  });

  it("rejects resolveFollowUp with a clear not-configured error", () => {
    const store = new DurableGlassmindStore();
    expect(() =>
      store.resolveFollowUp("followup-1", {
        status: "resolved",
        resolvedAt: "2026-06-29T01:00:00.000Z",
        resolvedBy: "jarvis",
        resolutionSourceReference: { conversationId: "conv-2" },
      }),
    ).toThrow(GlassmindPersistenceNotConfiguredError);
  });
});

describe("DurableGlassmindStore — provenance enforcement happens before persistence", () => {
  it("rejects an empty sourceReference even with a driver configured, and never calls the driver", () => {
    const driver = createFakeDriver();
    const store = new DurableGlassmindStore(driver);

    expect(() => store.recordFollowUp(buildFollowUp({ sourceReference: {} }))).toThrow(InvalidSourceReferenceError);
    expect(driver.insertRecord).not.toHaveBeenCalled();
  });

  it("rejects an empty resolutionSourceReference even with a driver configured, and never calls the driver", () => {
    const driver = createFakeDriver();
    const store = new DurableGlassmindStore(driver);

    expect(() =>
      store.resolveFollowUp("followup-1", {
        status: "resolved",
        resolvedAt: "2026-06-29T01:00:00.000Z",
        resolvedBy: "jarvis",
        resolutionSourceReference: {},
      }),
    ).toThrow(InvalidSourceReferenceError);
    expect(driver.findById).not.toHaveBeenCalled();
    expect(driver.updateRecord).not.toHaveBeenCalled();
  });
});

describe("DurableGlassmindStore — retrieval delegates to the driver", () => {
  it("returns [] from a configured driver with no matching records", () => {
    const driver = createFakeDriver();
    const store = new DurableGlassmindStore(driver);

    expect(store.retrieveByScope({ entityKind: "mission", entityId: "no-such-mission" })).toEqual([]);
    expect(store.retrieveBySourceReference({ eventId: "no-such-event" })).toEqual([]);
  });

  it("delegates retrieveBySourceReference to the driver", () => {
    const driver = createFakeDriver();
    const store = new DurableGlassmindStore(driver);
    store.recordFollowUp(buildFollowUp({ sourceReference: { conversationId: "conv-42" } }));

    const results = store.retrieveBySourceReference({ conversationId: "conv-42" });

    expect(driver.findBySourceReference).toHaveBeenCalledWith({ conversationId: "conv-42" });
    expect(results).toHaveLength(1);
  });

  it("delegates retrieveByScope to the driver", () => {
    const driver = createFakeDriver();
    const store = new DurableGlassmindStore(driver);
    store.recordFollowUp(buildFollowUp({ scope: { entityKind: "mission", entityId: "m-scoped" } }));

    const results = store.retrieveByScope({ entityKind: "mission", entityId: "m-scoped" });

    expect(driver.findByScope).toHaveBeenCalledWith({ entityKind: "mission", entityId: "m-scoped" });
    expect(results).toHaveLength(1);
  });
});

describe("DurableGlassmindStore — lifecycle updates delegate correctly and preserve provenance", () => {
  it("resolves a follow-up through the driver and preserves the original sourceReference", () => {
    const driver = createFakeDriver();
    const store = new DurableGlassmindStore(driver);
    store.recordFollowUp(buildFollowUp({ id: "followup-resolve", sourceReference: { conversationId: "conv-original" } }));

    const resolved = store.resolveFollowUp("followup-resolve", {
      status: "resolved",
      resolvedAt: "2026-06-29T01:00:00.000Z",
      resolvedBy: "jarvis",
      resolutionSourceReference: { conversationId: "conv-resolution" },
    });

    expect(driver.findById).toHaveBeenCalledWith("follow_up", "followup-resolve");
    expect(driver.updateRecord).toHaveBeenCalled();
    expect(resolved.sourceReference).toEqual({ conversationId: "conv-original" });
    expect(resolved.resolution?.resolutionSourceReference).toEqual({ conversationId: "conv-resolution" });
    expect(resolved.status).toBe("resolved");
  });

  it("rejects resolving an unknown id via the driver", () => {
    const driver = createFakeDriver();
    const store = new DurableGlassmindStore(driver);

    expect(() =>
      store.resolveFollowUp("does-not-exist", {
        status: "resolved",
        resolvedAt: "2026-06-29T01:00:00.000Z",
        resolvedBy: "jarvis",
        resolutionSourceReference: { conversationId: "conv-2" },
      }),
    ).toThrow(/No follow_up record found/);
  });
});
