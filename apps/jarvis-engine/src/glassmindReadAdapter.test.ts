import { describe, expect, it } from "vitest";
import { DeterministicJarvisConversationEngine } from "./engine.js";
import { GlassmindReadOnlyMemoryAdapter, type GlassmindLikeMemoryRecord, type GlassmindLikeStore } from "./glassmindReadAdapter.js";

class FakeGlassmindStore implements GlassmindLikeStore {
  public bySourceReferenceCalls = 0;
  public byScopeCalls = 0;

  constructor(private readonly records: GlassmindLikeMemoryRecord[]) {}

  retrieveBySourceReference(): GlassmindLikeMemoryRecord[] {
    this.bySourceReferenceCalls += 1;
    return [...this.records];
  }

  retrieveByScope(): GlassmindLikeMemoryRecord[] {
    this.byScopeCalls += 1;
    return [...this.records];
  }
}

describe("GlassmindReadOnlyMemoryAdapter — reads memory from a Glassmind-like store", () => {
  it("returns JarvisMemoryRecords derived from the Glassmind-like store's records", () => {
    const fakeStore = new FakeGlassmindStore([
      { id: "r1", kind: "follow_up", text: "Mission was blocked last week." },
    ]);
    const adapter = new GlassmindReadOnlyMemoryAdapter(fakeStore);

    const results = adapter.retrieve({ scope: { entityKind: "mission", entityId: "m-1" } });

    expect(results).toEqual([{ summary: "Mission was blocked last week.", evidence: undefined }]);
    expect(fakeStore.byScopeCalls).toBe(1);
  });

  it("the engine surfaces memory retrieved through the adapter end to end", () => {
    const fakeStore = new FakeGlassmindStore([{ id: "r1", kind: "follow_up", text: "Discussed before." }]);
    const adapter = new GlassmindReadOnlyMemoryAdapter(fakeStore);
    const engine = new DeterministicJarvisConversationEngine(adapter);

    const response = engine.processTurn({ message: "How are my missions going?", context: { scope: { entityKind: "mission", entityId: "m-1" } } });

    expect(response.memoryRetrieval).toEqual({ status: "found", recordCount: 1 });
  });
});

describe("GlassmindReadOnlyMemoryAdapter — empty retrieval becomes no_memory_found", () => {
  it("an empty Glassmind-like store produces a no_memory_found status through the engine", () => {
    const fakeStore = new FakeGlassmindStore([]);
    const adapter = new GlassmindReadOnlyMemoryAdapter(fakeStore);
    const engine = new DeterministicJarvisConversationEngine(adapter);

    const response = engine.processTurn({ message: "How are my missions going?", context: { scope: { entityKind: "mission", entityId: "m-1" } } });

    expect(response.memoryRetrieval).toEqual({ status: "no_memory_found" });
    expect(response.answerText).toContain("I don't have any memory of this");
  });

  it("the adapter itself returns [] rather than throwing when the store has nothing", () => {
    const fakeStore = new FakeGlassmindStore([]);
    const adapter = new GlassmindReadOnlyMemoryAdapter(fakeStore);

    expect(() => adapter.retrieve({ scope: { entityKind: "mission", entityId: "m-1" } })).not.toThrow();
    expect(adapter.retrieve({ scope: { entityKind: "mission", entityId: "m-1" } })).toEqual([]);
  });
});

describe("GlassmindReadOnlyMemoryAdapter — evidence preservation", () => {
  it("preserves evidence carried by a Glassmind-like record", () => {
    const evidence = { label: "Open Mission", page: "missions", selection: { missionId: "m-1" } };
    const fakeStore = new FakeGlassmindStore([{ id: "r1", kind: "follow_up", text: "Mission blocked.", evidence }]);
    const adapter = new GlassmindReadOnlyMemoryAdapter(fakeStore);

    const results = adapter.retrieve({ scope: { entityKind: "mission", entityId: "m-1" } });

    expect(results[0].evidence).toEqual(evidence);
  });

  it("preserves the first evidence item when a record carries an array of evidence", () => {
    const evidence = [
      { label: "Open Mission", page: "missions", selection: { missionId: "m-1" } },
      { label: "Open Agent", page: "agents", selection: { agentId: "a-1" } },
    ];
    const fakeStore = new FakeGlassmindStore([{ id: "r1", kind: "conversation_turn", responseSummary: "Discussed mission and agent.", evidence }]);
    const adapter = new GlassmindReadOnlyMemoryAdapter(fakeStore);

    const results = adapter.retrieve({ scope: { entityKind: "mission", entityId: "m-1" } });

    expect(results[0].evidence).toEqual(evidence[0]);
  });

  it("end to end: evidence retrieved through the adapter is preserved in the engine's response", () => {
    const evidence = { label: "Open Mission", page: "missions", selection: { missionId: "m-1" } };
    const fakeStore = new FakeGlassmindStore([{ id: "r1", kind: "follow_up", text: "Mission blocked.", evidence }]);
    const adapter = new GlassmindReadOnlyMemoryAdapter(fakeStore);
    const engine = new DeterministicJarvisConversationEngine(adapter);

    const response = engine.processTurn({ message: "How are my missions going?", context: { scope: { entityKind: "mission", entityId: "m-1" } } });

    expect(response.evidence).toEqual([evidence]);
  });
});

describe("GlassmindReadOnlyMemoryAdapter — no write capability", () => {
  it("has no write method on its interface or its class instance", () => {
    const fakeStore = new FakeGlassmindStore([]);
    const adapter = new GlassmindReadOnlyMemoryAdapter(fakeStore);

    const ownMethodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(adapter));
    expect(ownMethodNames).toEqual(expect.arrayContaining(["constructor", "retrieve"]));
    expect(ownMethodNames).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^(write|insert|update|delete|record|resolve|save)/i)]),
    );
  });

  it("never calls anything beyond the store's two read methods, even across repeated turns", () => {
    const fakeStore = new FakeGlassmindStore([{ id: "r1", kind: "follow_up", text: "Existing memory" }]);
    const adapter = new GlassmindReadOnlyMemoryAdapter(fakeStore);
    const engine = new DeterministicJarvisConversationEngine(adapter);

    engine.processTurn({ message: "How are my missions going?", context: { scope: { entityKind: "mission", entityId: "m-1" } } });
    engine.processTurn({ message: "How are my missions going?", context: { scope: { entityKind: "mission", entityId: "m-1" } } });

    expect(fakeStore.byScopeCalls).toBe(2);
  });
});

describe("GlassmindReadOnlyMemoryAdapter — no invented evidence", () => {
  it("does not invent evidence for a memory record that carries none", () => {
    const fakeStore = new FakeGlassmindStore([{ id: "r1", kind: "follow_up", text: "Something was discussed, no evidence attached." }]);
    const adapter = new GlassmindReadOnlyMemoryAdapter(fakeStore);

    const results = adapter.retrieve({ scope: { entityKind: "mission", entityId: "m-1" } });

    expect(results[0].evidence).toBeUndefined();
  });

  it("end to end: the engine surfaces no evidence when the underlying record has none", () => {
    const fakeStore = new FakeGlassmindStore([{ id: "r1", kind: "follow_up", text: "No evidence here." }]);
    const adapter = new GlassmindReadOnlyMemoryAdapter(fakeStore);
    const engine = new DeterministicJarvisConversationEngine(adapter);

    const response = engine.processTurn({ message: "How are my missions going?", context: { scope: { entityKind: "mission", entityId: "m-1" } } });

    expect(response.evidence).toEqual([]);
  });
});
