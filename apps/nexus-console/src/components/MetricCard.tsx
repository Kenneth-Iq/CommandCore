import type { MetricCard as MetricCardType } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type MetricCardProps = {
  metric: MetricCardType;
};

export function MetricCard({ metric }: MetricCardProps) {
  return (
    <article className={`metric-card ${metric.tone ? `tone-${metric.tone}` : ""}`}>
      <div className="metric-header">
        <p>{metric.label}</p>
        {metric.tone ? <StatusBadge tone={metric.tone}>{metric.tone}</StatusBadge> : null}
      </div>
      <strong>{metric.value}</strong>
      {metric.hint ? <span>{metric.hint}</span> : null}
    </article>
  );
}
