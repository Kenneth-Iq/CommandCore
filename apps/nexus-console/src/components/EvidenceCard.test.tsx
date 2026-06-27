import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { EvidenceCard } from "./EvidenceCard";
import { buildMockWorld, createMockOnNavigate, renderWithDefaults } from "../test/testUtils";

describe("EvidenceCard", () => {
  it("renders the evidence link button", () => {
    const world = buildMockWorld();
    const onNavigate = createMockOnNavigate();
    renderWithDefaults(<EvidenceCard evidence={{ label: "Open Mission", page: "missions" }} world={world} onNavigate={onNavigate} />);
    expect(screen.getByText(/Open Nexus: Open Mission/)).toBeInTheDocument();
  });

  it("calls onNavigate with the evidence page and selection when clicked", () => {
    const world = buildMockWorld();
    const onNavigate = createMockOnNavigate();
    const missionId = world.missionCentre.active[0]?.missionId;
    renderWithDefaults(
      <EvidenceCard evidence={{ label: "Open Mission", page: "missions", selection: { missionId } }} world={world} onNavigate={onNavigate} />,
    );
    fireEvent.click(screen.getByText(/Open Nexus: Open Mission/));
    expect(onNavigate).toHaveBeenCalledWith("missions", { missionId });
  });

  it("expands evidence detail when a resolvable entity exists", () => {
    const world = buildMockWorld();
    const onNavigate = createMockOnNavigate();
    const mission = world.missionCentre.active[0];
    renderWithDefaults(
      <EvidenceCard evidence={{ label: "Open Mission", page: "missions", selection: { missionId: mission.missionId } }} world={world} onNavigate={onNavigate} />,
    );
    fireEvent.click(screen.getByText("Show Evidence"));
    expect(screen.getByText(mission.title)).toBeInTheDocument();
  });
});
