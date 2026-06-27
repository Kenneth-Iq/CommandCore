import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { HermesQueueBoard } from "./HermesQueueBoard";
import type { HermesQueueItem, HermesQueueKind } from "../hermesBridge";
import { createMockOnNavigate, renderWithDefaults } from "../test/testUtils";

function emptyQueues(): Record<HermesQueueKind, HermesQueueItem[]> {
  return { mission: [], execution: [], tool: [], policy: [], approval: [] };
}

describe("HermesQueueBoard", () => {
  it("labels the board as execution disabled", () => {
    renderWithDefaults(<HermesQueueBoard queues={emptyQueues()} onNavigate={createMockOnNavigate()} />);
    expect(screen.getByText("Execution Disabled / Preview Mode")).toBeInTheDocument();
  });

  it("shows an execution preview with a disabled execute button when an item is selected", () => {
    const queues = emptyQueues();
    queues.tool = [
      { id: "t1", kind: "tool", title: "Test Tool", detail: "A simulated tool.", status: "safe", evidence: { label: "Open Tool", page: "tools" } },
    ];
    renderWithDefaults(<HermesQueueBoard queues={queues} onNavigate={createMockOnNavigate()} />);
    fireEvent.click(screen.getByText("Test Tool"));
    expect(screen.getByText("Execution Preview")).toBeInTheDocument();
    expect(screen.getByText("Execute (Disabled)")).toBeDisabled();
  });

  it("shows a placeholder before any queue item is selected", () => {
    renderWithDefaults(<HermesQueueBoard queues={emptyQueues()} onNavigate={createMockOnNavigate()} />);
    expect(screen.getByText(/Select a queue item/)).toBeInTheDocument();
  });
});
