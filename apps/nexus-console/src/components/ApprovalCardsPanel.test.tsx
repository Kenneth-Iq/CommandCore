import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { ApprovalCardsPanel } from "./ApprovalCardsPanel";
import type { ApprovalCard } from "../executiveAssistant";
import { buildMockWorld, createMockOnNavigate, renderWithDefaults } from "../test/testUtils";

const approvals: ApprovalCard[] = [
  { id: "a1", title: "Reassign mission", detail: "detail", status: "awaiting", requestedAt: "4m ago", evidence: { label: "Open Mission", page: "missions" } },
  { id: "a2", title: "Accept outcome", detail: "detail", status: "approved", requestedAt: "10m ago" },
];

describe("ApprovalCardsPanel", () => {
  it("renders an item under its matching status column", () => {
    renderWithDefaults(<ApprovalCardsPanel approvals={approvals} world={buildMockWorld()} onNavigate={createMockOnNavigate()} />);
    expect(screen.getByText("Reassign mission")).toBeInTheDocument();
    expect(screen.getByText("Accept outcome")).toBeInTheDocument();
  });

  it("shows the execution-disabled framing in the panel header", () => {
    renderWithDefaults(<ApprovalCardsPanel approvals={[]} world={buildMockWorld()} onNavigate={createMockOnNavigate()} />);
    expect(screen.getByText(/no commands have been issued/i)).toBeInTheDocument();
  });

  it("renders a 'nothing here' placeholder for empty columns", () => {
    renderWithDefaults(<ApprovalCardsPanel approvals={[]} world={buildMockWorld()} onNavigate={createMockOnNavigate()} />);
    expect(screen.getAllByText("Nothing here right now.").length).toBeGreaterThan(0);
  });
});
