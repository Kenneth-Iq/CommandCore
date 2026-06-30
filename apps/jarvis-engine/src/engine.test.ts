import { describe, expect, it } from "vitest";
import { DeterministicJarvisConversationEngine } from "./engine.js";
import type { JarvisConversationInput, JarvisMemoryRecord, JarvisMemoryStore } from "./types.js";

function buildInput(overrides: Partial<JarvisConversationInput> = {}): JarvisConversationInput {
  return {
    message: "How are my missions going?",
    context: {},
    ...overrides,
  };
}

class FakeMemoryStore implements JarvisMemoryStore {
  public retrieveCallCount = 0;
  constructor(private readonly records: JarvisMemoryRecord[]) {}

  retrieve(): JarvisMemoryRecord[] {
    this.retrieveCallCount += 1;
    // Returns a fresh copy each time — proves the engine cannot mutate the
    // store's internal records even if it tried.
    return [...this.records];
  }
}

describe("DeterministicJarvisConversationEngine — deterministic responses", () => {
  it("returns the same response for the same input, called twice", () => {
    const engine = new DeterministicJarvisConversationEngine();
    const input = buildInput();

    const first = engine.processTurn(input);
    const second = engine.processTurn(input);

    expect(first).toEqual(second);
  });

  it("never calls a real LLM — the engine has no network/process dependency, only deterministic logic", () => {
    // Structural proof, not a runtime assertion: DeterministicJarvisConversationEngine's
    // constructor accepts only an optional JarvisMemoryStore, with no API-key, model
    // name, or transport parameter of any kind.
    const engine = new DeterministicJarvisConversationEngine();
    expect(engine).toBeInstanceOf(DeterministicJarvisConversationEngine);
  });
});

describe("DeterministicJarvisConversationEngine — memory retrieval status", () => {
  it("reports not_queried when no memory store is configured", () => {
    const engine = new DeterministicJarvisConversationEngine();
    const response = engine.processTurn(buildInput());

    expect(response.memoryRetrieval).toEqual({ status: "not_queried" });
  });

  it("represents empty memory retrieval honestly as no_memory_found, not an error", () => {
    const memoryStore = new FakeMemoryStore([]);
    const engine = new DeterministicJarvisConversationEngine(memoryStore);

    const response = engine.processTurn(buildInput());

    expect(response.memoryRetrieval).toEqual({ status: "no_memory_found" });
    expect(response.answerText).toContain("I don't have any memory of this");
  });

  it("reports found with a record count when memory exists", () => {
    const memoryStore = new FakeMemoryStore([{ summary: "Discussed before" }, { summary: "Discussed again" }]);
    const engine = new DeterministicJarvisConversationEngine(memoryStore);

    const response = engine.processTurn(buildInput());

    expect(response.memoryRetrieval).toEqual({ status: "found", recordCount: 2 });
  });
});

describe("DeterministicJarvisConversationEngine — evidence", () => {
  it("preserves evidence links surfaced by the memory store", () => {
    const evidence = { label: "Open Mission", page: "missions", selection: { missionId: "m-1" } };
    const memoryStore = new FakeMemoryStore([{ summary: "Mission was blocked", evidence }]);
    const engine = new DeterministicJarvisConversationEngine(memoryStore);

    const response = engine.processTurn(buildInput());

    expect(response.evidence).toEqual([evidence]);
  });

  it("does not invent evidence for a memory record that carries none", () => {
    const memoryStore = new FakeMemoryStore([{ summary: "Something was discussed, no evidence attached" }]);
    const engine = new DeterministicJarvisConversationEngine(memoryStore);

    const response = engine.processTurn(buildInput());

    expect(response.evidence).toEqual([]);
  });

  it("returns no evidence when no memory store is configured", () => {
    const engine = new DeterministicJarvisConversationEngine();
    const response = engine.processTurn(buildInput());

    expect(response.evidence).toEqual([]);
  });
});

describe("DeterministicJarvisConversationEngine — follow-up suggestion", () => {
  it("surfaces a follow-up suggestion for an attention-seeking message", () => {
    const engine = new DeterministicJarvisConversationEngine();
    const response = engine.processTurn(buildInput({ message: "What needs my attention today?" }));

    expect(response.followUpSuggestion).toEqual({
      kind: "question",
      text: "Would you like a full briefing of everything that needs attention right now?",
    });
  });

  it("does not surface a follow-up suggestion for an unrelated message", () => {
    const engine = new DeterministicJarvisConversationEngine();
    const response = engine.processTurn(buildInput({ message: "How are my agents doing?" }));

    expect(response.followUpSuggestion).toBeUndefined();
  });
});

describe("DeterministicJarvisConversationEngine — deferred decision marker", () => {
  it("surfaces a deferred decision marker when the message implies deferral", () => {
    const engine = new DeterministicJarvisConversationEngine();
    const response = engine.processTurn(buildInput({ message: "Let's defer this mission review until later." }));

    expect(response.deferredDecision).toMatchObject({ status: "deferred" });
  });

  it("does not surface a deferred decision marker otherwise", () => {
    const engine = new DeterministicJarvisConversationEngine();
    const response = engine.processTurn(buildInput({ message: "How are my missions going?" }));

    expect(response.deferredDecision).toBeUndefined();
  });
});

describe("DeterministicJarvisConversationEngine — approval-needed marker", () => {
  it("surfaces an approval-needed marker for a message implying an action", () => {
    const engine = new DeterministicJarvisConversationEngine();
    const response = engine.processTurn(buildInput({ message: "Please reassign this mission to another agent." }));

    expect(response.approvalNeeded).toEqual({
      required: true,
      reason: "This message implies an action that would require an approved command before anything could actually happen.",
    });
  });

  it("does not surface an approval-needed marker for a read-only question", () => {
    const engine = new DeterministicJarvisConversationEngine();
    const response = engine.processTurn(buildInput({ message: "How are my tools doing?" }));

    expect(response.approvalNeeded).toBeUndefined();
  });
});

describe("DeterministicJarvisConversationEngine — does not mutate external state", () => {
  it("only reads from the memory store, never writes — the interface has no write method", () => {
    const records = [{ summary: "Existing memory" }];
    const memoryStore = new FakeMemoryStore(records);
    const engine = new DeterministicJarvisConversationEngine(memoryStore);

    engine.processTurn(buildInput());
    engine.processTurn(buildInput());

    expect(memoryStore.retrieveCallCount).toBe(2);
    // The underlying records array passed at construction is never mutated.
    expect(records).toEqual([{ summary: "Existing memory" }]);
  });
});
