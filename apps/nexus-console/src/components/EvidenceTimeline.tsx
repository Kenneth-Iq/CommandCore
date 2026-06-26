import type { NavPage } from "../data/mockKernel";
import { sourceKindLabel, type EvidenceRegistryItem } from "../evidenceRegistry";
import type { RouteSelection } from "../routing";
import { StatusBadge } from "./StatusBadge";

type EvidenceTimelineProps = {
  registry: EvidenceRegistryItem[];
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function EvidenceTimeline({ registry, onNavigate }: EvidenceTimelineProps) {
  return (
    <section className="panel surface evidence-timeline-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Evidence Timeline</h3>
          <span>When each piece of evidence currently backing a Jarvis statement was surfaced.</span>
        </div>
      </div>

      {registry.length ? (
        <div className="conversation-timeline-list">
          {registry.map((item) => (
            <article key={item.id} className="conversation-timeline-item">
              <div className="event-rail tone-active" />
              <div className="conversation-timeline-body">
                <div className="conversation-timeline-header">
                  <strong>{item.sourceLabel}</strong>
                  <span className="conversation-timeline-meta">
                    <StatusBadge tone="active">{sourceKindLabel(item.sourceKind)}</StatusBadge>
                    <span>{item.occurredAt}</span>
                  </span>
                </div>
                <button type="button" className="route-chip" onClick={() => onNavigate(item.evidence.page, item.evidence.selection)}>
                  {item.evidence.label}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Evidence Yet</strong>
          <p>Evidence will appear here as Jarvis surfaces recommendations, decisions, follow-ups, and approvals.</p>
        </div>
      )}
    </section>
  );
}
