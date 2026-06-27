import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { BriefingTypeExplorer } from "./BriefingTypeExplorer";
import type { ExtendedBriefing } from "../executiveAssistant";
import { createMockOnNavigate, renderWithDefaults } from "../test/testUtils";

const briefings: ExtendedBriefing[] = [
  { type: "morning", title: "Morning Briefing", summary: "Morning summary.", highlights: ["highlight one"] },
  { type: "weekly", title: "Weekly Briefing", summary: "Weekly summary.", highlights: ["highlight two"] },
];

describe("BriefingTypeExplorer", () => {
  it("shows the first briefing's detail by default", () => {
    renderWithDefaults(<BriefingTypeExplorer briefings={briefings} onNavigate={createMockOnNavigate()} />);
    expect(screen.getByText("Morning summary.")).toBeInTheDocument();
  });

  it("switches detail when a different tab is selected", () => {
    renderWithDefaults(<BriefingTypeExplorer briefings={briefings} onNavigate={createMockOnNavigate()} />);
    fireEvent.click(screen.getByText("Weekly"));
    expect(screen.getByText("Weekly summary.")).toBeInTheDocument();
  });
});
