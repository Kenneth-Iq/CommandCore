import { useState } from "react";
import type { NavPage } from "../data/mockKernel";
import type { HermesActionPreview } from "../hermesBridge";
import type { RouteSelection } from "../routing";
import { StatusBadge } from "./StatusBadge";

type HermesBridgePanelProps = {
  actions: HermesActionPreview[];
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function HermesBridgePanel({ actions, onNavigate }: HermesBridgePanelProps) {
  const [expandedId, setExpandedId] = useState<string | undefined>(undefined);

  return (
    <section className="panel surface hermes-bridge-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Hermes Bridge Preview</h3>
          <span>Available Hermes actions and what a tool handoff would look like, once execution is enabled.</span>
        </div>
        <StatusBadge tone="blocked">Execution Disabled</StatusBadge>
      </div>

      {actions.length ? (
        <div className="panel-rows">
          {actions.map((action) => {
            const expanded = expandedId === action.id;
            return (
              <div key={action.id} className="hermes-bridge-row">
                <div className="data-row">
                  <div>
                    <strong>{action.actionLabel}</strong>
                    <p>{action.description}</p>
                  </div>
                  <div className="row-meta">
                    <StatusBadge tone={action.policyWarning ? "warning" : "idle"}>{action.permissionLevel}</StatusBadge>
                    <button
                      type="button"
                      className="evidence-expand-toggle"
                      aria-label={expanded ? "Collapse tool handoff preview" : "Expand tool handoff preview"}
                      onClick={() => setExpandedId(expanded ? undefined : action.id)}
                    >
                      {expanded ? "Hide Handoff" : "Preview Handoff"}
                    </button>
                  </div>
                </div>

                {action.policyWarning ? (
                  <p className="hermes-policy-warning">
                    <StatusBadge tone="warning">Policy Warning</StatusBadge> {action.policyWarning}
                  </p>
                ) : null}

                {expanded ? (
                  <div className="evidence-card-detail hermes-handoff-detail">
                    <div className="evidence-card-detail-header">
                      <strong>Tool Handoff Preview</strong>
                      <StatusBadge tone="blocked">Not Sent — Execution Disabled</StatusBadge>
                    </div>
                    <dl className="hermes-handoff-fields">
                      {action.handoffPreview.map((field) => (
                        <div key={field.field}>
                          <dt>{field.field}</dt>
                          <dd>{field.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <button type="button" className="route-chip" onClick={() => onNavigate(action.evidence.page, action.evidence.selection)}>
                      {action.evidence.label}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Tools Registered</strong>
          <p>Hermes actions are derived from the tool registry — none are currently available.</p>
        </div>
      )}
    </section>
  );
}
