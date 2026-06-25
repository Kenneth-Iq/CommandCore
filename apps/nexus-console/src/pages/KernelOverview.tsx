import { EventFeed } from "../components/EventFeed";
import { InfoPanel } from "../components/InfoPanel";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import type { DataSource } from "../api/commandcoreApi";
import type { PageData } from "../data/mockKernel";

type KernelOverviewProps = {
  page: PageData;
  source: DataSource;
  sourceMessage?: string;
};

export function KernelOverview({ page, source, sourceMessage }: KernelOverviewProps) {
  return (
    <div className="page-shell">
      <PageHeader page={page} />

      <div className="surface source-strip">
        <div>
          <p className="page-eyebrow">Operations Link</p>
          <strong>{source === "live" ? "Live CommandCore telemetry loaded" : "Fallback mock telemetry in use"}</strong>
          {sourceMessage ? <p className="source-note">{sourceMessage}</p> : null}
        </div>
        <div className="source-strip-actions">
          <StatusBadge tone={source === "live" ? "ready" : "idle"}>
            {source === "live" ? "Live API" : "Mock Data"}
          </StatusBadge>
          <StatusBadge tone={page.status.tone}>{page.status.label}</StatusBadge>
        </div>
      </div>

      <section className="metrics-grid kernel-metrics-grid">
        {page.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="panel-grid kernel-panel-grid">
        <InfoPanel title={page.primaryPanel.title} rows={page.primaryPanel.rows} />
        <InfoPanel title={page.secondaryPanel.title} rows={page.secondaryPanel.rows} />
        {page.tertiaryPanel ? <InfoPanel title={page.tertiaryPanel.title} rows={page.tertiaryPanel.rows} /> : null}
        <section className="panel surface availability-panel">
          <div className="panel-header">
            <h3>Runtime / Service Availability</h3>
          </div>
          <div className="availability-grid">
            {(page.availabilityGrid ?? []).map((item) => (
              <article key={item.name} className="availability-card">
                <div className="availability-card-header">
                  <strong>{item.name}</strong>
                  <StatusBadge tone={item.available ? "ready" : "blocked"}>
                    {item.available ? "Available" : "Unavailable"}
                  </StatusBadge>
                </div>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <EventFeed title={page.activityTitle} items={page.activity} emptyMessage={page.emptyState} />
    </div>
  );
}
