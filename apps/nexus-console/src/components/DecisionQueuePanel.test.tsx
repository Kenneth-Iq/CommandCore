import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { DecisionQueuePanel } from "./DecisionQueuePanel";
import type { DecisionItem } from "../executiveAssistant";
import { buildMockWorld, createMockOnNavigate, renderWithDefaults } from "../test/testUtils";

const decisions: DecisionItem[] = [
  { id: "d1", title: "Review blocked mission", detail: "detail", status: "waiting", occurredAt: "4m ago" },
  { id: "d2", title: "Approved outcome", detail: "detail", status: "completed", occurredAt: "10m ago" },
];

describe("DecisionQueuePanel", () => {
  it("places each decision under its status column", () => {
    renderWithDefaults(<DecisionQueuePanel decisions={decisions} world={buildMockWorld()} onNavigate={createMockOnNavigate()} />);
    expect(screen.getByText("Review blocked mission")).toBeInTheDocument();
    expect(screen.getByText("Approved outcome")).toBeInTheDocument();
  });

  it("shows a placeholder for a column with no matching decisions", () => {
    renderWithDefaults(<DecisionQueuePanel decisions={[]} world={buildMockWorld()} onNavigate={createMockOnNavigate()} />);
    expect(screen.getAllByText("Nothing here right now.").length).toBe(4);
  });
});
