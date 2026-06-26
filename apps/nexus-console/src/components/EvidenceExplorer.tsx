import type { NavPage } from "../data/mockKernel";
import { resolveEvidenceHealth, sourceKindLabel, type EvidenceHealth, type EvidenceRegistryItem } from "../evidenceRegistry";
import type { RouteSelection } from "../routing";
import type { ExecutiveSimulationState } from "../simulation";
import { StatusBadge } from "./StatusBadge";

type EvidenceExplorerProps = {
  registry: EvidenceRegistryItem[];
  simulation: ExecutiveSimulationState;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

const healthTone: Record<EvidenceHealth, "complete" | "warning" | "blocked" | "idle"> = {
  healthy: "complete",
  degraded: "warning",
  blocked: "blocked",
  stable: "idle",
};

const healthLabel: Record<EvidenceHealth, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  blocked: "Blocked",
  stable: "Stable",
};

export function EvidenceExplorer({ registry, simulation, onNavigate }: EvidenceExplorerProps) {
  return (
    <section className="panel surface evidence-explorer-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Evidence Explorer</h3>
          <span>{registry.length ? `${registry.length} evidence link(s) currently backing Jarvis's statements` : "No evidence currently in play"}</span>
        </div>
      </div>

      {registry.length ? (
        <div className="evidence-explorer-grid">
          {registry.map((item) => {
            const health = resolveEvidenceHealth(item.evidence, simulation);
            return (
              <article key={item.id} className="evidence-explorer-card">
                <div className="evidence-explorer-card-header">
                  <StatusBadge tone="active">{sourceKindLabel(item.sourceKind)}</StatusBadge>
                  <span className="recommendation-confidence">{item.confidence}% confidence</span>
                </div>
                <strong>{item.sourceLabel}</strong>
                <div className="evidence-explorer-card-footer">
                  <StatusBadge tone={healthTone[health]}>{healthLabel[health]}</StatusBadge>
                  <span className="approval-card-meta">{item.occurredAt}</span>
                </div>
                <button type="button" className="route-chip" onClick={() => onNavigate(item.evidence.page, item.evidence.selection)}>
                  Open Nexus: {item.evidence.label}
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <strong>Nothing To Verify Yet</strong>
          <p>As Jarvis surfaces recommendations, decisions, follow-ups, and approvals, their evidence will appear here for inspection.</p>
        </div>
      )}
    </section>
  );
}
