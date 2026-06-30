import { afterEach, describe, expect, it } from "vitest";
import { createSqliteDriver, SqliteGlassmindPersistenceDriver } from "./sqliteDriver.js";
import type {
  ApprovalWaitingStateMemoryRecord,
  ConversationTurnRecord,
  DeferredDecisionMemoryRecord,
  FollowUpMemoryRecord,
} from "./types.js";

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

let openDrivers: SqliteGlassmindPersistenceDriver[] = [];

async function buildDriver(): Promise<SqliteGlassmindPersistenceDriver> {
  const driver = await createSqliteDriver();
  openDrivers.push(driver);
  return driver;
}

afterEach(() => {
  for (const driver of openDrivers) {
    driver.close();
  }
  openDrivers = [];
});

describe("SqliteGlassmindPersistenceDriver — persists all four record categories", () => {
  it("inserts and retrieves a conversation turn by id", async () => {
    const driver = await buildDriver();
    const record = buildConversationTurn();

    driver.insertRecord(record);

    expect(driver.findById("conversation_turn", "turn-1")).toEqual(record);
  });

  it("inserts and retrieves a follow-up by id", async () => {
    const driver = await buildDriver();
    const record = buildFollowUp();

    driver.insertRecord(record);

    expect(driver.findById("follow_up", "followup-1")).toEqual(record);
  });

  it("inserts and retrieves a deferred decision by id", async () => {
    const driver = await buildDriver();
    const record = buildDeferredDecision();

    driver.insertRecord(record);

    expect(driver.findById("deferred_decision", "decision-1")).toEqual(record);
  });

  it("inserts and retrieves an approval waiting-state record by id", async () => {
    const driver = await buildDriver();
    const record = buildApprovalWaitingState();

    driver.insertRecord(record);

    expect(driver.findById("approval_waiting_state", "approval-1")).toEqual(record);
  });
});

describe("SqliteGlassmindPersistenceDriver — findBySourceReference and findByScope", () => {
  it("retrieves records across kinds by a matching sourceReference field", async () => {
    const driver = await buildDriver();
    driver.insertRecord(buildFollowUp({ id: "followup-x", sourceReference: { conversationId: "conv-42" } }));
    driver.insertRecord(buildDeferredDecision({ id: "decision-x", sourceReference: { recommendationId: "rec-other" } }));

    const results = driver.findBySourceReference({ conversationId: "conv-42" });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("followup-x");
  });

  it("retrieves records across kinds sharing the same scope", async () => {
    const driver = await buildDriver();
    driver.insertRecord(buildFollowUp({ id: "followup-y", scope: { entityKind: "mission", entityId: "m-shared" } }));
    driver.insertRecord(buildApprovalWaitingState({ id: "approval-y", scope: { entityKind: "mission", entityId: "m-shared" } }));
    driver.insertRecord(buildDeferredDecision({ id: "decision-z", scope: { entityKind: "mission", entityId: "m-other" } }));

    const results = driver.findByScope({ entityKind: "mission", entityId: "m-shared" });

    expect(results.map((r) => r.id).sort()).toEqual(["approval-y", "followup-y"]);
  });

  it("returns [] for retrieval with no matches — empty retrieval is honest, not an error", async () => {
    const driver = await buildDriver();

    expect(driver.findBySourceReference({ eventId: "no-such-event" })).toEqual([]);
    expect(driver.findByScope({ entityKind: "mission", entityId: "no-such-mission" })).toEqual([]);
    expect(driver.findById("follow_up", "no-such-id")).toBeUndefined();
  });
});

