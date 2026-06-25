import { EventFeed } from "../components/EventFeed";
import { InfoPanel } from "../components/InfoPanel";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { SourceStrip } from "../components/SourceStrip";
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

      <SourceStrip
        source={source}
        sourceMessage={sourceMessage}
        label="Operations Link"
        title={source === "live" ? "Live CommandCore telemetry loaded" : "Fallback mock telemetry in use"}
        status={page.status}
      />

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
                  <SourceAvailability available={item.available} />
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

function SourceAvailability({ available }: { available: boolean }) {
  return (
    <span className={`status-badge ${available ? "tone-ready" : "tone-blocked"}`}>
      {available ? "Available" : "Unavailable"}
    </span>
  );
}
