import { describe, expect, it } from "vitest";
import {
  buildEvidenceRegistry,
  evidenceForSelection,
  evidenceTargetKey,
  resolveEvidenceHealth,
  sourceKindLabel,
} from "./evidenceRegistry";
import type { ApprovalCard, DecisionItem, FollowUpItem, RecommendationCard } from "./executiveAssistant";
import { buildMockSimulation } from "./test/testUtils";

const recommendation: RecommendationCard = {
  id: "risk-mission-m1",
  kind: "risk",
  title: "Mission risk: Test Mission",
  detail: "blocked",
  reason: "blocked reason",
  businessImpact: "impact",
  suggestedNextStep: "next step",
  confidence: 80,
  affectedSystems: ["Mission Centre"],
  evidence: { label: "Open Mission", page: "missions", selection: { missionId: "m1" } },
};

const decision: DecisionItem = {
  id: "decision-1",
  title: "Review blocked mission",
  detail: "detail",
  status: "waiting",
  occurredAt: "4m ago",
  evidence: { label: "Open Mission", page: "missions", selection: { missionId: "m1" } },
};

const followUp: FollowUpItem = {
  id: "followup-1",
  kind: "question",
  text: "Should I reassign?",
  evidence: { label: "Open Mission", page: "missions", selection: { missionId: "m2" } },
};

const approval: ApprovalCard = {
  id: "approval-1",
  title: "Reassign mission",
  detail: "detail",
  status: "awaiting",
  requestedAt: "4m ago",
  evidence: { label: "Open Mission", page: "missions", selection: { missionId: "m1" } },
};

describe("evidenceTargetKey", () => {
  it("builds a stable key from a mission selection", () => {
    expect(evidenceTargetKey({ label: "x", page: "missions", selection: { missionId: "m1" } })).toBe("mission:m1");
  });

  it("returns undefined when there is no selection", () => {
    expect(evidenceTargetKey({ label: "x", page: "kernel" })).toBeUndefined();
  });
});

describe("buildEvidenceRegistry", () => {
  it("includes one registry item per recommendation, decision, follow-up, and approval", () => {
    const registry = buildEvidenceRegistry([recommendation], [decision], [followUp], [approval]);
    expect(registry).toHaveLength(4);
    expect(registry.map((item) => item.sourceKind)).toEqual(
      expect.arrayContaining(["recommendation", "decision", "followup", "approval"]),
    );
  });
});

describe("evidenceForSelection", () => {
  it("returns only registry items whose evidence targets the given selection", () => {
    const registry = buildEvidenceRegistry([recommendation], [decision], [followUp], [approval]);
    const matches = evidenceForSelection(registry, { missionId: "m1" });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((item) => item.evidence.selection?.missionId === "m1")).toBe(true);
  });

  it("returns an empty array for a selection with no matching evidence", () => {
    const registry = buildEvidenceRegistry([recommendation], [decision], [followUp], [approval]);
    expect(evidenceForSelection(registry, { missionId: "does-not-exist" })).toHaveLength(0);
  });
});

describe("resolveEvidenceHealth", () => {
  it("reports blocked health for a blocked mission", () => {
    const simulation = buildMockSimulation({ missions: { m1: { missionId: "m1", progressPercent: 10, etaMinutes: 5, isBlocked: true, isOverdue: false } } });
    const health = resolveEvidenceHealth({ label: "x", page: "missions", selection: { missionId: "m1" } }, simulation);
    expect(health).toBe("blocked");
  });

  it("reports stable health when there is no selection", () => {
    const simulation = buildMockSimulation();
    expect(resolveEvidenceHealth({ label: "x", page: "kernel" }, simulation)).toBe("stable");
  });
});

describe("sourceKindLabel", () => {
  it("returns a human-readable label for each source kind", () => {
    expect(sourceKindLabel("recommendation")).toBe("Recommendation Centre");
    expect(sourceKindLabel("approval")).toBe("Approval Cards");
  });
});
