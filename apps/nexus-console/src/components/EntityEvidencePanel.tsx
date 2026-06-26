import type { NavPage } from "../data/mockKernel";
import { evidenceForSelection, sourceKindLabel, type EvidenceRegistryItem } from "../evidenceRegistry";
import type { RouteSelection } from "../routing";
import type { ImpactAnalysis, RelationshipCardData } from "../worldModel";
import { StatusBadge } from "./StatusBadge";

type EntityEvidencePanelProps = {
  registry: EvidenceRegistryItem[];
  selection: RouteSelection;
  impactAnalysis?: ImpactAnalysis;
  relationshipData?: RelationshipCardData;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

const CENTRE_LABEL: Partial<Record<NavPage, string>> = {
  missions: "Mission Centre",
  agents: "Agent Centre",
  tools: "Tool Centre",
  knowledge: "Knowledge Centre",
  conversations: "Conversation Centre",
  workspaces: "Portfolio & Workspaces",
};

function whyThisMatters(impactAnalysis?: ImpactAnalysis): string {
  if (!impactAnalysis || impactAnalysis.blastRadius === 0) {
    return "This record has no mapped dependents or dependencies right now, so a change here is unlikely to ripple elsewhere.";
  }
  const parts: string[] = [];
  if (impactAnalysis.dependents.length) {
    parts.push(`${impactAnalysis.dependents.length} record(s) depend on this`);
  }
  if (impactAnalysis.dependencies.length) {
    parts.push(`it depends on ${impactAnalysis.dependencies.length} other record(s)`);
  }
  return `${parts.join(", and ")} — a total blast radius of ${impactAnalysis.blastRadius} connected record(s). Review the Impact Analysis panel for the full breakdown.`;
}

function affectedSystems(relationshipData?: RelationshipCardData): string[] {
  if (!relationshipData) {
    return [];
  }
  const allLinks = [
    ...(relationshipData.parent ? [relationshipData.parent] : []),
    ...relationshipData.belongsTo,
    ...relationshipData.relatedItems,
    ...relationshipData.dependencies,
    ...relationshipData.children,
  ];
  const systems = new Set<string>();
  allLinks.forEach((link) => {
    const label = CENTRE_LABEL[link.page];
    if (label) {
      systems.add(label);
    }
  });
  return Array.from(systems);
}

export function EntityEvidencePanel({ registry, selection, impactAnalysis, relationshipData, onNavigate }: EntityEvidencePanelProps) {
  const relatedEvidence = evidenceForSelection(registry, selection);
  const systems = affectedSystems(relationshipData);

  return (
    <section className="panel surface entity-evidence-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Why This Matters</h3>
          <span>The evidence layer behind this record, as Jarvis would explain it.</span>
        </div>
      </div>

      <p className="entity-evidence-why">{whyThisMatters(impactAnalysis)}</p>

      <div className="entity-evidence-section">
        <strong className="entity-evidence-section-label">Affected Systems</strong>
        {systems.length ? (
          <div className="mission-chip-row">
            {systems.map((system) => (
              <span key={system} className="mission-chip mission-chip-muted">
                {system}
              </span>
            ))}
          </div>
        ) : (
          <p className="simulation-empty">No other systems are currently affected.</p>
        )}
      </div>

      <div className="entity-evidence-section">
        <div className="entity-evidence-section-header">
          <strong className="entity-evidence-section-label">Related Evidence</strong>
          <StatusBadge tone={relatedEvidence.length ? "active" : "idle"}>{relatedEvidence.length}</StatusBadge>
        </div>
        {relatedEvidence.length ? (
          <div className="panel-rows">
            {relatedEvidence.map((item) => (
              <div key={item.id} className="data-row">
                <div>
                  <strong>{item.sourceLabel}</strong>
                  <p>
                    Surfaced via {sourceKindLabel(item.sourceKind)} at {item.confidence}% confidence.
                  </p>
                </div>
                <button type="button" className="route-chip" onClick={() => onNavigate("kernel")}>
                  Open Jarvis
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="simulation-empty">Jarvis has not surfaced this record in a recommendation, decision, follow-up, or approval yet.</p>
        )}
      </div>
    </section>
  );
}