describe("SqliteGlassmindPersistenceDriver — preserves sourceReference and lifecycle source reference fields", () => {
  it("round-trips the original sourceReference exactly", async () => {
    const driver = await buildDriver();
    const record = buildFollowUp({ sourceReference: { conversationId: "conv-1", eventId: "evt-1" } });

    driver.insertRecord(record);
    const found = driver.findById("follow_up", record.id);

    expect(found?.sourceReference).toEqual({ conversationId: "conv-1", eventId: "evt-1" });
  });

  it("round-trips a lifecycle resolutionSourceReference exactly, distinct from the original sourceReference", async () => {
    const driver = await buildDriver();
    const original = buildFollowUp({ sourceReference: { conversationId: "conv-original" } });
    driver.insertRecord(original);

    const resolved: FollowUpMemoryRecord = {
      ...original,
      status: "resolved",
      resolution: {
        resolvedAt: "2026-06-30T01:00:00.000Z",
        resolvedBy: "jarvis",
        resolutionSourceReference: { conversationId: "conv-resolution" },
      },
    };
    driver.updateRecord(resolved);
    const found = driver.findById("follow_up", original.id);

    expect(found?.sourceReference).toEqual({ conversationId: "conv-original" });
    expect((found as FollowUpMemoryRecord).resolution?.resolutionSourceReference).toEqual({ conversationId: "conv-resolution" });
  });

  it("round-trips a lifecycle resolutionSourceReference exactly for deferred decision records", async () => {
    const driver = await buildDriver();
    const original = buildDeferredDecision({ sourceReference: { recommendationId: "rec-original" } });
    driver.insertRecord(original);

    const resolved: DeferredDecisionMemoryRecord = {
      ...original,
      status: "completed",
      resolution: {
        resolvedAt: "2026-06-30T01:00:00.000Z",
        resolvedBy: "user",
        resolutionSourceReference: { recommendationId: "rec-resolution" },
      },
    };
    driver.updateRecord(resolved);
    const found = driver.findById("deferred_decision", original.id);

    expect(found?.sourceReference).toEqual({ recommendationId: "rec-original" });
    expect((found as DeferredDecisionMemoryRecord).resolution?.resolutionSourceReference).toEqual({ recommendationId: "rec-resolution" });
  });

  it("round-trips a lifecycle updateSourceReference exactly for approval waiting-state records", async () => {
    const driver = await buildDriver();
    const original = buildApprovalWaitingState({ sourceReference: { recommendationId: "rec-original" } });
    driver.insertRecord(original);

    const updated: ApprovalWaitingStateMemoryRecord = {
      ...original,
      status: "approved",
      update: { updatedAt: "2026-06-30T01:00:00.000Z", updateSourceReference: { recommendationId: "rec-update" } },
    };
    driver.updateRecord(updated);
    const found = driver.findById("approval_waiting_state", original.id);

    expect(found?.sourceReference).toEqual({ recommendationId: "rec-original" });
    expect((found as ApprovalWaitingStateMemoryRecord).update?.updateSourceReference).toEqual({ recommendationId: "rec-update" });
  });
});

describe("SqliteGlassmindPersistenceDriver — does not store raw EventStore payloads", () => {
  it("never persists a `payload` field — GlassmindMemoryRecord has no such field to begin with", async () => {
    const driver = await buildDriver();
    const record = buildFollowUp();

    driver.insertRecord(record);
    const found = driver.findById("follow_up", record.id);

    expect(found).not.toHaveProperty("payload");
  });
});

describe("SqliteGlassmindPersistenceDriver — storage-level provenance enforcement", () => {
  it("rejects, at the schema level, a record with an entirely empty sourceReference, even though this driver performs no validation of its own", async () => {
    const driver = await buildDriver();
    const record = buildFollowUp({ sourceReference: {} });

    // This driver has no business logic — calling insertRecord directly,
    // bypassing DurableGlassmindStore entirely, proves the SQLite CHECK
    // constraint in migrations/001_glassmind_phase_1.sql is what rejects
    // this, not any application-level check this driver lacks.
    expect(() => driver.insertRecord(record)).toThrow();
    expect(driver.findById("follow_up", record.id)).toBeUndefined();
  });

  it("rejects, at the schema level, each of the four record kinds with an entirely empty sourceReference", async () => {
    const driver = await buildDriver();

    expect(() => driver.insertRecord(buildConversationTurn({ id: "ct-bad", sourceReference: {} }))).toThrow();
    expect(() => driver.insertRecord(buildFollowUp({ id: "fu-bad", sourceReference: {} }))).toThrow();
    expect(() => driver.insertRecord(buildDeferredDecision({ id: "dd-bad", sourceReference: {} }))).toThrow();
    expect(() => driver.insertRecord(buildApprovalWaitingState({ id: "aw-bad", sourceReference: {} }))).toThrow();
  });
});
