import type {
  CommandCoreBridgeSkipReason,
  CommandCoreEventBridge,
  CommandCoreEventEnvelope,
} from "./commandCoreEventBridge.js";
import type { EventStoreIngestionAdapter, GlassmindIngestionEvent, IngestionSkipReason } from "./eventStoreIngestion.js";
import type { GlassmindMemoryRecord } from "./types.js";

/**
 * First safe ingestion path skeleton, per
 * docs/architecture/CommandCore-EventStore-Bridge-Runtime-Decision.md §5 and
 * docs/roadmap/Sprint-12-Implementation-Plan.md §3 item 7.
 *
 * Pure composition of two already-existing, already-tested components —
 * CommandCoreEventBridge.convert and EventStoreIngestionAdapter.ingest — and
 * nothing else. This class adds no new business logic, no new eligibility
 * rule, no new provenance handling: every safety property it has comes from
 * composing components that already individually guarantee it. In
 * particular it never touches `envelope.payload` itself; payload
 * non-duplication is already enforced by the bridge (which never reads it
 * when converting) and the ingestion adapter (whose record kinds have no
 * payload-shaped field to begin with).
 *
 * Deliberately has no subscription, polling loop, or production wiring —
 * `process`/`processBatch` are plain functions a future runtime (per the
 * bridge runtime decision document) would call per envelope, exactly as
 * EventStoreIngestionAdapter.ingest already is.
 */
export type SafeIngestionOutcome =
  | { outcome: "written"; record: GlassmindMemoryRecord }
  | { outcome: "skipped"; stage: "bridge"; reason: CommandCoreBridgeSkipReason; envelope: CommandCoreEventEnvelope }
  | { outcome: "skipped"; stage: "ingestion"; reason: IngestionSkipReason; event: GlassmindIngestionEvent };

export class SafeIngestionPath {
  constructor(
    private readonly bridge: CommandCoreEventBridge,
    private readonly adapter: EventStoreIngestionAdapter,
  ) {}

  process(envelope: CommandCoreEventEnvelope): SafeIngestionOutcome {
    const bridgeResult = this.bridge.convert(envelope);
    if (bridgeResult.outcome === "skipped") {
      return { outcome: "skipped", stage: "bridge", reason: bridgeResult.reason, envelope: bridgeResult.envelope };
    }

    const ingestionResult = this.adapter.ingest(bridgeResult.event);
    if (ingestionResult.outcome === "skipped") {
      return { outcome: "skipped", stage: "ingestion", reason: ingestionResult.reason, event: ingestionResult.event };
    }

    return { outcome: "written", record: ingestionResult.record };
  }

  /** Processes a batch of envelopes; an empty batch is a valid no-op, never an error. */
  processBatch(envelopes: CommandCoreEventEnvelope[]): SafeIngestionOutcome[] {
    return envelopes.map((envelope) => this.process(envelope));
  }
}
