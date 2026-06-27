import { useState } from "react";
import type { NavPage } from "../data/mockKernel";
import type { HermesQueueItem, HermesQueueKind } from "../hermesBridge";
import type { RouteSelection } from "../routing";
import { StatusBadge } from "./StatusBadge";

type HermesQueueBoardProps = {
  queues: Record<HermesQueueKind, HermesQueueItem[]>;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

const QUEUE_LABEL: Record<HermesQueueKind, string> = {
  mission: "Mission Queue",
  execution: "Execution Queue",
  tool: "Tool Queue",
  policy: "Policy Queue",
  approval: "Approval Queue",
};

const QUEUE_TONE: Record<HermesQueueKind, "active" | "ready" | "idle" | "warning" | "blocked"> = {
  mission: "active",
  execution: "ready",
  tool: "idle",
  policy: "warning",
  approval: "blocked",
};

const QUEUE_ORDER: HermesQueueKind[] = ["mission", "execution", "tool", "policy", "approval"];

export function HermesQueueBoard({ queues, onNavigate }: HermesQueueBoardProps) {
  const [selected, setSelected] = useState<HermesQueueItem | undefined>(undefined);

  return (
    <section className="panel surface hermes-queue-board-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Hermes Mission Centre Preview</h3>
          <span>Mission, execution, tool, policy, and approval queues — all simulated.</span>
        </div>
        <StatusBadge tone="blocked">Execution Disabled / Preview Mode</StatusBadge>
      </div>

      <div className="hermes-queue-board-grid">
        {QUEUE_ORDER.map((kind) => {
          const items = queues[kind];
          return (
            <div key={kind} className="hermes-queue-column">
              <div className="hermes-queue-column-header">
                <strong>{QUEUE_LABEL[kind]}</strong>
                <StatusBadge tone={QUEUE_TONE[kind]}>{items.length}</StatusBadge>
              </div>
              {items.length ? (
                <div className="hermes-queue-list">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={selected?.id === item.id ? "hermes-queue-item is-selected" : "hermes-queue-item"}
                      onClick={() => setSelected(item)}
                    >
                      <strong>{item.title}</strong>
                      <span className="hermes-queue-item-status">{item.status}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="simulation-empty">Nothing queued.</p>
              )}
            </div>
          );
        })}
      </div>

      {selected ? (
        <div className="hermes-execution-preview">
          <div className="panel-header">
            <div className="panel-title-stack">
              <h3>Execution Preview</h3>
              <span>{selected.title}</span>
            </div>
            <StatusBadge tone="blocked">Not Sent — Execution Disabled</StatusBadge>
          </div>
          <p>{selected.detail}</p>
          <div className="hermes-execution-preview-actions">
            <button type="button" className="route-chip" onClick={() => onNavigate(selected.evidence.page, selected.evidence.selection)}>
              {selected.evidence.label}
            </button>
            <button type="button" className="route-chip is-disabled" disabled title="Execution is disabled in this preview build.">
              Execute (Disabled)
            </button>
          </div>
        </div>
      ) : (
        <p className="simulation-empty">Select a queue item to preview what its execution would involve.</p>
      )}
    </section>
  );
}
