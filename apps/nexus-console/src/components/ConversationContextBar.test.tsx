import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { ConversationContextBar } from "./ConversationContextBar";
import { renderWithDefaults } from "../test/testUtils";

describe("ConversationContextBar", () => {
  it("renders the planet and a not-focused placeholder for unset scopes", () => {
    renderWithDefaults(<ConversationContextBar context={{ planet: "Enterprise (single-planet deployment)" }} />);
    expect(screen.getByText("Enterprise (single-planet deployment)")).toBeInTheDocument();
    expect(screen.getAllByText("Not focused").length).toBeGreaterThan(0);
  });

  it("renders a focused company name when provided", () => {
    renderWithDefaults(<ConversationContextBar context={{ planet: "Enterprise", company: "Acme Corp" }} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });
});
