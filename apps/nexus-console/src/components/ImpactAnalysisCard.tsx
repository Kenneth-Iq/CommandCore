import type { NavPage } from "../data/mockKernel";
import type { RouteSelection } from "../routing";
import type { ImpactAnalysis } from "../worldModel";

type ImpactAnalysisCardProps = {
  analysis: ImpactAnalysis;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function ImpactAnalysisCard({ analysis, onNavigate }: ImpactAnalysisCardProps) {
  const hasAny = analysis.dependents.length > 0 || analysis.dependencies.length > 0;

  return (
    <section className="panel surface impact-analysis-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Impact Analysis</h3>
          <span>
            Blast radius: {analysis.blastRadius} connected record{analysis.blastRadius === 1 ? "" : "s"}.
          </span>
        </div>
      </div>

      {hasAny ? (
        <div className="impact-analysis-grid">
          <div className="relationship-group">
            <span className="relationship-group-label">Dependents</span>
            {analysis.dependents.length ? (
              <div className="route-chip-row">
                {analysis.dependents.map((link, index) => (
                  <button
                    key={`dependent-${index}-${link.label}`}
                    type="button"
                    className="route-chip"
                    onClick={() => onNavigate(link.page, link.selection)}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            ) : (
              <span className="relationship-group-empty">None</span>
            )}
          </div>
          <div className="relationship-group">
            <span className="relationship-group-label">Dependencies</span>
            {analysis.dependencies.length ? (
              <div className="route-chip-row">
                {analysis.dependencies.map((link, index) => (
                  <button
                    key={`dependency-${index}-${link.label}`}
                    type="button"
                    className="route-chip"
                    onClick={() => onNavigate(link.page, link.selection)}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            ) : (
              <span className="relationship-group-empty">None</span>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Impact Mapped</strong>
          <p>This record has no resolvable dependents or dependencies in the current operating picture.</p>
        </div>
      )}
    </section>
  );
}
