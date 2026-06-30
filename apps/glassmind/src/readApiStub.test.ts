import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DurableGlassmindStore } from "./durableStore.js";
import { EventStoreIngestionAdapter, type GlassmindIngestionEvent } from "./eventStoreIngestion.js";
import { InMemoryGlassmindStore } from "./inMemoryStore.js";
import { GlassmindReadApiStub } from "./readApiStub.js";
import type { ConversationTurnRecord, DeferredDecisionMemoryRecord, FollowUpMemoryRecord, RecordScope, SourceReference } from "./types.js";

function buildFollowUp(overrides: Partial<FollowUpMemoryRecord> = {}): FollowUpMemoryRecord {
  return {
    kind: "follow_up",
    id: "followup-1",
    followUpKind: "question",
    text: "Should I reassign this mission?",
    status: "open",
    evidence: { label: "Mission Detail", page: "missions" },
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
    occurredAt: "2026-06-30T02:00:00.000Z",
    confidence: 70,
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
    evidence: [],
    responseSummary: "There are 3 missions in view, 1 blocked.",
    approvalStatus: "not_required",
    sourceReference: { conversationId: "conv-1" },
    scope: { entityKind: "mission", entityId: "m-1" },
    occurredAt: "2026-06-30T01:00:00.000Z",
    confidence: 75,
    ...overrides,
  };
}

describe("GlassmindReadApiStub — readBySourceReference", () => {
  it("returns the matching record for a valid sourceReference lookup", () => {
    const store = new InMemoryGlassmindStore();
    store.recordFollowUp(buildFollowUp({ sourceReference: { conversationId: "conv-42" } }));
    const stub = new GlassmindReadApiStub(store);

    const response = stub.readBySourceReference({ conversationId: "conv-42" });

    expect(response).toMatchObject({ status: "found", recordCount: 1 });
  });

  it("returns invalid_request when no sourceReference field is provided", () => {
    const store = new InMemoryGlassmindStore();
    const stub = new GlassmindReadApiStub(store);

    const response = stub.readBySourceReference({});

    expect(response).toEqual({
      status: "error",
      error: { code: "invalid_request", message: "At least one of conversationId, messageId, recommendationId, eventId is required." },
    });
  });
});

describe("GlassmindReadApiStub — readByScope", () => {
  it("returns matching records for a valid scope lookup", () => {
    const store = new InMemoryGlassmindStore();
    store.recordFollowUp(buildFollowUp());
    store.recordDeferredDecision(buildDeferredDecision());
    const stub = new GlassmindReadApiStub(store);

    const response = stub.readByScope({ entityKind: "mission", entityId: "m-1" });

    expect(response).toMatchObject({ status: "found", recordCount: 2 });
  });

  it("returns invalid_request when entityId is missing", () => {
    const store = new InMemoryGlassmindStore();
    const stub = new GlassmindReadApiStub(store);

    const response = stub.readByScope({ entityKind: "mission", entityId: "" });

    expect(response).toEqual({
      status: "error",
      error: { code: "invalid_request", message: "Both entityKind and entityId are required." },
    });
  });
});

describe("GlassmindReadApiStub — readTrace", () => {
  it("returns a chronologically ordered trace across record kinds", () => {
    const store = new InMemoryGlassmindStore();
    store.recordDeferredDecision(buildDeferredDecision());
    store.recordConversationTurn(buildConversationTurn());
    store.recordFollowUp(buildFollowUp());
    const stub = new GlassmindReadApiStub(store);

    const response = stub.readTrace({ entityKind: "mission", entityId: "m-1" });

    expect(response.status).toBe("found");
    if (response.status === "found") {
      expect(response.recordCount).toBe(3);
      expect(response.records.map((entry) => entry.kind)).toEqual(["follow_up", "conversation_turn", "deferred_decision"]);
    }
  });

  it("returns an honest no_memory_found when the scope has no records", () => {
    const store = new InMemoryGlassmindStore();
    const stub = new GlassmindReadApiStub(store);

    const response = stub.readTrace({ entityKind: "mission", entityId: "no-such-mission" });

    expect(response).toEqual({ status: "no_memory_found" });
  });

  it("orders stably (preserves insertion order) when two records share the exact same occurredAt", () => {
    const store = new InMemoryGlassmindStore();
    const sharedTimestamp = "2026-06-30T03:00:00.000Z";
    store.recordFollowUp(buildFollowUp({ id: "followup-tied", occurredAt: sharedTimestamp }));
    store.recordDeferredDecision(buildDeferredDecision({ id: "decision-tied", occurredAt: sharedTimestamp }));
    const stub = new GlassmindReadApiStub(store);

    const response = stub.readTrace({ entityKind: "mission", entityId: "m-1" });

    expect(response.status).toBe("found");
    if (response.status === "found") {
      // Both records share the same occurredAt; a stable sort must preserve
      // the order they were retrieved in (insertion order here), not
      // reorder them arbitrarily.
      expect(response.records.map((entry) => entry.record.id)).toEqual(["followup-tied", "decision-tied"]);
    }
  });
});

