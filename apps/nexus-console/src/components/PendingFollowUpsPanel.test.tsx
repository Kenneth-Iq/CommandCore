import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { PendingFollowUpsPanel } from "./PendingFollowUpsPanel";
import type { FollowUpItem } from "../executiveAssistant";
import { buildMockWorld, createMockOnNavigate, renderWithDefaults } from "../test/testUtils";

const followUps: FollowUpItem[] = [
  { id: "f1", kind: "question", text: "Should I reassign this mission?" },
];

describe("PendingFollowUpsPanel", () => {
  it("renders each follow-up's text", () => {
    renderWithDefaults(<PendingFollowUpsPanel followUps={followUps} world={buildMockWorld()} onNavigate={createMockOnNavigate()} />);
    expect(screen.getByText("Should I reassign this mission?")).toBeInTheDocument();
  });

  it("toggles a follow-up to resolved when Mark Resolved is clicked", () => {
    renderWithDefaults(<PendingFollowUpsPanel followUps={followUps} world={buildMockWorld()} onNavigate={createMockOnNavigate()} />);
    fireEvent.click(screen.getByText("Mark Resolved"));
    expect(screen.getByText("Reopen")).toBeInTheDocument();
  });

  it("shows an all-caught-up empty state when there are no follow-ups", () => {
    renderWithDefaults(<PendingFollowUpsPanel followUps={[]} world={buildMockWorld()} onNavigate={createMockOnNavigate()} />);
    expect(screen.getByText("All Caught Up")).toBeInTheDocument();
  });
});
