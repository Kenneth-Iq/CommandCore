import { afterEach, describe, expect, it } from "vitest";
import { DefaultCommandCoreEventBridge, type CommandCoreEventEnvelope } from "./commandCoreEventBridge.js";
import { DurableGlassmindStore } from "./durableStore.js";
import { EventStoreIngestionAdapter, type GlassmindIngestionEvent } from "./eventStoreIngestion.js";
import { SafeIngestionPath } from "./safeIngestionPath.js";
import { createSqliteDriver, SqliteGlassmindPersistenceDriver } from "./sqliteDriver.js";
import type { GlassmindStore } from "./store.js";
import type { EvidenceLink, FollowUpMemoryRecord, GlassmindMemoryRecord, RecordScope, SourceReference } from "./types.js";

/**
 * Dev/test-only harness proving Jarvis can read from a real,
 * SQLite-backed Glassmind store end to end, per
 * docs/roadmap/Sprint-13-Implementation-Plan.md §3 item 8:
 *
 *   CommandCoreEventEnvelope (fake/dev)
 *     -> DefaultCommandCoreEventBridge
 *     -> SafeIngestionPath
 *     -> EventStoreIngestionAdapter
 *     -> DurableGlassmindStore
 *     -> SqliteGlassmindPersistenceDriver (real, in-memory sql.js)
 *     -> [package boundary]
 *     -> Jarvis-like read-only retrieval + conversation-engine-shaped response
 *
 * apps/jarvis-engine and apps/glassmind are separate npm packages with no
 * shared workspace tooling and no TypeScript project-reference relationship
 * — both packages' tsconfig.json set "rootDir": "src", which mechanically
 * rejects a relative cross-package import (confirmed before writing this
 * file). Per the same "declare structurally independent types rather than
 * cross-package import" precedent apps/jarvis-engine's own
 * glassmindReadAdapter.ts already established for the opposite direction
 * (and this package's own types.ts established for EvidenceLink,
 * independent of Nexus, before that), this file does not import
 * apps/jarvis-engine. Instead it mirrors — locally, faithfully, and
 * minimally — the exact retrieval contract apps/jarvis-engine/src/engine.ts's
 * `retrieveMemory` function and apps/jarvis-engine/src/glassmindReadAdapter.ts's
 * `GlassmindReadOnlyMemoryAdapter` already implement for real: the same
 * not_queried/no_memory_found/found distinction, the same "never invent
 * evidence for a record that didn't carry any" rule, the same evidence
 * field shape. This proves the real Glassmind side of the chain against
 * the same contract Jarvis's real code satisfies — not an invented,
 * independently-designed contract that happens to look similar.
 *
 * Intent classification (apps/jarvis-engine/src/intentClassifier.ts) is
 * deliberately NOT mirrored here — it has no bearing on the Glassmind-read
 * contract this harness exists to prove, and mirroring it would be
 * duplicating unrelated logic for no reason.
 */

type JarvisLikeMemoryRetrievalStatus =
  | { status: "not_queried" }
  | { status: "no_memory_found" }
  | { status: "found"; recordCount: number };

type JarvisLikeEvidence = EvidenceLink;

type JarvisLikeConversationResponse = {
  answerText: string;
  evidence: JarvisLikeEvidence[];
  memoryRetrieval: JarvisLikeMemoryRetrievalStatus;
};

/** Mirrors GlassmindReadOnlyMemoryAdapter's deriveEvidence exactly. */
function deriveJarvisLikeEvidence(record: GlassmindMemoryRecord): JarvisLikeEvidence | undefined {
  if (!record.evidence) {
    return undefined;
  }
  const first = Array.isArray(record.evidence) ? record.evidence[0] : record.evidence;
  if (!first) {
    return undefined;
  }
  return { label: first.label, page: first.page, selection: first.selection };
}

/** Mirrors engine.ts's retrieveMemory function exactly, against this package's real GlassmindStore type. */
function jarvisLikeRetrieveMemory(
  store: GlassmindStore | undefined,
  scope: RecordScope,
): { status: JarvisLikeMemoryRetrievalStatus; evidence: JarvisLikeEvidence[] } {
  if (!store) {
    return { status: { status: "not_queried" }, evidence: [] };
  }

  const records = store.retrieveByScope(scope);

  if (records.length === 0) {
    return { status: { status: "no_memory_found" }, evidence: [] };
  }

  // Evidence is collected only from records that actually carry it — never
  // invented for a memory record that didn't supply one, even though the
  // record itself still counts toward recordCount. Identical rule to
  // engine.ts's retrieveMemory.
  const evidence = records.map(deriveJarvisLikeEvidence).filter((item): item is JarvisLikeEvidence => item !== undefined);

  return { status: { status: "found", recordCount: records.length }, evidence };
}

/** Mirrors DeterministicJarvisConversationEngine.processTurn's shape, minus intent classification (irrelevant here). */
function jarvisLikeProcessTurn(store: GlassmindStore | undefined, scope: RecordScope): JarvisLikeConversationResponse {
  const memory = jarvisLikeRetrieveMemory(store, scope);
  return {
    answerText: "Here is what I can tell you about missions.",
    evidence: memory.evidence,
    memoryRetrieval: memory.status,
  };
}

const ELIGIBLE_ENVELOPE_TYPES = new Set(["MissionBlocked"]);

function isEnvelopeEligible(envelope: CommandCoreEventEnvelope): boolean {
  return ELIGIBLE_ENVELOPE_TYPES.has(envelope.type);
}

function isEventEligible(): boolean {
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
    evidence: { label: "Mission Detail", page: "missions" },
    sourceReference,
    scope,
    occurredAt: event.timestamp,
    confidence: 55,
  };
}

