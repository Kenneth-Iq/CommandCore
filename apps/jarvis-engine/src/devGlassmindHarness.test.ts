import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DevFakeGlassmindStore,
  buildHarnessWithEmptyMemory,
  buildHarnessWithMemory,
  buildHarnessWithoutMemoryStore,
} from "./devGlassmindHarness.js";
import type { GlassmindLikeMemoryRecord } from "./glassmindReadAdapter.js";
import type { JarvisConversationInput } from "./types.js";

function buildInput(overrides: Partial<JarvisConversationInput> = {}): JarvisConversationInput {
  return {
    message: "How are my missions going?",
    context: { scope: { entityKind: "mission", entityId: "m-1" } },
    ...overrides,
  };
}

describe("DevGlassmindHarness — no memory store configured", () => {
  it("reports not_queried, with no evidence", () => {
    const engine = buildHarnessWithoutMemoryStore();

    const response = engine.processTurn(buildInput());

    expect(response.memoryRetrieval).toEqual({ status: "not_queried" });
    expect(response.evidence).toEqual([]);
  });
});

describe("DevGlassmindHarness — no memory found", () => {
  it("reports no_memory_found when the store has no records, honestly, not as an error", () => {
    const engine = buildHarnessWithEmptyMemory();

    expect(() => engine.processTurn(buildInput())).not.toThrow();
    const response = engine.processTurn(buildInput());

    expect(response.memoryRetrieval).toEqual({ status: "no_memory_found" });
    expect(response.evidence).toEqual([]);
  });
});

describe("DevGlassmindHarness — memory found with evidence", () => {
  it("reports found with the expected record count and surfaces the record's evidence", () => {
    const records: GlassmindLikeMemoryRecord[] = [
      {
        id: "turn-1",
        kind: "conversation_turn",
        responseSummary: "There are 3 missions in view, 1 blocked.",
        evidence: { label: "Open Mission", page: "missions" },
      },
    ];
    const engine = buildHarnessWithMemory(records);

    const response = engine.processTurn(buildInput());

    expect(response.memoryRetrieval).toEqual({ status: "found", recordCount: 1 });
    expect(response.evidence).toEqual([{ label: "Open Mission", page: "missions", selection: undefined }]);
  });
});

describe("DevGlassmindHarness — memory without evidence does not fabricate evidence", () => {
  it("reports found but does not invent an evidence item for a record that carried none", () => {
    const records: GlassmindLikeMemoryRecord[] = [
      {
        id: "decision-1",
        kind: "deferred_decision",
        title: "Review blocked mission",
        detail: "Awaiting a decision on how to unblock it.",
        // No `evidence` field at all.
      },
    ];
    const engine = buildHarnessWithMemory(records);

    const response = engine.processTurn(buildInput());

    expect(response.memoryRetrieval).toEqual({ status: "found", recordCount: 1 });
    expect(response.evidence).toEqual([]);
  });
});

describe("DevFakeGlassmindStore — read-only surface", () => {
  it("exposes only the two GlassmindLikeStore read methods — no insert/update/write method of any kind", () => {
    const prototypeMethods = Object.getOwnPropertyNames(DevFakeGlassmindStore.prototype).filter(
      (name) => name !== "constructor",
    );

    expect(prototypeMethods.sort()).toEqual(["retrieveByScope", "retrieveBySourceReference"]);
  });
});

describe("devGlassmindHarness.ts — no Nexus import", () => {
  it("has no import statement referencing nexus-console or any nexus package", () => {
    const sourcePath = fileURLToPath(new URL("./devGlassmindHarness.ts", import.meta.url));
    const source = readFileSync(sourcePath, "utf-8");
    const importLines = source.split("\n").filter((line) => /^\s*import\b/.test(line));

    for (const line of importLines) {
      expect(line.toLowerCase()).not.toContain("nexus");
    }
  });
});
