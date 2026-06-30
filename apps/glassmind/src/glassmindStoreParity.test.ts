import { describe, expect, it } from "vitest";
import { DurableGlassmindStore, InMemoryGlassmindPersistenceDriver } from "./durableStore.js";
import { InvalidSourceReferenceError, RecordNotFoundError } from "./errors.js";
import { InMemoryGlassmindStore } from "./inMemoryStore.js";
import type { GlassmindStore } from "./store.js";
import type {
  ApprovalWaitingStateMemoryRecord,
  DeferredDecisionMemoryRecord,
  FollowUpMemoryRecord,
} from "./types.js";

/**
 * Contract-parity suite: every scenario here runs identically against
 * InMemoryGlassmindStore and DurableGlassmindStore (backed by the real
 * InMemoryGlassmindPersistenceDriver). Per
 * docs/architecture/Glassmind-Durable-Adapter-Design.md §14, this is the
 * single best guarantee that the durable adapter is a drop-in replacement,
 * not a parallel, subtly-different implementation. A future real database
 * driver should be added as a third entry in `implementations` below and
 * pass the same suite before being considered done.
 */

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

function buildDeferredDecision(overrides: Partial<DeferredDecisionMemoryRecord> = {}): DeferredDecisionMemoryRecord {
  return {
    kind: "deferred_decision",
    id: "decision-1",
    title: "Review blocked mission",
    detail: "Awaiting a decision on how to unblock or reassign this mission.",
    status: "waiting",
    sourceReference: { recommendationId: "rec-1" },
    scope: { entityKind: "mission", entityId: "m-1" },
    occurredAt: "2026-06-30T00:00:00.000Z",
    confidence: 70,
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
    occurredAt: "2026-06-30T00:00:00.000Z",
    confidence: 65,
    ...overrides,
  };
}

const implementations: Array<{ label: string; createStore: () => GlassmindStore }> = [
  { label: "InMemoryGlassmindStore", createStore: () => new InMemoryGlassmindStore() },
  {
    label: "DurableGlassmindStore + InMemoryGlassmindPersistenceDriver",
    createStore: () => new DurableGlassmindStore(new InMemoryGlassmindPersistenceDriver()),
  },
];

describe.each(implementations)("GlassmindStore contract parity — $label", ({ createStore }) => {
  it("accepts a follow-up record with valid provenance and retrieves it by scope", () => {
    const store = createStore();
    const record = buildFollowUp();

    store.recordFollowUp(record);

    expect(store.retrieveByScope({ entityKind: "mission", entityId: "m-1" })).toEqual([record]);
  });

  it("retrieves a record by its exact sourceReference", () => {
    const store = createStore();
    store.recordFollowUp(buildFollowUp({ sourceReference: { conversationId: "conv-42" } }));

    const results = store.retrieveBySourceReference({ conversationId: "conv-42" });

    expect(results).toHaveLength(1);
  });

  it("rejects a record with an entirely empty sourceReference", () => {
    const store = createStore();
    expect(() => store.recordFollowUp(buildFollowUp({ sourceReference: {} }))).toThrow(InvalidSourceReferenceError);
  });

  it("returns [] for retrieval with no matches — empty retrieval is honest, not an error", () => {
    const store = createStore();

    expect(() => store.retrieveByScope({ entityKind: "mission", entityId: "no-such-mission" })).not.toThrow();
    expect(store.retrieveByScope({ entityKind: "mission", entityId: "no-such-mission" })).toEqual([]);
    expect(store.retrieveBySourceReference({ eventId: "no-such-event" })).toEqual([]);
  });

  it("resolves a follow-up and preserves the original sourceReference", () => {
    const store = createStore();
    store.recordFollowUp(buildFollowUp({ id: "followup-resolve", sourceReference: { conversationId: "conv-original" } }));

    const resolved = store.resolveFollowUp("followup-resolve", {
      status: "resolved",
      resolvedAt: "2026-06-30T01:00:00.000Z",
      resolvedBy: "jarvis",
      resolutionSourceReference: { conversationId: "conv-resolution" },
    });

    expect(resolved.status).toBe("resolved");
    expect(resolved.sourceReference).toEqual({ conversationId: "conv-original" });
    expect(resolved.resolution?.resolutionSourceReference).toEqual({ conversationId: "conv-resolution" });
  });

  it("resolves a deferred decision and preserves the original sourceReference", () => {
    const store = createStore();
    store.recordDeferredDecision(buildDeferredDecision({ id: "decision-resolve", sourceReference: { recommendationId: "rec-original" } }));

    const resolved = store.resolveDeferredDecision("decision-resolve", {
      status: "completed",
      resolvedAt: "2026-06-30T01:00:00.000Z",
      resolvedBy: "user",
      resolutionSourceReference: { recommendationId: "rec-resolution" },
    });

    expect(resolved.status).toBe("completed");
    expect(resolved.sourceReference).toEqual({ recommendationId: "rec-original" });
  });

  it("updates an approval waiting-state record and preserves the original sourceReference", () => {
    const store = createStore();
    store.recordApprovalWaitingState(buildApprovalWaitingState({ id: "approval-update", sourceReference: { recommendationId: "rec-original" } }));

    const updated = store.updateApprovalWaitingState("approval-update", {
      status: "approved",
      updatedAt: "2026-06-30T01:00:00.000Z",
      updateSourceReference: { recommendationId: "rec-update" },
    });

    expect(updated.status).toBe("approved");
    expect(updated.sourceReference).toEqual({ recommendationId: "rec-original" });
  });

  it("rejects resolving an unknown follow-up id", () => {
    const store = createStore();
    expect(() =>
      store.resolveFollowUp("does-not-exist", {
        status: "resolved",
        resolvedAt: "2026-06-30T01:00:00.000Z",
        resolvedBy: "jarvis",
        resolutionSourceReference: { conversationId: "conv-2" },
      }),
    ).toThrow(RecordNotFoundError);
  });

  it("rejects a resolution with an entirely empty resolutionSourceReference", () => {
    const store = createStore();
    store.recordFollowUp(buildFollowUp({ id: "followup-bad-resolution" }));

    expect(() =>
      store.resolveFollowUp("followup-bad-resolution", {
        status: "resolved",
        resolvedAt: "2026-06-30T01:00:00.000Z",
        resolvedBy: "jarvis",
        resolutionSourceReference: {},
      }),
    ).toThrow(InvalidSourceReferenceError);
  });
});
