import type { GlassmindStore } from "./store.js";
import type { EntityKind, GlassmindMemoryRecord, RecordScope, SourceReference } from "./types.js";

/**
 * EventStore ingestion adapter skeleton, per
 * docs/architecture/Glassmind-Ingestion.md §2-3 and
 * docs/architecture/Glassmind-Package-Integration-Map.md §7.
 *
 * This module deliberately does NOT import anything from core/ (CommandCore's
 * Python kernel — not even reachable from TypeScript) or from
 * apps/nexus-console. The event shape below is declared structurally,
 * independent of CommandCore's real EventStore event type, exactly as
 * EvidenceLink in types.ts is declared independently of Nexus's EvidenceLink.
 * A real ingestion adapter wiring this up to the actual EventStore is later,
 * separate work — this skeleton has no subscription loop, no polling, and no
 * network/file/process call of any kind.
 */

/**
 * The minimal shape an EventStore event must have for ingestion to consider
 * it at all. `payload` is intentionally present (a real event always carries
 * one) but this adapter never copies it into a produced GlassmindMemoryRecord
 * — see buildRecord's contract below and Glassmind-Architecture.md §5's rule
 * against duplicating raw event payloads.
 */
export type GlassmindIngestionEvent = {
  id: string;
  type: string;
  timestamp: string;
  scope?: { entityKind: EntityKind; entityId: string };
  conversationId?: string;
  recommendationId?: string;
  messageId?: string;
  payload?: Record<string, unknown>;
};

export type IngestionSkipReason = "ineligible" | "missing_provenance" | "missing_scope";

export type IngestionResult =
  | { outcome: "written"; record: GlassmindMemoryRecord }
  | { outcome: "skipped"; reason: IngestionSkipReason; event: GlassmindIngestionEvent };

/**
 * Decides whether an event is worth ingesting at all, per the relevance
 * filter in Glassmind-Ingestion.md §2 step 2 ("not every event is worth
 * remembering"). The ingestion adapter has no default/global eligibility
 * rule of its own — the caller supplies one, since the real CommandCore
 * event taxonomy and significance model does not exist in this skeleton.
 * This is what keeps the adapter from doing broad event mirroring by
 * default: with no eligibility function supplied, nothing is eligible.
 */
export type IngestionEligibility = (event: GlassmindIngestionEvent) => boolean;

/**
 * Builds the GlassmindMemoryRecord an eligible, provenance-bearing event
 * should become. The builder receives the already-derived sourceReference
 * and scope (so it cannot accidentally omit them) but is responsible for
 * never copying `event.payload` into the record it returns — none of the
 * four GlassmindMemoryRecord kinds has a field shaped to hold a raw payload
 * in the first place (see types.ts), so a correct builder can only ever
 * extract small, derived facts (a short summary string, a status), never
 * the payload wholesale.
 */
export type IngestionRecordBuilder = (
  event: GlassmindIngestionEvent,
  sourceReference: SourceReference,
  scope: RecordScope,
) => GlassmindMemoryRecord;

function deriveSourceReference(event: GlassmindIngestionEvent): SourceReference | undefined {
  const sourceReference: SourceReference = {
    eventId: event.id || undefined,
    conversationId: event.conversationId,
    recommendationId: event.recommendationId,
    messageId: event.messageId,
  };

  const hasProvenance =
    Boolean(sourceReference.eventId) ||
    Boolean(sourceReference.conversationId) ||
    Boolean(sourceReference.recommendationId) ||
    Boolean(sourceReference.messageId);

  return hasProvenance ? sourceReference : undefined;
}

function writeToStore(store: GlassmindStore, record: GlassmindMemoryRecord): GlassmindMemoryRecord {
  switch (record.kind) {
    case "conversation_turn":
      return store.recordConversationTurn(record);
    case "follow_up":
      return store.recordFollowUp(record);
    case "deferred_decision":
      return store.recordDeferredDecision(record);
    case "approval_waiting_state":
      return store.recordApprovalWaitingState(record);
  }
}

/**
 * Conservative EventStore ingestion adapter skeleton. Not connected to any
 * real EventStore — `ingest`/`ingestBatch` are plain functions a future
 * subscription/polling mechanism would call per event; this class has no
 * loop, no subscription, and no default eligibility (the caller must supply
 * one), so nothing is ingested unless the caller explicitly decides it
 * should be.
 */
export class EventStoreIngestionAdapter {
  constructor(
    private readonly store: GlassmindStore,
    private readonly isEligible: IngestionEligibility,
    private readonly buildRecord: IngestionRecordBuilder,
  ) {}

  ingest(event: GlassmindIngestionEvent): IngestionResult {
    if (!this.isEligible(event)) {
      return { outcome: "skipped", reason: "ineligible", event };
    }

    const sourceReference = deriveSourceReference(event);
    if (!sourceReference) {
      return { outcome: "skipped", reason: "missing_provenance", event };
    }

    if (!event.scope) {
      return { outcome: "skipped", reason: "missing_scope", event };
    }

    const record = this.buildRecord(event, sourceReference, event.scope);
    const written = writeToStore(this.store, record);
    return { outcome: "written", record: written };
  }

  /** Processes a batch of events; an empty batch is a valid no-op, never an error. */
  ingestBatch(events: GlassmindIngestionEvent[]): IngestionResult[] {
    return events.map((event) => this.ingest(event));
  }
}
