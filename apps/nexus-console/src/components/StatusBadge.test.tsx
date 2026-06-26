import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";
import { renderWithDefaults } from "../test/testUtils";

describe("StatusBadge", () => {
  it("renders its children", () => {
    renderWithDefaults(<StatusBadge tone="active">Active</StatusBadge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies a tone-specific class so the badge color reflects its status", () => {
    renderWithDefaults(<StatusBadge tone="warning">Degraded</StatusBadge>);
    expect(screen.getByText("Degraded")).toHaveClass("status-badge", "tone-warning");
  });
});
