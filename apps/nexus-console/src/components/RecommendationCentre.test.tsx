import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { RecommendationCentre } from "./RecommendationCentre";
import type { RecommendationCard } from "../executiveAssistant";
import { buildMockWorld, createMockOnNavigate, renderWithDefaults } from "../test/testUtils";

const recommendation: RecommendationCard = {
  id: "risk-mission-m1",
  kind: "risk",
  title: "Mission risk: Test Mission",
  detail: "This mission is blocked.",
  reason: "It stopped advancing.",
  businessImpact: "Downstream work will slip.",
  suggestedNextStep: "Reassign the mission.",
  confidence: 75,
  affectedSystems: ["Mission Centre"],
  evidence: { label: "Open Mission", page: "missions" },
};

describe("RecommendationCentre", () => {
  it("renders the recommendation title, reason, and next step", () => {
    renderWithDefaults(<RecommendationCentre recommendations={[recommendation]} world={buildMockWorld()} onNavigate={createMockOnNavigate()} />);
    expect(screen.getByText(recommendation.title)).toBeInTheDocument();
    expect(screen.getByText(recommendation.reason)).toBeInTheDocument();
    expect(screen.getByText(recommendation.suggestedNextStep)).toBeInTheDocument();
  });

  it("renders the confidence percentage", () => {
    renderWithDefaults(<RecommendationCentre recommendations={[recommendation]} world={buildMockWorld()} onNavigate={createMockOnNavigate()} />);
    expect(screen.getByText("75% confidence")).toBeInTheDocument();
  });

  it("shows an empty state when there are no recommendations", () => {
    renderWithDefaults(<RecommendationCentre recommendations={[]} world={buildMockWorld()} onNavigate={createMockOnNavigate()} />);
    expect(screen.getByText("No Recommendations Yet")).toBeInTheDocument();
  });
});
