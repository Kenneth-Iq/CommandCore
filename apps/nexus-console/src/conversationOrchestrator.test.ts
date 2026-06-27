import { describe, expect, it } from "vitest";
import {
  buildApprovalPlaceholder,
  classifyBadge,
  classifyIntent,
  processConversationTurn,
} from "./conversationOrchestrator";
import { buildMockSimulation, buildMockWorld } from "./test/testUtils";

describe("classifyIntent", () => {
  it("classifies a mission-related message", () => {
    const intent = classifyIntent("How are my missions going?");
    expect(intent.kind).toBe("mission");
    expect(intent.confidence).toBeGreaterThan(0);
  });

  it("classifies an unknown message when no keywords match", () => {
    const intent = classifyIntent("What's the weather like?");
    expect(intent.kind).toBe("unknown");
  });

  it("flags messages implying an action", () => {
    const intent = classifyIntent("Please reassign this mission to another agent");
    expect(intent.impliesAction).toBe(true);
  });

  it("does not flag a purely informational question as implying an action", () => {
    const intent = classifyIntent("How are my agents doing?");
    expect(intent.impliesAction).toBe(false);
  });
});

describe("buildApprovalPlaceholder", () => {
  it("requires approval when the intent implies an action", () => {
    const intent = classifyIntent("restart this tool");
    const approval = buildApprovalPlaceholder(intent);
    expect(approval.status).toBe("would_require_approval");
  });

  it("does not require approval for a read-only question", () => {
    const intent = classifyIntent("how are my tools doing?");
    const approval = buildApprovalPlaceholder(intent);
    expect(approval.status).toBe("not_required");
  });
});

describe("processConversationTurn", () => {
  it("produces a suggested response and approval placeholder for a mission question", () => {
    const world = buildMockWorld();
    const simulation = buildMockSimulation();
    const turn = processConversationTurn("How are my missions going?", world, simulation);

    expect(turn.intent.kind).toBe("mission");
    expect(turn.suggestedResponse.length).toBeGreaterThan(0);
    expect(turn.approval.status).toBe("not_required");
  });

  it("falls back to the default response when nothing matches", () => {
    const world = buildMockWorld();
    const simulation = buildMockSimulation();
    const turn = processConversationTurn("xyz totally unrelated", world, simulation);

    expect(turn.intent.kind).toBe("unknown");
    expect(turn.suggestedResponse).toContain("simulated");
  });
});

describe("classifyBadge", () => {
  it("classifies an action-implying turn as requiring approval", () => {
    const world = buildMockWorld();
    const simulation = buildMockSimulation();
    const turn = processConversationTurn("please restart this tool", world, simulation);
    expect(classifyBadge(turn)).toBe("approval");
  });

  it("classifies an unknown-intent turn as information", () => {
    const world = buildMockWorld();
    const simulation = buildMockSimulation();
    const turn = processConversationTurn("xyz totally unrelated", world, simulation);
    expect(classifyBadge(turn)).toBe("information");
  });
});
