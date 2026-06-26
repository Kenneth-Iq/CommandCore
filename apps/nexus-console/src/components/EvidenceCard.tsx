import { useState } from "react";
import type { NavPage } from "../data/mockKernel";
import type { EvidenceLink } from "../executiveAssistant";
import { resolveEvidenceDetail } from "../executiveAssistant";
import type { RouteSelection } from "../routing";
import type { WorldData } from "../worldModel";
import { StatusBadge } from "./StatusBadge";

type EvidenceCardProps = {
  evidence: EvidenceLink;
  world: WorldData;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
  onInvestigate?: (label: string) => void;
};

export function EvidenceCard({ evidence, world, onNavigate, onInvestigate }: EvidenceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const detail = resolveEvidenceDetail(evidence, world);

  return (
    <div className="evidence-card">
      <div className="evidence-card-actions">
        <button
          type="button"
          className="route-chip"
          onClick={() => {
            onInvestigate?.(evidence.label);
            onNavigate(evidence.page, evidence.selection);
          }}
        >
          Open Nexus: {evidence.label}
        </button>
        {detail ? (
          <button
            type="button"
            className="evidence-expand-toggle"
            aria-label={expanded ? "Collapse evidence detail" : "Expand evidence detail"}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Hide Evidence" : "Show Evidence"}
          </button>
        ) : null}
      </div>
      {expanded && detail ? (
        <div className="evidence-card-detail">
          <div className="evidence-card-detail-header">
            <StatusBadge tone="active">{detail.kind}</StatusBadge>
            <strong>{detail.title}</strong>
          </div>
          <ul className="evidence-card-fact-list">
            {detail.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
