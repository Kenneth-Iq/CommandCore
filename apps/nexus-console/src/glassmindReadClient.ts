/**
 * Nexus read-client for the Glassmind read API, per
 * docs/architecture/Nexus-Glassmind-Read-Client-Boundary.md and
 * docs/architecture/Glassmind-Read-Api-Contract.md.
 *
 * Deliberately does NOT import apps/glassmind — the query/response types
 * below are declared structurally independent of apps/glassmind's real
 * types, mirroring the exact same "declare independently rather than
 * cross-package import" precedent already used by
 * apps/jarvis-engine/src/glassmindReadAdapter.ts (GlassmindLikeStore) and
 * apps/glassmind/src/types.ts (EvidenceLink, independent of Nexus). This
 * keeps apps/nexus-console fully decoupled from apps/glassmind's package
 * boundary while still being able to consume data shaped exactly like what
 * apps/glassmind's real GlassmindMemoryRecord produces.
 *
 * No production URL is hardcoded anywhere in this file — every function
 * takes an explicit GlassmindReadClientConfig (baseUrl + an injectable
 * fetch-like dependency), mirroring this package's existing
 * src/api/commandcoreApi.ts pattern (VITE_COMMANDCORE_API_URL env var, no
 * default base URL baked in).
 *
 * This module is read-only by construction: it defines exactly four
 * functions (fetchMemoryBySourceReference, fetchMemoryByScope,
 * fetchMemoryTrace, fetchGlassmindReadiness), all GET-shaped, and exports
 * nothing else callable — see glassmindReadClient.test.ts's structural
 * "no write method" test.
 *
 * Not wired into any component or App.tsx — calling any of these functions
 * today means calling them directly, in a test or a future caller; no
 * existing Nexus component imports this file.
 */

/** Mirrors @commandcore/glassmind's SourceReference shape without importing it. */
export type GlassmindBySourceReferenceQuery = {
  conversationId?: string;
  messageId?: string;
  recommendationId?: string;
  eventId?: string;
};

/** Mirrors @commandcore/glassmind's RecordScope shape without importing it. */
export type GlassmindByScopeQuery = {
  entityKind: string;
  entityId: string;
};

/** Mirrors @commandcore/glassmind's EvidenceLink shape without importing it — suitable for EvidenceCard's existing evidence prop shape. */
export type NexusEvidenceItem = {
  label: string;
  page: string;
  selection?: Record<string, string | undefined>;
};

/**
 * The minimal shape of a Glassmind memory record this client needs, mirrored
 * from apps/jarvis-engine/src/glassmindReadAdapter.ts's identical
 * GlassmindLikeMemoryRecord — different Glassmind record kinds name their
 * "what happened" field differently (responseSummary/text/title+detail), so
 * all are accepted as optional and resolved in priority order, exactly as
 * that adapter already does for real.
 */
type RawGlassmindLikeRecord = {
  id: string;
  kind: string;
  responseSummary?: string;
  text?: string;
  title?: string;
  detail?: string;
  occurredAt: string;
  evidence?: NexusEvidenceItem | NexusEvidenceItem[];
};

type RawTraceEntry = {
  kind: string;
  occurredAt: string;
  lifecycleStatus?: string;
  lifecycleAt?: string;
  record: RawGlassmindLikeRecord;
};

type RawErrorCode = "invalid_request" | "permission_denied" | "backend_unavailable";

type RawGlassmindReadApiResponse<TRecord> =
  | { status: "not_queried" }
  | { status: "no_memory_found" }
  | { status: "found"; recordCount: number; records: TRecord[] }
  | { status: "error"; error: { code: RawErrorCode; message: string } };

/** Nexus-safe view of one memory record — what EvidenceCard-shaped consumers later need. */
export type NexusMemoryRecordView = {
  kind: string;
  summary: string;
  occurredAt: string;
  evidence?: NexusEvidenceItem;
};

/** Nexus-safe view of one trace entry — what a future memory trace display later needs. */
export type NexusTraceItemView = {
  kind: string;
  occurredAt: string;
  lifecycleStatus?: string;
  lifecycleAt?: string;
  summary: string;
  evidence?: NexusEvidenceItem;
};

export type NexusMemoryViewModel =
  | { state: "no_memory_found" }
  | { state: "found"; recordCount: number; records: NexusMemoryRecordView[] }
  | { state: "unavailable"; reason: string };

export type NexusTraceViewModel =
  | { state: "no_memory_found" }
  | { state: "found"; recordCount: number; items: NexusTraceItemView[] }
  | { state: "unavailable"; reason: string };

export type NexusReadinessViewModel = { state: "ready" } | { state: "unavailable"; reason: string };

/** A minimal fetch-like dependency — real `fetch`'s shape, injectable for tests, never assumed to point at a real server. */
export type GlassmindReadClientFetch = (url: string, init: RequestInit) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export type GlassmindReadClientConfig = {
  /** No default — callers must supply a real base URL; nothing in this file hardcodes one. */
  baseUrl: string;
  /** Defaults to the global fetch if not supplied. */
  fetchImpl?: GlassmindReadClientFetch;
};

