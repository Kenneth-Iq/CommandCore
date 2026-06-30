import { describe, expect, it } from "vitest";
import { InMemoryGlassmindStore } from "./inMemoryStore.js";
import { InvalidSourceReferenceError } from "./errors.js";
import type { ApprovalWaitingStateMemoryRecord, FollowUpMemoryRecord } from "./types.js";

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

function buildApprovalWaitingState(overrides: Partial<ApprovalWaitingStateMemoryRecord> = {}): ApprovalWaitingStateMemoryRecord {
  return {
    kind: "approval_waiting_state",
    id: "approval-1",
    title: "Reassign mission",
    detail: "Simulated approval rehearsal.",
    status: "awaiting",
    sourceReference: { recommendationId: "rec-1" },
    scope: { entityKind: "mission", entityId: "m-1" },
    occurredAt: "2026-06-29T00:00:00.000Z",
    confidence: 65,
    ...overrides,
  };
}

describe("InMemoryGlassmindStore — successful writes", () => {
  it("accepts a follow-up record with a valid sourceReference", () => {
    const store = new InMemoryGlassmindStore();
    const record = buildFollowUp();
    expect(store.recordFollowUp(record)).toBe(record);
  });

  it("accepts an approval waiting-state record with a valid sourceReference", () => {
    const store = new InMemoryGlassmindStore();
    const record = buildApprovalWaitingState();
    expect(store.recordApprovalWaitingState(record)).toBe(record);
  });
});

describe("InMemoryGlassmindStore — provenance enforcement", () => {
  it("rejects a follow-up record with an entirely empty sourceReference", () => {
    const store = new InMemoryGlassmindStore();
    const record = buildFollowUp({ sourceReference: {} });
    expect(() => store.recordFollowUp(record)).toThrow(InvalidSourceReferenceError);
  });

  it("rejects a deferred decision record with an entirely empty sourceReference", () => {
    const store = new InMemoryGlassmindStore();
    expect(() =>
      store.recordDeferredDecision({
        kind: "deferred_decision",
        id: "decision-1",
        title: "Review blocked mission",
        detail: "detail",
        status: "waiting",
        sourceReference: {},
        scope: { entityKind: "mission", entityId: "m-1" },
        occurredAt: "2026-06-29T00:00:00.000Z",
        confidence: 70,
      }),
    ).toThrow(/sourceReference must have at least one populated field/);
  });

  it("does not store a rejected record", () => {
    const store = new InMemoryGlassmindStore();
    expect(() => store.recordFollowUp(buildFollowUp({ sourceReference: {} }))).toThrow();
    expect(store.retrieveByScope({ entityKind: "mission", entityId: "m-1" })).toHaveLength(0);
  });
});

describe("InMemoryGlassmindStore — retrieval by source reference", () => {
  it("retrieves a record by its exact sourceReference", () => {
    const store = new InMemoryGlassmindStore();
    const record = buildFollowUp({ sourceReference: { conversationId: "conv-42" } });
    store.recordFollowUp(record);

    const results = store.retrieveBySourceReference({ conversationId: "conv-42" });
    expect(results).toHaveLength(1);
    expect(results[0]).toBe(record);
  });

  it("does not match a different sourceReference value", () => {
    const store = new InMemoryGlassmindStore();
    store.recordFollowUp(buildFollowUp({ sourceReference: { conversationId: "conv-42" } }));

    expect(store.retrieveBySourceReference({ conversationId: "conv-does-not-exist" })).toHaveLength(0);
  });
});

describe("InMemoryGlassmindStore — retrieval by scope", () => {
  it("retrieves records across categories sharing the same scope", () => {
    const store = new InMemoryGlassmindStore();
    store.recordFollowUp(buildFollowUp({ scope: { entityKind: "mission", entityId: "m-shared" } }));
    store.recordApprovalWaitingState(buildApprovalWaitingState({ scope: { entityKind: "mission", entityId: "m-shared" } }));

    const results = store.retrieveByScope({ entityKind: "mission", entityId: "m-shared" });
    expect(results).toHaveLength(2);
    expect(results.map((record) => record.kind).sort()).toEqual(["approval_waiting_state", "follow_up"]);
  });
});

describe("InMemoryGlassmindStore — empty retrieval is honest, not an error", () => {
  it("returns an empty array, not an error, when nothing matches the scope", () => {
    const store = new InMemoryGlassmindStore();
    expect(() => store.retrieveByScope({ entityKind: "mission", entityId: "no-such-mission" })).not.toThrow();
    expect(store.retrieveByScope({ entityKind: "mission", entityId: "no-such-mission" })).toEqual([]);
  });

  it("returns an empty array, not an error, when nothing matches the sourceReference", () => {
    const store = new InMemoryGlassmindStore();
    expect(() => store.retrieveBySourceReference({ eventId: "no-such-event" })).not.toThrow();
    expect(store.retrieveBySourceReference({ eventId: "no-such-event" })).toEqual([]);
  });
});
