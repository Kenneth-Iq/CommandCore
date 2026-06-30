import type { EntityKind, GlassmindMemoryRecord, SourceReference } from "./types.js";

/**
 * Dev/test-only Glassmind read API stub, implementing
 * docs/architecture/Glassmind-Read-Api-Contract.md, placed per
 * docs/architecture/Glassmind-Backend-Read-Api-Runtime-Decision.md §4: kept
 * inside apps/glassmind rather than a new package, since this repo has no
 * workspace tooling to make a new package cheap and this stub is explicitly
 * not yet an HTTP server.
 *
 * Exposes plain handler functions (via GlassmindReadApiStub's methods) — no
 * HTTP server, no listener, no process of its own. Calling a handler means
 * calling a function in-process, exactly like every other dev/test harness
 * in this package (SafeIngestionPath, jarvisSqliteReadHarness.test.ts).
 *
 * Takes a narrow GlassmindReadOnlyDependency — only the two read methods,
 * not the full GlassmindStore — so that even a caller passing a real,
 * fully-writable GlassmindStore/DurableGlassmindStore instance cannot reach
 * a write method through this stub's own type signature. This is the same
 * "narrow read-only interface" pattern apps/jarvis-engine's
 * GlassmindLikeStore already established for its own Glassmind dependency.
 *
 * Never imports apps/nexus-console or core/ — verified by dedicated
 * structural tests in readApiStub.test.ts, mirroring
 * commandCoreEventBridge.test.ts's "no CommandCore import" pattern and
 * devGlassmindHarness.test.ts's "no Nexus import" pattern.
 */

export type GlassmindReadApiErrorCode = "invalid_request" | "permission_denied" | "backend_unavailable";

export type GlassmindReadApiError = {
  code: GlassmindReadApiErrorCode;
  message: string;
};

export type GlassmindReadApiResponse<TRecord> =
  | { status: "not_queried" }
  | { status: "no_memory_found" }
  | { status: "found"; recordCount: number; records: TRecord[] }
  | { status: "error"; error: GlassmindReadApiError };

export type GlassmindTraceEntry = {
  kind: GlassmindMemoryRecord["kind"];
  occurredAt: string;
  lifecycleStatus?: string;
  lifecycleAt?: string;
  record: GlassmindMemoryRecord;
};

export type GlassmindReadinessResponse = { ready: true } | { ready: false; reason: string };

export type BySourceReferenceQuery = SourceReference;

export type ByScopeQuery = {
  entityKind: EntityKind;
  entityId: string;
};

/**
 * The minimal read-only shape this stub depends on — structurally satisfied
 * by InMemoryGlassmindStore, DurableGlassmindStore (with any driver,
 * including SqliteGlassmindPersistenceDriver), or any future GlassmindStore
 * implementation, without needing the stub to know which.
 */
export interface GlassmindReadOnlyDependency {
  retrieveBySourceReference(sourceReference: SourceReference): GlassmindMemoryRecord[];
  retrieveByScope(scope: ByScopeQuery): GlassmindMemoryRecord[];
}

function invalidRequest(message: string): { status: "error"; error: GlassmindReadApiError } {
  return { status: "error", error: { code: "invalid_request", message } };
}

function backendUnavailable(error: unknown): { status: "error"; error: GlassmindReadApiError } {
  return {
    status: "error",
    error: { code: "backend_unavailable", message: error instanceof Error ? error.message : "Unknown backend error." },
  };
}

function wrapRecords<TRecord>(records: TRecord[]): GlassmindReadApiResponse<TRecord> {
  if (records.length === 0) {
    return { status: "no_memory_found" };
  }
  return { status: "found", recordCount: records.length, records };
}

function deriveLifecycle(record: GlassmindMemoryRecord): { lifecycleStatus?: string; lifecycleAt?: string } {
  if (record.kind === "follow_up" || record.kind === "deferred_decision") {
    return record.resolution ? { lifecycleStatus: record.status, lifecycleAt: record.resolution.resolvedAt } : {};
  }
  if (record.kind === "approval_waiting_state") {
    return record.update ? { lifecycleStatus: record.status, lifecycleAt: record.update.updatedAt } : {};
  }
  return {};
}

function hasAnySourceReferenceField(query: BySourceReferenceQuery): boolean {
  return (
    query.conversationId !== undefined ||
    query.messageId !== undefined ||
    query.recommendationId !== undefined ||
    query.eventId !== undefined
  );
}

function isValidScopeQuery(query: ByScopeQuery): boolean {
  return Boolean(query.entityKind) && Boolean(query.entityId);
}

export class GlassmindReadApiStub {
  constructor(private readonly dependency: GlassmindReadOnlyDependency) {}

  readBySourceReference(query: BySourceReferenceQuery): GlassmindReadApiResponse<GlassmindMemoryRecord> {
    if (!hasAnySourceReferenceField(query)) {
      return invalidRequest("At least one of conversationId, messageId, recommendationId, eventId is required.");
    }
    try {
      return wrapRecords(this.dependency.retrieveBySourceReference(query));
    } catch (error) {
      return backendUnavailable(error);
    }
  }

  readByScope(query: ByScopeQuery): GlassmindReadApiResponse<GlassmindMemoryRecord> {
    if (!isValidScopeQuery(query)) {
      return invalidRequest("Both entityKind and entityId are required.");
    }
    try {
      return wrapRecords(this.dependency.retrieveByScope(query));
    } catch (error) {
      return backendUnavailable(error);
    }
  }

  readTrace(query: ByScopeQuery): GlassmindReadApiResponse<GlassmindTraceEntry> {
    if (!isValidScopeQuery(query)) {
      return invalidRequest("Both entityKind and entityId are required.");
    }
    try {
      const records = this.dependency.retrieveByScope(query);
      if (records.length === 0) {
        return { status: "no_memory_found" };
      }
      const entries: GlassmindTraceEntry[] = records
        .map((record) => ({ kind: record.kind, occurredAt: record.occurredAt, record, ...deriveLifecycle(record) }))
        .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
      return { status: "found", recordCount: entries.length, records: entries };
    } catch (error) {
      return backendUnavailable(error);
    }
  }

  readiness(): GlassmindReadinessResponse {
    try {
      // A lightweight, harmless probe call — any GlassmindReadOnlyDependency
      // must answer retrieveByScope without throwing for an unconfigured or
      // reachable backend to count as ready; a real, working dependency
      // simply returns [] for a scope nothing matches, which is itself a
      // successful, honest call (per the empty-retrieval-is-valid rule).
      this.dependency.retrieveByScope({ entityKind: "mission", entityId: "__glassmind_read_api_readiness_probe__" });
      return { ready: true };
    } catch (error) {
      return { ready: false, reason: error instanceof Error ? error.message : "Unknown backend error." };
    }
  }
}
