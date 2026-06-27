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
});
