import { describe, expect, it } from "vitest";
import { buildHermesActionPreviews, buildHermesQueues } from "./hermesBridge";
import { buildMockSimulation, buildMockWorld } from "./test/testUtils";

describe("buildHermesActionPreviews", () => {
  it("produces one preview per registered tool", () => {
    const world = buildMockWorld();
    const simulation = buildMockSimulation();
    const previews = buildHermesActionPreviews(world, simulation);
    expect(previews).toHaveLength(world.toolCentre.tools.length);
  });

  it("flags a policy warning when a tool reports degraded health", () => {
    const world = buildMockWorld();
    const firstTool = world.toolCentre.tools[0];
    const simulation = buildMockSimulation({
      tools: { [firstTool.toolId]: { toolId: firstTool.toolId, health: "degraded", lastExecutionDurationMs: 100, availability: "available" } },
    });
    const previews = buildHermesActionPreviews(world, simulation);
    const preview = previews.find((item) => item.toolId === firstTool.toolId);
    expect(preview?.policyWarning).toBeDefined();
  });

  it("does not flag a policy warning for a healthy, non-privileged tool", () => {
    const world = buildMockWorld();
    const firstTool = world.toolCentre.tools[0];
    const simulation = buildMockSimulation({
      tools: { [firstTool.toolId]: { toolId: firstTool.toolId, health: "healthy", lastExecutionDurationMs: 100, availability: "available" } },
    });
    const previews = buildHermesActionPreviews(world, simulation);
    const preview = previews.find((item) => item.toolId === firstTool.toolId);
    if (firstTool.permissionLevel.toLowerCase() !== "privileged" && firstTool.permissionLevel.toLowerCase() !== "restricted") {
      expect(preview?.policyWarning).toBeUndefined();
    }
  });
});

describe("buildHermesQueues", () => {
  it("splits hermes actions into execution and policy queues based on policy warnings", () => {
    const world = buildMockWorld();
    const simulation = buildMockSimulation();
    const actions = buildHermesActionPreviews(world, simulation);
    const queues = buildHermesQueues(world, actions, []);

    const totalToolDerived = queues.execution.length + queues.policy.length;
    expect(totalToolDerived).toBe(actions.length);
    expect(queues.tool).toHaveLength(actions.length);
  });

  it("maps active missions into the mission queue", () => {
    const world = buildMockWorld();
    const queues = buildHermesQueues(world, [], []);
    expect(queues.mission).toHaveLength(world.missionCentre.active.length);
  });

  it("maps approval cards directly into the approval queue", () => {
    const world = buildMockWorld();
    const queues = buildHermesQueues(world, [], [
      { id: "a1", title: "Test approval", detail: "detail", status: "awaiting", requestedAt: "now", evidence: { label: "x", page: "missions" } },
    ]);
    expect(queues.approval).toHaveLength(1);
    expect(queues.approval[0].status).toBe("awaiting");
  });
});
