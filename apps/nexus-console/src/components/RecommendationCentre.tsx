import type { NavPage } from "../data/mockKernel";
import type { RecommendationCard, RecommendationKind } from "../executiveAssistant";
import type { RouteSelection } from "../routing";
import type { WorldData } from "../worldModel";
import { EvidenceCard } from "./EvidenceCard";
import { StatusBadge } from "./StatusBadge";

type RecommendationCentreProps = {
  recommendations: RecommendationCard[];
  world: WorldData;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
  onInvestigate?: (label: string) => void;
};

const kindLabel: Record<RecommendationKind, string> = {
  risk: "Risk",
  opportunity: "Opportunity",
  anomaly: "Anomaly",
  efficiency: "Efficiency",
  trend: "Trend",
};

const kindTone: Record<RecommendationKind, "warning" | "complete" | "blocked" | "ready" | "active"> = {
  risk: "blocked",
  opportunity: "complete",
  anomaly: "warning",
  efficiency: "ready",
  trend: "active",
};

export function RecommendationCentre({ recommendations, world, onNavigate, onInvestigate }: RecommendationCentreProps) {
  return (
    <section className="panel surface recommendation-centre-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Recommendation Centre</h3>
          <span>{recommendations.length ? `${recommendations.length} recommendations surfaced from current operating state` : "No recommendations right now"}</span>
        </div>
      </div>

      {recommendations.length ? (
        <div className="recommendation-grid">
          {recommendations.map((card) => (
            <article key={card.id} className="recommendation-card">
              <div className="recommendation-card-header">
                <StatusBadge tone={kindTone[card.kind]}>{kindLabel[card.kind]}</StatusBadge>
                <span className="recommendation-confidence">{card.confidence}% confidence</span>
              </div>
              <strong>{card.title}</strong>
              <p>{card.detail}</p>
              <dl className="recommendation-detail-list">
                <div>
                  <dt>Reason</dt>
                  <dd>{card.reason}</dd>
                </div>
                <div>
                  <dt>Business Impact</dt>
                  <dd>{card.businessImpact}</dd>
                </div>
                <div>
                  <dt>Suggested Next Step</dt>
                  <dd>{card.suggestedNextStep}</dd>
                </div>
              </dl>
              <div className="mission-chip-row">
                {card.affectedSystems.map((system) => (
                  <span key={system} className="mission-chip mission-chip-muted">
                    {system}
                  </span>
                ))}
              </div>
              <EvidenceCard evidence={card.evidence} world={world} onNavigate={onNavigate} onInvestigate={onInvestigate} />
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Recommendations Yet</strong>
          <p>Jarvis will surface risks, opportunities, anomalies, efficiencies, and trends here as they emerge.</p>
        </div>
      )}
    </section>
  );
}