describe("GlassmindReadApiStub — readiness", () => {
  it("reports ready for a configured, reachable read dependency", () => {
    const store = new InMemoryGlassmindStore();
    const stub = new GlassmindReadApiStub(store);

    expect(stub.readiness()).toEqual({ ready: true });
  });

  it("reports not ready, with a reason, for an unconfigured DurableGlassmindStore", () => {
    const store = new DurableGlassmindStore();
    const stub = new GlassmindReadApiStub(store);

    const response = stub.readiness();

    expect(response.ready).toBe(false);
    expect((response as { ready: false; reason: string }).reason).toBeTruthy();
  });
});

describe("GlassmindReadApiStub — empty retrieval is honest, not an error", () => {
  it("returns no_memory_found, not an error, for both by-source-reference and by-scope when nothing matches", () => {
    const store = new InMemoryGlassmindStore();
    const stub = new GlassmindReadApiStub(store);

    expect(stub.readBySourceReference({ eventId: "no-such-event" })).toEqual({ status: "no_memory_found" });
    expect(stub.readByScope({ entityKind: "mission", entityId: "no-such-mission" })).toEqual({ status: "no_memory_found" });
  });
});

describe("GlassmindReadApiStub — backend_unavailable", () => {
  it("returns backend_unavailable, not no_memory_found, when the dependency throws", () => {
    const store = new DurableGlassmindStore(); // no driver configured — every call throws
    const stub = new GlassmindReadApiStub(store);

    const response = stub.readByScope({ entityKind: "mission", entityId: "m-1" });

    expect(response.status).toBe("error");
    if (response.status === "error") {
      expect(response.error.code).toBe("backend_unavailable");
    }
  });
});

const WRITE_SHAPED_PREFIXES = ["write", "insert", "create", "delete", "remove", "ingest", "update", "resolve"];

describe("GlassmindReadApiStub — no write, ingest, update, resolve, or delete method exists", () => {
  it("exposes exactly the four read/readiness methods and nothing else", () => {
    const prototypeMethods = Object.getOwnPropertyNames(GlassmindReadApiStub.prototype).filter((name) => name !== "constructor");

    expect(prototypeMethods.sort()).toEqual(["readByScope", "readBySourceReference", "readTrace", "readiness"]);
  });

  it("has no method whose name matches any write/ingest/update/resolve/delete-shaped prefix", () => {
    const prototypeMethods = Object.getOwnPropertyNames(GlassmindReadApiStub.prototype).filter((name) => name !== "constructor");

    for (const method of prototypeMethods) {
      const lower = method.toLowerCase();
      expect(WRITE_SHAPED_PREFIXES.some((prefix) => lower.startsWith(prefix))).toBe(false);
    }
  });
});

describe("GlassmindReadApiStub — response records do not include raw EventStore payloads", () => {
  it("never surfaces ingested event.payload content through readBySourceReference, readByScope, or readTrace", () => {
    const store = new InMemoryGlassmindStore();
    const adapter = new EventStoreIngestionAdapter(
      store,
      () => true,
      (event: GlassmindIngestionEvent, sourceReference: SourceReference, scope: RecordScope): FollowUpMemoryRecord => ({
        kind: "follow_up",
        id: `followup-from-${event.id}`,
        followUpKind: "review",
        text: `Event ${event.type} needs review.`,
        status: "open",
        sourceReference,
        scope,
        occurredAt: event.timestamp,
        confidence: 55,
      }),
    );
    adapter.ingest({
      id: "evt-1",
      type: "MissionBlocked",
      timestamp: "2026-06-30T04:00:00.000Z",
      scope: { entityKind: "mission", entityId: "m-1" },
      conversationId: "conv-1",
      payload: { internalDebugInfo: { secretToken: "do-not-leak-this-token" } },
    });

    const stub = new GlassmindReadApiStub(store);

    const bySourceReference = stub.readBySourceReference({ conversationId: "conv-1" });
    const byScope = stub.readByScope({ entityKind: "mission", entityId: "m-1" });
    const trace = stub.readTrace({ entityKind: "mission", entityId: "m-1" });

    for (const response of [bySourceReference, byScope, trace]) {
      const serialized = JSON.stringify(response);
      expect(serialized).not.toContain("secretToken");
      expect(serialized).not.toContain("do-not-leak-this-token");
      expect(serialized).not.toContain("payload");
    }
  });
});

describe("readApiStub.ts — no Nexus import", () => {
  it("has no import statement referencing nexus-console or any nexus package", () => {
    const sourcePath = fileURLToPath(new URL("./readApiStub.ts", import.meta.url));
    const source = readFileSync(sourcePath, "utf-8");
    const importLines = source.split("\n").filter((line) => /^\s*import\b/.test(line));

    for (const line of importLines) {
      expect(line.toLowerCase()).not.toContain("nexus");
    }
  });
});

describe("readApiStub.ts — no core import", () => {
  it("does not import from core/ or any CommandCore Python package path", () => {
    const sourcePath = fileURLToPath(new URL("./readApiStub.ts", import.meta.url));
    const source = readFileSync(sourcePath, "utf-8");

    expect(source).not.toMatch(/from\s+["'].*\/core\//);
    expect(source).not.toContain("commandcore");
    expect(source).not.toContain("jarvis_core");
  });
});
