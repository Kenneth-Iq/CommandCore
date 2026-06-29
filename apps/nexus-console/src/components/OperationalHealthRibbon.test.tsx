import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { OperationalHealthRibbon } from "./OperationalHealthRibbon";
import { RuntimeProvider } from "../runtimeContext";
import { buildMockWorld, createMockOnNavigate, renderWithDefaults } from "../test/testUtils";

describe("OperationalHealthRibbon", () => {
  it("renders all five named pulses within a RuntimeProvider", () => {
    const world = buildMockWorld();
    renderWithDefaults(
      <RuntimeProvider world={world} activePage="kernel" onNavigate={createMockOnNavigate()}>
        <OperationalHealthRibbon />
      </RuntimeProvider>,
    );
    expect(screen.getByText("Mission Pulse")).toBeInTheDocument();
    expect(screen.getByText("Agent Pulse")).toBeInTheDocument();
    expect(screen.getByText("Tool Pulse")).toBeInTheDocument();
    expect(screen.getByText("Knowledge Pulse")).toBeInTheDocument();
    expect(screen.getByText("Conversation Pulse")).toBeInTheDocument();
  });

  it("renders the live health score label", () => {
    const world = buildMockWorld();
    renderWithDefaults(
      <RuntimeProvider world={world} activePage="kernel" onNavigate={createMockOnNavigate()}>
        <OperationalHealthRibbon />
      </RuntimeProvider>,
    );
    expect(screen.getByText("Live Health Score")).toBeInTheDocument();
  });

  it("folds the simulation tick indicator into the ribbon now that OperationalPulse is retired", () => {
    const world = buildMockWorld();
    renderWithDefaults(
      <RuntimeProvider world={world} activePage="kernel" onNavigate={createMockOnNavigate()}>
        <OperationalHealthRibbon />
      </RuntimeProvider>,
    );
    expect(screen.getByText("Tick 0")).toBeInTheDocument();
  });

  it("exposes the tick and health score together via the ribbon's title attribute", () => {
    const world = buildMockWorld();
    renderWithDefaults(
      <RuntimeProvider world={world} activePage="kernel" onNavigate={createMockOnNavigate()}>
        <OperationalHealthRibbon />
      </RuntimeProvider>,
    );
    expect(screen.getByRole("status", { name: "Global operational health ribbon" })).toHaveAttribute(
      "title",
      expect.stringContaining("Simulated operational tick 0"),
    );
  });
});
