import type { MetricCard as MetricCardData, PageData } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type AgentStatusGridProps = {
  page: PageData;
};

type AgentStatusItem = {
  id: string;
  label: string;
  detail: string;
  tone: MetricCardData["tone"];
  badge: string;
};

function toItems(page: PageData): AgentStatusItem[] {
  const metricItems = page.metrics.map((metric) => ({
    id: `metric-${metric.label}`,
    label: metric.label,
    detail: metric.hint ?? "Live runtime signal.",
    tone: metric.tone ?? "idle",
    badge: String(metric.value),
  }));

  const rowItems = page.secondaryPanel.rows.map((row) => ({
    id: `row-${row.title}`,
    label: row.title,
    detail: row.subtitle ?? row.meta ?? "No additional detail available.",
    tone: row.badgeTone ?? "idle",
    badge: row.badge ?? row.meta ?? "Tracked",
  }));

  return [...metricItems, ...rowItems].slice(0, 8);
}

export function AgentStatusGrid({ page }: AgentStatusGridProps) {
  const items = toItems(page);

  return (
    <section className="panel surface status-grid-panel">
      <div className="panel-header">
        <h3>Agent Status Grid</h3>
      </div>
      <div className="status-grid">
        {items.map((item) => (
          <article key={item.id} className="status-grid-card">
            <div className="status-grid-header">
              <strong>{item.label}</strong>
              <StatusBadge tone={item.tone ?? "idle"}>{item.badge}</StatusBadge>
            </div>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