function deriveSummary(record: RawGlassmindLikeRecord): string {
  if (record.responseSummary) {
    return record.responseSummary;
  }
  if (record.text) {
    return record.text;
  }
  if (record.title) {
    return record.detail ? `${record.title}: ${record.detail}` : record.title;
  }
  return "Memory record with no summary available.";
}

function deriveEvidence(record: RawGlassmindLikeRecord): NexusEvidenceItem | undefined {
  if (!record.evidence) {
    return undefined;
  }
  const first = Array.isArray(record.evidence) ? record.evidence[0] : record.evidence;
  if (!first) {
    return undefined;
  }
  return { label: first.label, page: first.page, selection: first.selection };
}

function toMemoryRecordView(record: RawGlassmindLikeRecord): NexusMemoryRecordView {
  return { kind: record.kind, summary: deriveSummary(record), occurredAt: record.occurredAt, evidence: deriveEvidence(record) };
}

function toTraceItemView(entry: RawTraceEntry): NexusTraceItemView {
  return {
    kind: entry.kind,
    occurredAt: entry.occurredAt,
    lifecycleStatus: entry.lifecycleStatus,
    lifecycleAt: entry.lifecycleAt,
    summary: deriveSummary(entry.record),
    evidence: deriveEvidence(entry.record),
  };
}

function unavailable(reason: string): { state: "unavailable"; reason: string } {
  return { state: "unavailable", reason };
}

function reasonFromError(error: { code: RawErrorCode; message: string }): string {
  return `${error.code}: ${error.message}`;
}

function buildQueryString(params: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, value);
    }
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function getJson(config: GlassmindReadClientConfig, path: string, query: Record<string, string | undefined>): Promise<unknown> {
  const fetchImpl = config.fetchImpl ?? fetch;
  const url = `${config.baseUrl}${path}${buildQueryString(query)}`;

  const response = await fetchImpl(url, { method: "GET", headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Glassmind read API request failed: ${response.status} ${path}`);
  }
  return response.json();
}

function toMemoryViewModel(raw: RawGlassmindReadApiResponse<RawGlassmindLikeRecord>): NexusMemoryViewModel {
  if (raw.status === "no_memory_found" || raw.status === "not_queried") {
    return { state: "no_memory_found" };
  }
  if (raw.status === "found") {
    return { state: "found", recordCount: raw.recordCount, records: raw.records.map(toMemoryRecordView) };
  }
  return unavailable(reasonFromError(raw.error));
}

function toTraceViewModel(raw: RawGlassmindReadApiResponse<RawTraceEntry>): NexusTraceViewModel {
  if (raw.status === "no_memory_found" || raw.status === "not_queried") {
    return { state: "no_memory_found" };
  }
  if (raw.status === "found") {
    return { state: "found", recordCount: raw.recordCount, items: raw.records.map(toTraceItemView) };
  }
  return unavailable(reasonFromError(raw.error));
}

/** GET /glassmind/memory/by-source-reference */
export async function fetchMemoryBySourceReference(
  query: GlassmindBySourceReferenceQuery,
  config: GlassmindReadClientConfig,
): Promise<NexusMemoryViewModel> {
  try {
    const raw = (await getJson(config, "/glassmind/memory/by-source-reference", {
      conversationId: query.conversationId,
      messageId: query.messageId,
      recommendationId: query.recommendationId,
      eventId: query.eventId,
    })) as RawGlassmindReadApiResponse<RawGlassmindLikeRecord>;
    return toMemoryViewModel(raw);
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : "Unknown error contacting the Glassmind read API.");
  }
}

/** GET /glassmind/memory/by-scope */
export async function fetchMemoryByScope(query: GlassmindByScopeQuery, config: GlassmindReadClientConfig): Promise<NexusMemoryViewModel> {
  try {
    const raw = (await getJson(config, "/glassmind/memory/by-scope", {
      entityKind: query.entityKind,
      entityId: query.entityId,
    })) as RawGlassmindReadApiResponse<RawGlassmindLikeRecord>;
    return toMemoryViewModel(raw);
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : "Unknown error contacting the Glassmind read API.");
  }
}

/** GET /glassmind/memory/trace */
export async function fetchMemoryTrace(query: GlassmindByScopeQuery, config: GlassmindReadClientConfig): Promise<NexusTraceViewModel> {
  try {
    const raw = (await getJson(config, "/glassmind/memory/trace", {
      entityKind: query.entityKind,
      entityId: query.entityId,
    })) as RawGlassmindReadApiResponse<RawTraceEntry>;
    return toTraceViewModel(raw);
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : "Unknown error contacting the Glassmind read API.");
  }
}

/** GET /glassmind/health/readiness */
export async function fetchGlassmindReadiness(config: GlassmindReadClientConfig): Promise<NexusReadinessViewModel> {
  try {
    const raw = (await getJson(config, "/glassmind/health/readiness", {})) as { ready: true } | { ready: false; reason: string };
    if (raw.ready) {
      return { state: "ready" };
    }
    return unavailable(raw.reason);
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : "Unknown error contacting the Glassmind read API.");
  }
}