function buildFollowUpFromEventNoEvidence(
  event: GlassmindIngestionEvent,
  sourceReference: SourceReference,
  scope: RecordScope,
): FollowUpMemoryRecord {
  const record = buildFollowUpFromEvent(event, sourceReference, scope);
  delete record.evidence;
  return record;
}

function buildEnvelope(overrides: Partial<CommandCoreEventEnvelope> = {}): CommandCoreEventEnvelope {
  return {
    id: "evt-1",
    type: "MissionBlocked",
    timestamp: "2026-06-29T00:00:00.000Z",
    scope: { entityKind: "mission", entityId: "m-1" },
    reference: { conversationId: "conv-1" },
    payload: { missionId: "m-1", reason: "agent offline", internalDebugInfo: { secretToken: "do-not-leak-this-token" } },
    ...overrides,
  };
}

let openDrivers: SqliteGlassmindPersistenceDriver[] = [];

async function buildIngestedStore(
  recordBuilder: typeof buildFollowUpFromEvent = buildFollowUpFromEvent,
): Promise<{ store: DurableGlassmindStore; driver: SqliteGlassmindPersistenceDriver; ingest: (envelope: CommandCoreEventEnvelope) => ReturnType<SafeIngestionPath["process"]> }> {
  const driver = await createSqliteDriver();
  openDrivers.push(driver);
  const store = new DurableGlassmindStore(driver);
  const bridge = new DefaultCommandCoreEventBridge(isEnvelopeEligible);
  const adapter = new EventStoreIngestionAdapter(store, isEventEligible, recordBuilder);
  const path = new SafeIngestionPath(bridge, adapter);
  return { store, driver, ingest: (envelope) => path.process(envelope) };
}

afterEach(() => {
  for (const driver of openDrivers) {
    driver.close();
  }
  openDrivers = [];
});

describe("Jarvis-like read <- SQLite-backed Glassmind — finds ingested memory", () => {
  it("finds memory that was ingested into SQLite via the safe ingestion path", async () => {
    const { store, ingest } = await buildIngestedStore();
    const result = ingest(buildEnvelope());
    expect(result.outcome).toBe("written");

    const response = jarvisLikeProcessTurn(store, { entityKind: "mission", entityId: "m-1" });

    expect(response.memoryRetrieval).toEqual({ status: "found", recordCount: 1 });
  });
});

describe("Jarvis-like read <- SQLite-backed Glassmind — no relevant memory", () => {
  it("returns no_memory_found when SQLite has nothing for the queried scope", async () => {
    const { store } = await buildIngestedStore();

    const response = jarvisLikeProcessTurn(store, { entityKind: "mission", entityId: "m-1" });

    expect(response.memoryRetrieval).toEqual({ status: "no_memory_found" });
    expect(response.evidence).toEqual([]);
  });

  it("returns not_queried when no store is configured at all", () => {
    const response = jarvisLikeProcessTurn(undefined, { entityKind: "mission", entityId: "m-1" });

    expect(response.memoryRetrieval).toEqual({ status: "not_queried" });
    expect(response.evidence).toEqual([]);
  });
});

describe("Jarvis-like read <- SQLite-backed Glassmind — preserves evidence", () => {
  it("surfaces the ingested record's evidence, mapped through correctly", async () => {
    const { store, ingest } = await buildIngestedStore();
    ingest(buildEnvelope());

    const response = jarvisLikeProcessTurn(store, { entityKind: "mission", entityId: "m-1" });

    expect(response.evidence).toEqual([{ label: "Mission Detail", page: "missions", selection: undefined }]);
  });
});

describe("Jarvis-like read <- SQLite-backed Glassmind — does not fabricate evidence", () => {
  it("reports found but contributes no evidence for a record ingested with none", async () => {
    const { store, ingest } = await buildIngestedStore(buildFollowUpFromEventNoEvidence);
    const result = ingest(buildEnvelope());
    expect(result.outcome).toBe("written");

    const response = jarvisLikeProcessTurn(store, { entityKind: "mission", entityId: "m-1" });

    expect(response.memoryRetrieval).toEqual({ status: "found", recordCount: 1 });
    expect(response.evidence).toEqual([]);
  });
});

const WRITE_METHOD_PREFIXES = ["record", "resolve", "update"];

describe("Jarvis-like read <- SQLite-backed Glassmind — no write path", () => {
  it("calls retrieveByScope on the store, and never a record*/resolve*/update* method", async () => {
    const { store, ingest } = await buildIngestedStore();
    ingest(buildEnvelope());

    const calledMethods: string[] = [];
    const spyStore = new Proxy(store, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof prop === "string" && typeof value === "function") {
          calledMethods.push(prop);
        }
        return value;
      },
    });

    jarvisLikeProcessTurn(spyStore, { entityKind: "mission", entityId: "m-1" });

    expect(calledMethods).toContain("retrieveByScope");
    for (const method of calledMethods) {
      expect(WRITE_METHOD_PREFIXES.some((prefix) => method.startsWith(prefix))).toBe(false);
    }
  });
});

describe("Jarvis-like read <- SQLite-backed Glassmind — raw payload never appears in evidence", () => {
  it("does not leak envelope.payload content into the response's evidence or answer text", async () => {
    const { store, ingest } = await buildIngestedStore();
    ingest(buildEnvelope());

    const response = jarvisLikeProcessTurn(store, { entityKind: "mission", entityId: "m-1" });

    expect(JSON.stringify(response)).not.toContain("secretToken");
    expect(JSON.stringify(response)).not.toContain("do-not-leak-this-token");
  });
});
