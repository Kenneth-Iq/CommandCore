import type { JarvisConversationEvidence, JarvisMemoryQuery, JarvisMemoryRecord, JarvisMemoryStore } from "./types.js";

/**
 * Read-only adapter from a Glassmind-like memory store to this package's own
 * JarvisMemoryStore interface, per
 * docs/architecture/Glassmind-Package-Integration-Map.md §5 and
 * docs/roadmap/Sprint-11-Implementation-Plan.md §3 item 3.
 *
 * apps/jarvis-engine and apps/glassmind remain separate npm packages with no
 * shared workspace tooling, so this module does not import
 * @commandcore/glassmind directly. Instead it declares the minimal,
 * structurally-compatible shape it needs (GlassmindLikeStore below) —
 * TypeScript's structural typing means a real GlassmindStore instance (or
 * DurableGlassmindStore, or any future implementation) satisfies this
 * automatically, with zero coupling between the two packages' build/test
 * pipelines. This mirrors the same "declare independently rather than
 * import across packages" precedent apps/glassmind itself already used for
 * its own EvidenceLink.
 */

/** Mirrors @commandcore/glassmind's SourceReference shape without importing it. */
export type GlassmindLikeSourceReference = {
  conversationId?: string;
  messageId?: string;
  recommendationId?: string;
  eventId?: string;
};

/** Mirrors @commandcore/glassmind's RecordScope shape without importing it. */
export type GlassmindLikeScope = {
  entityKind: string;
  entityId: string;
};

/** Mirrors @commandcore/glassmind's EvidenceLink shape without importing it. */
export type GlassmindLikeEvidence = {
  label: string;
  page: string;
  selection?: Record<string, string | undefined>;
};

/**
 * The minimal shape of a Glassmind memory record this adapter needs.
 * Different Glassmind record kinds name their "what happened" field
 * differently (`responseSummary` on conversation turns, `text` on
 * follow-ups, `title`/`detail` on decisions and approvals) so all are
 * accepted as optional and resolved in priority order by `deriveSummary`.
 * `evidence` may be a single item or an array, matching how different
 * Glassmind record kinds shape it.
 */
export type GlassmindLikeMemoryRecord = {
  id: string;
  kind: string;
  responseSummary?: string;
  text?: string;
  title?: string;
  detail?: string;
  evidence?: GlassmindLikeEvidence | GlassmindLikeEvidence[];
};

export interface GlassmindLikeStore {
  retrieveBySourceReference(sourceReference: GlassmindLikeSourceReference): GlassmindLikeMemoryRecord[];
  retrieveByScope(scope: GlassmindLikeScope): GlassmindLikeMemoryRecord[];
}

function deriveSummary(record: GlassmindLikeMemoryRecord): string {
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

function deriveEvidence(record: GlassmindLikeMemoryRecord): JarvisConversationEvidence | undefined {
  if (!record.evidence) {
    return undefined;
  }
  const first = Array.isArray(record.evidence) ? record.evidence[0] : record.evidence;
  if (!first) {
    return undefined;
  }
  return { label: first.label, page: first.page, selection: first.selection };
}

/**
 * Read-only adapter implementing JarvisMemoryStore over a GlassmindLikeStore.
 * This class has exactly one method — `retrieve` — and no write method of
 * any kind. Jarvis can ask Glassmind for memory; it can never write to it
 * through this adapter, structurally, not merely by convention.
 */
export class GlassmindReadOnlyMemoryAdapter implements JarvisMemoryStore {
  constructor(private readonly store: GlassmindLikeStore) {}

  retrieve(query: JarvisMemoryQuery): JarvisMemoryRecord[] {
    const bySourceReference = query.sourceReference ? this.store.retrieveBySourceReference(query.sourceReference) : [];
    const byScope = query.scope ? this.store.retrieveByScope(query.scope) : [];

    const seen = new Set<string>();
    const combined: GlassmindLikeMemoryRecord[] = [];
    for (const record of [...bySourceReference, ...byScope]) {
      if (!seen.has(record.id)) {
        seen.add(record.id);
        combined.push(record);
      }
    }

    return combined.map((record) => ({
      summary: deriveSummary(record),
      evidence: deriveEvidence(record),
    }));
  }
}
