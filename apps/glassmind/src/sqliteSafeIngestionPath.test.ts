import { afterEach, describe, expect, it } from "vitest";
import { DefaultCommandCoreEventBridge, type CommandCoreEventEnvelope } from "./commandCoreEventBridge.js";
import { DurableGlassmindStore } from "./durableStore.js";
import { EventStoreIngestionAdapter, type GlassmindIngestionEvent } from "./eventStoreIngestion.js";
import { SafeIngestionPath } from "./safeIngestionPath.js";
import { createSqliteDriver, SqliteGlassmindPersistenceDriver } from "./sqliteDriver.js";
import type { FollowUpMemoryRecord, RecordScope, SourceReference } from "./types.js";

/**
 * End-to-end demonstration of the full first-safe-ingestion-path chain
 * terminating in a real (in-memory) SQLite database, per
 * docs/roadmap/Sprint-13-Implementation-Plan.md §3 item 7:
 *
 *   CommandCoreEventEnvelope (fake/dev only)
 *     -> DefaultCommandCoreEventBridge.convert
 *     -> SafeIngestionPath (orchestrates the two steps below)
 *     -> EventStoreIngestionAdapter.ingest
 *     -> DurableGlassmindStore (the provenance/business gate)
 *     -> SqliteGlassmindPersistenceDriver
 *     -> in-memory sql.js database
 *
 * Every component in this chain already has its own dedicated unit tests
 * (commandCoreEventBridge.test.ts, safeIngestionPath.test.ts,
 * eventStoreIngestion.test.ts, sqliteDriver.test.ts) — this file proves they
 * compose correctly end-to-end against a real database, not just against
 * fakes at each individual layer. Uses only fake/dev event envelopes; no
 * subscription to any production event source exists anywhere in this
 * chain, and no `core/` import exists anywhere in apps/glassmind (verified
 * separately by commandCoreEventBridge.test.ts's own structural test).
 */

const ELIGIBLE_ENVELOPE_TYPES = new Set(["MissionBlocked", "MissionEscalated"]);

function isEnvelopeEligible(envelope: CommandCoreEventEnvelope): boolean {
  return ELIGIBLE_ENVELOPE_TYPES.has(envelope.type);
}

function isEventEligible(): boolean {
  // The bridge already filtered eligibility; mirrors safeIngestionPath.test.ts's
  // identical reasoning for not duplicating the same decision twice.
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

let openDrivers: SqliteGlassmindPersistenceDriver[] = [];

async function buildSqlitePath(): Promise<{ path: SafeIngestionPath; store: DurableGlassmindStore; driver: SqliteGlassmindPersistenceDriver }> {
  const driver = await createSqliteDriver();
  openDrivers.push(driver);
  const store = new DurableGlassmindStore(driver);
  const bridge = new DefaultCommandCoreEventBridge(isEnvelopeEligible);
  const adapter = new EventStoreIngestionAdapter(store, isEventEligible, buildFollowUpFromEvent);
  return { path: new SafeIngestionPath(bridge, adapter), store, driver };
}

afterEach(() => {
  for (const driver of openDrivers) {
    driver.close();
  }
  openDrivers = [];
});

describe("SafeIngestionPath -> SQLite — eligible event writes a Glassmind record into SQLite", () => {
  it("converts, ingests, and persists an eligible envelope all the way into the SQLite database", async () => {
    const { path, driver } = await buildSqlitePath();

    const result = path.process(buildEnvelope());

    expect(result.outcome).toBe("written");
    if (result.outcome === "written") {
      expect(result.record.kind).toBe("follow_up");
      // Confirm the write actually landed in SQLite, not just returned from
      // the in-memory call chain — a direct driver-level read, independent
      // of the store layer that just wrote it.
      expect(driver.findById("follow_up", result.record.id)).toEqual(result.record);
    }
  });
});

describe("SafeIngestionPath -> SQLite — ineligible event is skipped", () => {
  it("skips at the bridge stage; nothing is written to SQLite", async () => {
    const { path, driver } = await buildSqlitePath();

    const result = path.process(buildEnvelope({ type: "MissionCompleted" }));

    expect(result).toMatchObject({ outcome: "skipped", stage: "bridge", reason: "ineligible" });
    expect(driver.findByScope({ entityKind: "mission", entityId: "m-1" })).toHaveLength(0);
  });
});

describe("SafeIngestionPath -> SQLite — missing provenance is rejected/skipped safely", () => {
  it("skips an envelope with no event id at the bridge stage, without throwing, nothing written to SQLite", async () => {
    const { path, driver } = await buildSqlitePath();

    let result;
    expect(() => {
      result = path.process(buildEnvelope({ id: "" }));
    }).not.toThrow();

    expect(result).toMatchObject({ outcome: "skipped", stage: "bridge", reason: "missing_event_id" });
    expect(driver.findByScope({ entityKind: "mission", entityId: "m-1" })).toHaveLength(0);
  });

  it("skips an eligible envelope with no scope at the ingestion stage, without throwing, nothing written to SQLite", async () => {
    const { path, driver } = await buildSqlitePath();

    let result;
    expect(() => {
      result = path.process(buildEnvelope({ scope: undefined }));
    }).not.toThrow();

    expect(result).toMatchObject({ outcome: "skipped", stage: "ingestion", reason: "missing_scope" });
    expect(driver.findByScope({ entityKind: "mission", entityId: "m-1" })).toHaveLength(0);
  });
});

describe("SafeIngestionPath -> SQLite — retrieval from SQLite returns the ingested memory", () => {
  it("retrieves the ingested record back out of SQLite by scope and by sourceReference", async () => {
    const { path, driver } = await buildSqlitePath();

    path.process(buildEnvelope());

    const byScope = driver.findByScope({ entityKind: "mission", entityId: "m-1" });
    expect(byScope).toHaveLength(1);

    const bySourceReference = driver.findBySourceReference({ conversationId: "conv-1" });
    expect(bySourceReference).toHaveLength(1);
    expect(bySourceReference[0].id).toBe(byScope[0].id);
  });

  it("returns [] from SQLite when nothing was ingested — empty retrieval is honest, not an error", async () => {
    const { driver } = await buildSqlitePath();

    expect(driver.findByScope({ entityKind: "mission", entityId: "m-1" })).toEqual([]);
    expect(driver.findBySourceReference({ conversationId: "conv-1" })).toEqual([]);
  });
});

describe("SafeIngestionPath -> SQLite — raw payload content does not appear in stored records", () => {
  it("does not persist envelope.payload anywhere in the SQLite-stored record", async () => {
    const { path, driver } = await buildSqlitePath();

    const result = path.process(buildEnvelope());

    expect(result.outcome).toBe("written");
    if (result.outcome === "written") {
      const stored = driver.findById("follow_up", result.record.id);
      expect(JSON.stringify(stored)).not.toContain("internalDebugInfo");
      expect(JSON.stringify(stored)).not.toContain("very long stack trace");
      expect(stored).not.toHaveProperty("payload");
    }
  });
});
