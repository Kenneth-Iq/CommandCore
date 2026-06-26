import { StatusBadge } from "./StatusBadge";

type HealthMetric = {
  label: string;
  score: number;
  detail: string;
};

type ExecutiveHealthBoardProps = {
  metrics: HealthMetric[];
};

export function ExecutiveHealthBoard({ metrics }: ExecutiveHealthBoardProps) {
  return (
    <section className="panel surface executive-health-board">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Executive Health Board</h3>
          <span>Platform, readiness, runtime, memory, and execution health in one scoring board.</span>
        </div>
      </div>
      <div className="executive-health-grid">
        {metrics.map((metric) => (
          <article key={metric.label} className="executive-health-card">
            <div className="knowledge-card-header">
              <strong>{metric.label}</strong>
              <StatusBadge tone={toneForScore(metric.score)}>{metric.score}</StatusBadge>
            </div>
            <p>{metric.detail}</p>
            <div className="health-score-bar">
              <div className={`health-score-fill tone-${toneForScore(metric.score)}`} style={{ width: `${metric.score}%` }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function toneForScore(score: number): "ready" | "warning" | "blocked" | "active" | "idle" | "complete" {
  if (score >= 90) {
    return "complete";
  }
  if (score >= 75) {
    return "ready";
  }
  if (score >= 60) {
    return "active";
  }
  if (score >= 40) {
    return "warning";
  }
  return "blocked";
}
