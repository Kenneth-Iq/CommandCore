import { describe, expect, it } from "vitest";
import { InMemoryGlassmindStore } from "./inMemoryStore.js";
import { EventStoreIngestionAdapter, type GlassmindIngestionEvent } from "./eventStoreIngestion.js";
import type { FollowUpMemoryRecord, RecordScope, SourceReference } from "./types.js";

const ELIGIBLE_EVENT_TYPES = new Set(["MissionBlocked", "MissionEscalated"]);

function isEligible(event: GlassmindIngestionEvent): boolean {
  return ELIGIBLE_EVENT_TYPES.has(event.type);
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
    // A short, derived summary string only — never event.payload itself.
    text: `Event ${event.type} on ${scope.entityKind} ${scope.entityId} needs review.`,
    status: "open",
    sourceReference,
    scope,
    occurredAt: event.timestamp,
    confidence: 55,
  };
}

function buildEvent(overrides: Partial<GlassmindIngestionEvent> = {}): GlassmindIngestionEvent {
  return {
    id: "evt-1",
    type: "MissionBlocked",
    timestamp: "2026-06-29T00:00:00.000Z",
    scope: { entityKind: "mission", entityId: "m-1" },
    payload: { missionId: "m-1", reason: "agent offline", internalDebugInfo: { stack: "..." } },
    ...overrides,
  };
}

describe("EventStoreIngestionAdapter — eligible events", () => {
  it("writes the expected memory record through a GlassmindStore fake", () => {
    const store = new InMemoryGlassmindStore();
    const adapter = new EventStoreIngestionAdapter(store, isEligible, buildFollowUpFromEvent);

    const result = adapter.ingest(buildEvent());

    expect(result.outcome).toBe("written");
    if (result.outcome === "written") {
      expect(result.record.kind).toBe("follow_up");
      expect(result.record.sourceReference).toEqual({ eventId: "evt-1" });
    }

    const stored = store.retrieveByScope({ entityKind: "mission", entityId: "m-1" });
    expect(stored).toHaveLength(1);
  });
});

describe("EventStoreIngestionAdapter — ineligible events", () => {
  it("skips an event whose type is not eligible", () => {
    const store = new InMemoryGlassmindStore();
    const adapter = new EventStoreIngestionAdapter(store, isEligible, buildFollowUpFromEvent);

    const result = adapter.ingest(buildEvent({ type: "MissionCompleted" }));

    expect(result).toEqual({ outcome: "skipped", reason: "ineligible", event: expect.objectContaining({ type: "MissionCompleted" }) });
    expect(store.retrieveByScope({ entityKind: "mission", entityId: "m-1" })).toHaveLength(0);
  });
});

describe("EventStoreIngestionAdapter — missing provenance", () => {
  it("rejects an event with no usable source identity, safely (no throw)", () => {
    const store = new InMemoryGlassmindStore();
    const adapter = new EventStoreIngestionAdapter(store, isEligible, buildFollowUpFromEvent);

    const event = buildEvent({ id: "", conversationId: undefined, recommendationId: undefined, messageId: undefined });

    let result;
    expect(() => {
      result = adapter.ingest(event);
    }).not.toThrow();

    expect(result).toMatchObject({ outcome: "skipped", reason: "missing_provenance" });
    expect(store.retrieveByScope({ entityKind: "mission", entityId: "m-1" })).toHaveLength(0);
  });

  it("rejects an eligible event with no scope, safely", () => {
    const store = new InMemoryGlassmindStore();
    const adapter = new EventStoreIngestionAdapter(store, isEligible, buildFollowUpFromEvent);

    const result = adapter.ingest(buildEvent({ scope: undefined }));

    expect(result).toMatchObject({ outcome: "skipped", reason: "missing_scope" });
  });
});

describe("EventStoreIngestionAdapter — never duplicates raw payloads", () => {
  it("does not copy event.payload into the produced memory record", () => {
    const store = new InMemoryGlassmindStore();
    const adapter = new EventStoreIngestionAdapter(store, isEligible, buildFollowUpFromEvent);

    const event = buildEvent({ payload: { missionId: "m-1", reason: "agent offline", internalDebugInfo: { stack: "very long stack trace" } } });
    const result = adapter.ingest(event);

    expect(result.outcome).toBe("written");
    if (result.outcome === "written") {
      expect(JSON.stringify(result.record)).not.toContain("internalDebugInfo");
      expect(JSON.stringify(result.record)).not.toContain("very long stack trace");
      expect(result.record).not.toHaveProperty("payload");
    }
  });
});

describe("EventStoreIngestionAdapter — empty/no-op ingestion", () => {
  it("processing an empty batch is not an error", () => {
    const store = new InMemoryGlassmindStore();
    const adapter = new EventStoreIngestionAdapter(store, isEligible, buildFollowUpFromEvent);

    expect(() => adapter.ingestBatch([])).not.toThrow();
    expect(adapter.ingestBatch([])).toEqual([]);
  });
});
