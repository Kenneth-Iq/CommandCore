import type { GlassmindIngestionEvent } from "./eventStoreIngestion.js";
import type { EntityKind } from "./types.js";

/**
 * CommandCore EventStore bridge skeleton, per
 * docs/architecture/Glassmind-Repository-Boundary-Decision.md §5's bridge
 * requirement and docs/roadmap/Sprint-11-Implementation-Plan.md §3 item 2.
 *
 * This module does NOT import core/ — CommandCore's Python kernel has no
 * TypeScript runtime to import from in the first place, so there is no
 * direct import path even if one were attempted. The types below are
 * declared structurally, independent of CommandCore's real EventStore event
 * type, exactly as GlassmindIngestionEvent in eventStoreIngestion.ts is.
 *
 * This bridge converts a CommandCoreEventEnvelope (the shape a real
 * CommandCore EventStore event would arrive in) into a GlassmindIngestionEvent
 * (the shape eventStoreIngestion.ts's EventStoreIngestionAdapter already
 * consumes) — it is the missing layer between "what CommandCore would send"
 * and "what Glassmind ingestion already understands," not a replacement for
 * either. Conversion only; no subscription loop, no polling, no network call,
 * and no write of any kind back toward CommandCore. The data flow this module
 * participates in is one-directional: CommandCore/EventStore -> Glassmind.
 */

/**
 * Reference fields beyond the envelope's own id that help Glassmind trace a
 * converted record's provenance — mirrors SourceReference's shape without
 * importing it, since CommandCoreEventReference describes what the envelope
 * carries, not what Glassmind stores.
 */
export type CommandCoreEventReference = {
  conversationId?: string;
  recommendationId?: string;
  messageId?: string;
};

/**
 * The minimal shape a real CommandCore EventStore event envelope is expected
 * to have. `payload` is present (a real envelope always carries one) but is
 * never copied into the converted GlassmindIngestionEvent — see `convert`'s
 * implementation and the payload-non-duplication test in this module's test
 * file.
 */
export type CommandCoreEventEnvelope = {
  id: string;
  type: string;
  timestamp: string;
  scope?: { entityKind: EntityKind; entityId: string };
  reference?: CommandCoreEventReference;
  payload?: Record<string, unknown>;
};

export type CommandCoreBridgeSkipReason = "ineligible" | "missing_event_id";

export type CommandCoreBridgeResult =
  | { outcome: "converted"; event: GlassmindIngestionEvent }
  | { outcome: "skipped"; reason: CommandCoreBridgeSkipReason; envelope: CommandCoreEventEnvelope };

/**
 * Decides whether an envelope is even worth converting, mirroring
 * eventStoreIngestion.ts's IngestionEligibility pattern: the bridge has no
 * default eligibility rule of its own (the caller supplies one), since the
 * real CommandCore event taxonomy does not exist in this skeleton. With no
 * eligibility function narrowing things, nothing should be assumed eligible
 * by default.
 */
export type CommandCoreEventEligibility = (envelope: CommandCoreEventEnvelope) => boolean;

export interface CommandCoreEventBridge {
  convert(envelope: CommandCoreEventEnvelope): CommandCoreBridgeResult;
}

/**
 * Conservative default bridge implementation. Not connected to any real
 * EventStore — `convert` is a plain function a future subscription/polling
 * mechanism (itself out of scope here) would call per envelope.
 */
export class DefaultCommandCoreEventBridge implements CommandCoreEventBridge {
  constructor(private readonly isEligible: CommandCoreEventEligibility) {}

  convert(envelope: CommandCoreEventEnvelope): CommandCoreBridgeResult {
    if (!this.isEligible(envelope)) {
      return { outcome: "skipped", reason: "ineligible", envelope };
    }

    if (!envelope.id) {
      return { outcome: "skipped", reason: "missing_event_id", envelope };
    }

    const event: GlassmindIngestionEvent = {
      id: envelope.id,
      type: envelope.type,
      timestamp: envelope.timestamp,
      scope: envelope.scope,
      conversationId: envelope.reference?.conversationId,
      recommendationId: envelope.reference?.recommendationId,
      messageId: envelope.reference?.messageId,
      // envelope.payload is deliberately never read or copied here.
    };

    return { outcome: "converted", event };
  }
}
