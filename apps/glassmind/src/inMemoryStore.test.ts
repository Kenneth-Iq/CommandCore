import { describe, expect, it } from "vitest";
import { InMemoryGlassmindStore } from "./inMemoryStore.js";
import { InvalidSourceReferenceError, RecordNotFoundError } from "./errors.js";
import type {
  ApprovalWaitingStateMemoryRecord,
  ConversationTurnRecord,
  DeferredDecisionMemoryRecord,
  FollowUpMemoryRecord,
} from "./types.js";

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

function buildConversationTurn(overrides: Partial<ConversationTurnRecord> = {}): ConversationTurnRecord {
  return {
    kind: "conversation_turn",
    id: "turn-1",
    conversationId: "conv-1",
    sender: "jarvis",
    intentKind: "mission",
    intentConfidence: 75,
    evidence: [{ label: "Open Mission", page: "missions" }],
    responseSummary: "There are 3 missions in view, 1 blocked.",
    approvalStatus: "not_required",
    sourceReference: { conversationId: "conv-1" },
    scope: { entityKind: "mission", entityId: "m-1" },
    occurredAt: "2026-06-29T00:00:00.000Z",
    confidence: 75,
    ...overrides,
  };
}

function buildDeferredDecision(overrides: Partial<DeferredDecisionMemoryRecord> = {}): DeferredDecisionMemoryRecord {
  return {
    kind: "deferred_decision",
    id: "decision-1",
    title: "Review blocked mission",
    detail: "Awaiting a decision on how to unblock or reassign this mission.",
    status: "waiting",
    sourceReference: { recommendationId: "rec-1" },
    scope: { entityKind: "mission", entityId: "m-1" },
    occurredAt: "2026-06-29T00:00:00.000Z",
    confidence: 70,
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

  it("accepts a conversation turn record with a valid sourceReference", () => {
    const store = new InMemoryGlassmindStore();
    const record = buildConversationTurn();
    expect(store.recordConversationTurn(record)).toBe(record);
  });

  it("accepts a deferred decision record with a valid sourceReference", () => {
    const store = new InMemoryGlassmindStore();
    const record = buildDeferredDecision();
    expect(store.recordDeferredDecision(record)).toBe(record);
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

  it("rejects a conversation turn record with an entirely empty sourceReference", () => {
    const store = new InMemoryGlassmindStore();
    const record = buildConversationTurn({ sourceReference: {} });
    expect(() => store.recordConversationTurn(record)).toThrow(InvalidSourceReferenceError);
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

describe("InMemoryGlassmindStore — resolveFollowUp", () => {
  it("resolves a follow-up and attaches resolution metadata, on the happy path", () => {
    const store = new InMemoryGlassmindStore();
    store.recordFollowUp(buildFollowUp({ id: "followup-resolve" }));

    const resolved = store.resolveFollowUp("followup-resolve", {
      status: "resolved",
      resolvedAt: "2026-06-29T01:00:00.000Z",
      resolvedBy: "jarvis",
      resolutionSourceReference: { conversationId: "conv-2" },
      resolutionNote: "Mission was reassigned.",
    });

    expect(resolved.status).toBe("resolved");
    expect(resolved.resolution).toEqual({
      resolvedAt: "2026-06-29T01:00:00.000Z",
      resolvedBy: "jarvis",
      resolutionSourceReference: { conversationId: "conv-2" },
      resolutionNote: "Mission was reassigned.",
    });
  });

  it("rejects resolution with an entirely empty resolutionSourceReference", () => {
    const store = new InMemoryGlassmindStore();
    store.recordFollowUp(buildFollowUp({ id: "followup-bad-resolution" }));

    expect(() =>
      store.resolveFollowUp("followup-bad-resolution", {
        status: "resolved",
        resolvedAt: "2026-06-29T01:00:00.000Z",
        resolvedBy: "jarvis",
        resolutionSourceReference: {},
      }),
    ).toThrow(InvalidSourceReferenceError);
  });

  it("rejects resolving an unknown follow-up id", () => {
    const store = new InMemoryGlassmindStore();
    expect(() =>
      store.resolveFollowUp("does-not-exist", {
        status: "resolved",
        resolvedAt: "2026-06-29T01:00:00.000Z",
        resolvedBy: "jarvis",
        resolutionSourceReference: { conversationId: "conv-2" },
      }),
    ).toThrow(RecordNotFoundError);
  });

  it("preserves the original sourceReference after resolution", () => {
    const store = new InMemoryGlassmindStore();
    store.recordFollowUp(buildFollowUp({ id: "followup-provenance", sourceReference: { conversationId: "conv-original" } }));

    const resolved = store.resolveFollowUp("followup-provenance", {
      status: "resolved",
      resolvedAt: "2026-06-29T01:00:00.000Z",
      resolvedBy: "jarvis",
      resolutionSourceReference: { conversationId: "conv-resolution" },
    });

    expect(resolved.sourceReference).toEqual({ conversationId: "conv-original" });
    expect(resolved.resolution?.resolutionSourceReference).toEqual({ conversationId: "conv-resolution" });
  });

  it("returns the updated record on subsequent retrieval", () => {
    const store = new InMemoryGlassmindStore();
    store.recordFollowUp(buildFollowUp({ id: "followup-retrieve", scope: { entityKind: "mission", entityId: "m-retrieve" } }));

    store.resolveFollowUp("followup-retrieve", {
      status: "resolved",
      resolvedAt: "2026-06-29T01:00:00.000Z",
      resolvedBy: "jarvis",
      resolutionSourceReference: { conversationId: "conv-2" },
    });

    const results = store.retrieveByScope({ entityKind: "mission", entityId: "m-retrieve" });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ status: "resolved" });
  });
});

describe("InMemoryGlassmindStore — resolveDeferredDecision", () => {
  it("resolves a deferred decision and attaches resolution metadata, on the happy path", () => {
    const store = new InMemoryGlassmindStore();
    store.recordDeferredDecision(buildDeferredDecision({ id: "decision-resolve" }));

    const resolved = store.resolveDeferredDecision("decision-resolve", {
      status: "completed",
      resolvedAt: "2026-06-29T01:00:00.000Z",
      resolvedBy: "user",
      resolutionSourceReference: { recommendationId: "rec-2" },
      resolutionNote: "Decision accepted.",
    });

    expect(resolved.status).toBe("completed");
    expect(resolved.resolution?.resolvedBy).toBe("user");
  });

  it("rejects resolving an unknown deferred decision id", () => {
    const store = new InMemoryGlassmindStore();
    expect(() =>
      store.resolveDeferredDecision("does-not-exist", {
        status: "completed",
        resolvedAt: "2026-06-29T01:00:00.000Z",
        resolvedBy: "user",
        resolutionSourceReference: { recommendationId: "rec-2" },
      }),
    ).toThrow(RecordNotFoundError);
  });

  it("preserves the original sourceReference after resolution", () => {
    const store = new InMemoryGlassmindStore();
    store.recordDeferredDecision(
      buildDeferredDecision({ id: "decision-provenance", sourceReference: { recommendationId: "rec-original" } }),
    );

    const resolved = store.resolveDeferredDecision("decision-provenance", {
      status: "completed",
      resolvedAt: "2026-06-29T01:00:00.000Z",
      resolvedBy: "user",
      resolutionSourceReference: { recommendationId: "rec-resolution" },
    });

    expect(resolved.sourceReference).toEqual({ recommendationId: "rec-original" });
  });
});

describe("InMemoryGlassmindStore — updateApprovalWaitingState", () => {
  it("updates an approval waiting-state record and attaches update metadata, on the happy path", () => {
    const store = new InMemoryGlassmindStore();
    store.recordApprovalWaitingState(buildApprovalWaitingState({ id: "approval-update" }));

    const updated = store.updateApprovalWaitingState("approval-update", {
      status: "approved",
      updatedAt: "2026-06-29T01:00:00.000Z",
      updateSourceReference: { recommendationId: "rec-2" },
    });

    expect(updated.status).toBe("approved");
    expect(updated.update).toEqual({
      updatedAt: "2026-06-29T01:00:00.000Z",
      updateSourceReference: { recommendationId: "rec-2" },
      resolutionNote: undefined,
    });
  });

  it("rejects an update with an entirely empty updateSourceReference", () => {
    const store = new InMemoryGlassmindStore();
    store.recordApprovalWaitingState(buildApprovalWaitingState({ id: "approval-bad-update" }));

    expect(() =>
      store.updateApprovalWaitingState("approval-bad-update", {
        status: "approved",
        updatedAt: "2026-06-29T01:00:00.000Z",
        updateSourceReference: {},
      }),
    ).toThrow(InvalidSourceReferenceError);
  });

  it("rejects updating an unknown approval id", () => {
    const store = new InMemoryGlassmindStore();
    expect(() =>
      store.updateApprovalWaitingState("does-not-exist", {
        status: "approved",
        updatedAt: "2026-06-29T01:00:00.000Z",
        updateSourceReference: { recommendationId: "rec-2" },
      }),
    ).toThrow(RecordNotFoundError);
  });

  it("preserves the original sourceReference after an update", () => {
    const store = new InMemoryGlassmindStore();
    store.recordApprovalWaitingState(
      buildApprovalWaitingState({ id: "approval-provenance", sourceReference: { recommendationId: "rec-original" } }),
    );

    const updated = store.updateApprovalWaitingState("approval-provenance", {
      status: "approved",
      updatedAt: "2026-06-29T01:00:00.000Z",
      updateSourceReference: { recommendationId: "rec-update" },
    });

    expect(updated.sourceReference).toEqual({ recommendationId: "rec-original" });
    expect(updated.update?.updateSourceReference).toEqual({ recommendationId: "rec-update" });
  });
});
