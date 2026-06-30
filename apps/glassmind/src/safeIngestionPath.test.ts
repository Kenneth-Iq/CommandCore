import { describe, expect, it } from "vitest";
import { DefaultCommandCoreEventBridge, type CommandCoreEventEnvelope } from "./commandCoreEventBridge.js";
import { EventStoreIngestionAdapter, type GlassmindIngestionEvent } from "./eventStoreIngestion.js";
import { InMemoryGlassmindStore } from "./inMemoryStore.js";
import { SafeIngestionPath } from "./safeIngestionPath.js";
import type { FollowUpMemoryRecord, RecordScope, SourceReference } from "./types.js";

const ELIGIBLE_ENVELOPE_TYPES = new Set(["MissionBlocked", "MissionEscalated"]);

function isEnvelopeEligible(envelope: CommandCoreEventEnvelope): boolean {
  return ELIGIBLE_ENVELOPE_TYPES.has(envelope.type);
}

function isEventEligible(): boolean {
  // The bridge already filtered eligibility; the ingestion adapter's own
  // eligibility check here is intentionally permissive once an event has
  // already been converted, mirroring how a real two-stage pipeline would
  // not duplicate the same eligibility decision twice.
  return true;
}

function buildFollowUpFromEvent(
  event: GlassmindIngestionEvent,
  sourceReference: SourceReference,
  scope: RecordScope,
): FollowUpMemoryRecord {
  return {
    kind: "follow_up",
    id: `followup-from-${event.id}`,
    followUpKind: "review",
    text: `Event ${event.type} on ${scope.entityKind} ${scope.entityId} needs review.`,
    status: "open",
    sourceReference,
    scope,
    occurredAt: event.timestamp,
    confidence: 55,
  };
}

function buildEnvelope(overrides: Partial<CommandCoreEventEnvelope> = {}): CommandCoreEventEnvelope {
  return {
    id: "evt-1",
    type: "MissionBlocked",
    timestamp: "2026-06-29T00:00:00.000Z",
    scope: { entityKind: "mission", entityId: "m-1" },
    reference: { conversationId: "conv-1" },
    payload: { missionId: "m-1", reason: "agent offline", internalDebugInfo: { stack: "very long stack trace" } },
    ...overrides,
  };
}

function buildPath(): { path: SafeIngestionPath; store: InMemoryGlassmindStore } {
  const store = new InMemoryGlassmindStore();
  const bridge = new DefaultCommandCoreEventBridge(isEnvelopeEligible);
  const adapter = new EventStoreIngestionAdapter(store, isEventEligible, buildFollowUpFromEvent);
  return { path: new SafeIngestionPath(bridge, adapter), store };
}

describe("SafeIngestionPath — eligible envelope becomes a Glassmind write", () => {
  it("converts and ingests an eligible envelope through a fake store", () => {
    const { path, store } = buildPath();

    const result = path.process(buildEnvelope());

    expect(result.outcome).toBe("written");
    if (result.outcome === "written") {
      expect(result.record.kind).toBe("follow_up");
      expect(result.record.sourceReference).toEqual({
        eventId: "evt-1",
        conversationId: "conv-1",
        recommendationId: undefined,
        messageId: undefined,
      });
    }
    expect(store.retrieveByScope({ entityKind: "mission", entityId: "m-1" })).toHaveLength(1);
  });
});

describe("SafeIngestionPath — ineligible envelope is skipped", () => {
  it("skips at the bridge stage without reaching the ingestion adapter or the store", () => {
    const { path, store } = buildPath();

    const result = path.process(buildEnvelope({ type: "MissionCompleted" }));

    expect(result).toMatchObject({ outcome: "skipped", stage: "bridge", reason: "ineligible" });
    expect(store.retrieveByScope({ entityKind: "mission", entityId: "m-1" })).toHaveLength(0);
  });
});

describe("SafeIngestionPath — missing source/event id is skipped safely", () => {
  it("skips an envelope with no event id at the bridge stage, without throwing", () => {
    const { path, store } = buildPath();

    let result;
    expect(() => {
      result = path.process(buildEnvelope({ id: "" }));
    }).not.toThrow();

    expect(result).toMatchObject({ outcome: "skipped", stage: "bridge", reason: "missing_event_id" });
    expect(store.retrieveByScope({ entityKind: "mission", entityId: "m-1" })).toHaveLength(0);
  });

  it("skips an eligible envelope with no scope at the ingestion stage, without throwing", () => {
    const { path, store } = buildPath();

    let result;
    expect(() => {
      result = path.process(buildEnvelope({ scope: undefined }));
    }).not.toThrow();

    expect(result).toMatchObject({ outcome: "skipped", stage: "ingestion", reason: "missing_scope" });
    expect(store.retrieveByScope({ entityKind: "mission", entityId: "m-1" })).toHaveLength(0);
  });
});

describe("SafeIngestionPath — raw payload is never copied", () => {
  it("does not copy envelope.payload into the produced memory record", () => {
    const { path } = buildPath();

    const result = path.process(buildEnvelope());

    expect(result.outcome).toBe("written");
    if (result.outcome === "written") {
      expect(JSON.stringify(result.record)).not.toContain("internalDebugInfo");
      expect(JSON.stringify(result.record)).not.toContain("very long stack trace");
      expect(result.record).not.toHaveProperty("payload");
    }
  });
});

describe("SafeIngestionPath — empty/no-op processing", () => {
  it("processing an empty batch is not an error", () => {
    const { path } = buildPath();

    expect(() => path.processBatch([])).not.toThrow();
    expect(path.processBatch([])).toEqual([]);
  });
});

describe("SafeIngestionPath — no production subscription exists", () => {
  it("exposes only process/processBatch — no subscribe, start, listen, or polling method", () => {
    const prototypeMethods = Object.getOwnPropertyNames(SafeIngestionPath.prototype).filter(
      (name) => name !== "constructor",
    );

    expect(prototypeMethods.sort()).toEqual(["process", "processBatch"]);
  });
});
