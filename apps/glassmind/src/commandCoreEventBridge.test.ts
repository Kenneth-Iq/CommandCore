import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DefaultCommandCoreEventBridge, type CommandCoreEventEnvelope } from "./commandCoreEventBridge.js";

const ELIGIBLE_EVENT_TYPES = new Set(["MissionBlocked", "MissionEscalated"]);

function isEligible(envelope: CommandCoreEventEnvelope): boolean {
  return ELIGIBLE_EVENT_TYPES.has(envelope.type);
}

function buildEnvelope(overrides: Partial<CommandCoreEventEnvelope> = {}): CommandCoreEventEnvelope {
  return {
    id: "evt-1",
    type: "MissionBlocked",
    timestamp: "2026-06-30T00:00:00.000Z",
    scope: { entityKind: "mission", entityId: "m-1" },
    reference: { conversationId: "conv-1" },
    payload: { missionId: "m-1", reason: "agent offline", internalDebugInfo: { stack: "very long stack trace" } },
    ...overrides,
  };
}

describe("DefaultCommandCoreEventBridge — valid envelopes", () => {
  it("converts a valid, eligible envelope into a GlassmindIngestionEvent", () => {
    const bridge = new DefaultCommandCoreEventBridge(isEligible);

    const result = bridge.convert(buildEnvelope());

    expect(result.outcome).toBe("converted");
    if (result.outcome === "converted") {
      expect(result.event).toEqual({
        id: "evt-1",
        type: "MissionBlocked",
        timestamp: "2026-06-30T00:00:00.000Z",
        scope: { entityKind: "mission", entityId: "m-1" },
        conversationId: "conv-1",
        recommendationId: undefined,
        messageId: undefined,
      });
    }
  });
});

describe("DefaultCommandCoreEventBridge — missing event id", () => {
  it("skips an envelope with no event id, safely (no throw)", () => {
    const bridge = new DefaultCommandCoreEventBridge(isEligible);
    const envelope = buildEnvelope({ id: "" });

    let result;
    expect(() => {
      result = bridge.convert(envelope);
    }).not.toThrow();

    expect(result).toMatchObject({ outcome: "skipped", reason: "missing_event_id" });
  });
});

describe("DefaultCommandCoreEventBridge — ineligible envelopes", () => {
  it("skips an envelope whose type is not eligible", () => {
    const bridge = new DefaultCommandCoreEventBridge(isEligible);

    const result = bridge.convert(buildEnvelope({ type: "MissionCompleted" }));

    expect(result).toMatchObject({ outcome: "skipped", reason: "ineligible" });
  });
});

describe("DefaultCommandCoreEventBridge — never copies raw payloads", () => {
  it("does not copy envelope.payload into the converted ingestion event", () => {
    const bridge = new DefaultCommandCoreEventBridge(isEligible);

    const result = bridge.convert(buildEnvelope());

    expect(result.outcome).toBe("converted");
    if (result.outcome === "converted") {
      expect(JSON.stringify(result.event)).not.toContain("internalDebugInfo");
      expect(JSON.stringify(result.event)).not.toContain("very long stack trace");
      expect(result.event).not.toHaveProperty("payload");
    }
  });
});

describe("commandCoreEventBridge.ts — no CommandCore import", () => {
  it("does not import from core/ or any CommandCore Python package path", () => {
    const sourcePath = fileURLToPath(new URL("./commandCoreEventBridge.ts", import.meta.url));
    const source = readFileSync(sourcePath, "utf-8");

    expect(source).not.toMatch(/from\s+["'].*\/core\//);
    expect(source).not.toContain("commandcore");
    expect(source).not.toContain("jarvis_core");
  });
});
