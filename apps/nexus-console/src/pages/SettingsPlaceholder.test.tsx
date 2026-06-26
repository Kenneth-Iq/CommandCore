import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { mockKernel } from "../data/mockKernel";
import { renderWithDefaults } from "../test/testUtils";
import { SettingsPlaceholder } from "./SettingsPlaceholder";

describe("SettingsPlaceholder page", () => {
  it("renders the page header, metrics, and panels from the supplied PageData", () => {
    renderWithDefaults(
      <SettingsPlaceholder page={mockKernel.settingsPage} source="mock" sourceMessage="Using built-in mock kernel data." />,
    );

    expect(screen.getByText(mockKernel.settingsPage.title)).toBeInTheDocument();
    expect(screen.getByText(mockKernel.settingsPage.primaryPanel.title)).toBeInTheDocument();
    expect(screen.getByText(mockKernel.settingsPage.secondaryPanel.title)).toBeInTheDocument();
  });

  it("renders every metric supplied in the page data", () => {
    renderWithDefaults(
      <SettingsPlaceholder page={mockKernel.settingsPage} source="mock" sourceMessage="Using built-in mock kernel data." />,
    );

    mockKernel.settingsPage.metrics.forEach((metric) => {
      expect(screen.getByText(metric.label)).toBeInTheDocument();
    });
  });
});
