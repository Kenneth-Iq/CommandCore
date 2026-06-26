import type { ToolCentreData } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type HermesClawPreparationPanelProps = {
  counts: ToolCentreData["counts"];
  invocationCounts: ToolCentreData["invocationCounts"];
};

export function HermesClawPreparationPanel({ counts, invocationCounts }: HermesClawPreparationPanelProps) {
  const readinessRows = [
    {
      label: "Tool Registry Visibility",
      detail: `${counts.total} tools registered and inspectable.`,
      ready: counts.total > 0,
    },
    {
      label: "Invocation Telemetry",
      detail: `${invocationCounts.total} invocation records observed across active, completed, and failed states.`,
      ready: invocationCounts.total > 0,
    },
    {
      label: "Permission Tiering",
      detail: "Safe, restricted, and privileged tiers are visible per tool.",
      ready: true,
    },
    {
      label: "Hermes-Claw Execution Layer",
      detail: "Real tool execution is not yet enabled. This is a read-only visibility milestone.",
      ready: false,
    },
  ];

  return (
    <section className="panel surface hermes-claw-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Hermes-Claw Preparation</h3>
          <span>Reserved surface for the future tool execution layer</span>
        </div>
      </div>

      <div className="panel-rows">
        {readinessRows.map((row) => (
          <div key={row.label} className="data-row">
            <div>
              <strong>{row.label}</strong>
              <p>{row.detail}</p>
            </div>
            <div className="row-meta">
              <StatusBadge tone={row.ready ? "ready" : "idle"}>{row.ready ? "Ready" : "Planned"}</StatusBadge>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
