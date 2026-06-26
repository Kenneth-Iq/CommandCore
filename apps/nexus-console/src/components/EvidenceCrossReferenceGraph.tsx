import { evidenceTargetKey, sourceKindLabel, type EvidenceRegistryItem } from "../evidenceRegistry";
import type { NavPage } from "../data/mockKernel";
import type { RouteSelection } from "../routing";

type EvidenceCrossReferenceGraphProps = {
  registry: EvidenceRegistryItem[];
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

type EntityGroup = {
  key: string;
  label: string;
  page: NavPage;
  selection?: RouteSelection;
  items: EvidenceRegistryItem[];
};

export function EvidenceCrossReferenceGraph({ registry, onNavigate }: EvidenceCrossReferenceGraphProps) {
  const groups = new Map<string, EntityGroup>();
  registry.forEach((item) => {
    const key = evidenceTargetKey(item.evidence);
    if (!key) {
      return;
    }
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(key, {
        key,
        label: item.evidence.label,
        page: item.evidence.page,
        selection: item.evidence.selection,
        items: [item],
      });
    }
  });

  const entities = Array.from(groups.values()).sort((a, b) => b.items.length - a.items.length);

  return (
    <section className="panel surface evidence-cross-reference-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Cross-Reference Graph</h3>
          <span>Which entities are accumulating the most evidence across Jarvis's surfaces right now.</span>
        </div>
      </div>

      {entities.length ? (
        <div className="evidence-graph-grid">
          {entities.map((entity) => (
            <button
              key={entity.key}
              type="button"
              className="dependency-node-card evidence-graph-node"
              onClick={() => onNavigate(entity.page, entity.selection)}
            >
              <strong>{entity.label}</strong>
              <span className="evidence-graph-node-count">
                {entity.items.length} evidence link{entity.items.length === 1 ? "" : "s"}
              </span>
              <div className="evidence-graph-node-sources">
                {Array.from(new Set(entity.items.map((item) => item.sourceKind))).map((kind) => (
                  <span key={kind} className="mission-chip mission-chip-muted">
                    {sourceKindLabel(kind)}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Cross-References Yet</strong>
          <p>Once Jarvis surfaces evidence on more than one entity, shared connections will appear here.</p>
        </div>
      )}
    </section>
  );
}
