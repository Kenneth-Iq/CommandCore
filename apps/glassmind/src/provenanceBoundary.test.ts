import { describe, expect, it } from "vitest";
import { DatabaseGlassmindPersistenceDriver } from "./databaseDriver.js";
import { DurableGlassmindStore } from "./durableStore.js";
import { FakeDatabaseClient } from "./testFakes.js";
import { InvalidSourceReferenceError } from "./errors.js";
import type {
  ApprovalWaitingStateMemoryRecord,
  ConversationTurnRecord,
  DeferredDecisionMemoryRecord,
  FollowUpMemoryRecord,
} from "./types.js";

/**
 * Hardens the storage-layer provenance boundary: provenance validation
 * lives in DurableGlassmindStore and only there. DatabaseGlassmindPersistenceDriver
 * (and the database client behind it) must never see a record or lifecycle
 * update that failed validation, and the driver itself must have no opinion
 * about provenance at all — exactly as documented in
 * docs/architecture/Glassmind-Durable-Adapter-Design.md §8 and restated for
 * the database-backed driver specifically in
 * docs/architecture/Glassmind-Persistence-Runtime-Decision.md.
 *
 * Uses databaseDriver.test.ts's call-tracking FakeDatabaseClient so these
 * tests can assert not just "the call threw" but "the client was never
 * reached" — the stronger, more specific guarantee this boundary requires.
 */

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

describe("DatabaseGlassmindPersistenceDriver does not validate provenance by itself", () => {
  it("inserts a record with an entirely empty sourceReference when called directly, bypassing DurableGlassmindStore", () => {
    const client = new FakeDatabaseClient();
    const driver = new DatabaseGlassmindPersistenceDriver(client);
    const record = buildFollowUp({ sourceReference: {} });

    expect(() => driver.insertRecord(record)).not.toThrow();
    expect(client.insertCalls).toEqual([record]);
  });

  it("updates a record with an entirely empty sourceReference when called directly, bypassing DurableGlassmindStore", () => {
    const client = new FakeDatabaseClient();
    const driver = new DatabaseGlassmindPersistenceDriver(client);
    const record = buildFollowUp({ sourceReference: {} });

    expect(() => driver.updateRecord(record)).not.toThrow();
    expect(client.updateCalls).toEqual([record]);
  });
});

describe("DurableGlassmindStore rejects invalid provenance before the driver receives it", () => {
  it.each([
    ["recordConversationTurn", () => buildConversationTurn({ sourceReference: {} })] as const,
    ["recordFollowUp", () => buildFollowUp({ sourceReference: {} })] as const,
    ["recordDeferredDecision", () => buildDeferredDecision({ sourceReference: {} })] as const,
    ["recordApprovalWaitingState", () => buildApprovalWaitingState({ sourceReference: {} })] as const,
  ])("rejects %s before the database client is ever called", (method, buildRecord) => {
    const client = new FakeDatabaseClient();
    const store = new DurableGlassmindStore(new DatabaseGlassmindPersistenceDriver(client));
    const record = buildRecord();

    expect(() => (store as unknown as Record<string, (r: unknown) => unknown>)[method](record)).toThrow(
      InvalidSourceReferenceError,
    );
    expect(client.insertCalls).toEqual([]);
    expect(client.updateCalls).toEqual([]);
    expect(client.findByIdCalls).toEqual([]);
  });
});

describe("lifecycle update sourceReference validation happens before driver update", () => {
  it("rejects resolveFollowUp's resolutionSourceReference before findById or update reach the client", () => {
    const client = new FakeDatabaseClient();
    const store = new DurableGlassmindStore(new DatabaseGlassmindPersistenceDriver(client));
    store.recordFollowUp(buildFollowUp({ id: "followup-boundary" }));
    client.insertCalls.length = 0;

    expect(() =>
      store.resolveFollowUp("followup-boundary", {
        status: "resolved",
        resolvedAt: "2026-06-30T01:00:00.000Z",
        resolvedBy: "jarvis",
        resolutionSourceReference: {},
      }),
    ).toThrow(InvalidSourceReferenceError);

    expect(client.findByIdCalls).toEqual([]);
    expect(client.updateCalls).toEqual([]);
  });

  it("rejects resolveDeferredDecision's resolutionSourceReference before findById or update reach the client", () => {
    const client = new FakeDatabaseClient();
    const store = new DurableGlassmindStore(new DatabaseGlassmindPersistenceDriver(client));
    store.recordDeferredDecision(buildDeferredDecision({ id: "decision-boundary" }));
    client.insertCalls.length = 0;

    expect(() =>
      store.resolveDeferredDecision("decision-boundary", {
        status: "completed",
        resolvedAt: "2026-06-30T01:00:00.000Z",
        resolvedBy: "user",
        resolutionSourceReference: {},
      }),
    ).toThrow(InvalidSourceReferenceError);

    expect(client.findByIdCalls).toEqual([]);
    expect(client.updateCalls).toEqual([]);
  });

  it("rejects updateApprovalWaitingState's updateSourceReference before findById or update reach the client", () => {
    const client = new FakeDatabaseClient();
    const store = new DurableGlassmindStore(new DatabaseGlassmindPersistenceDriver(client));
    store.recordApprovalWaitingState(buildApprovalWaitingState({ id: "approval-boundary" }));
    client.insertCalls.length = 0;

    expect(() =>
      store.updateApprovalWaitingState("approval-boundary", {
        status: "approved",
        updatedAt: "2026-06-30T01:00:00.000Z",
        updateSourceReference: {},
      }),
    ).toThrow(InvalidSourceReferenceError);

    expect(client.findByIdCalls).toEqual([]);
    expect(client.updateCalls).toEqual([]);
  });
});
