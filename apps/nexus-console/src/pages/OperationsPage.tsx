import { EventFeed } from "../components/EventFeed";
import { InfoPanel } from "../components/InfoPanel";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import type { DataSource } from "../api/commandcoreApi";
import type { PageData } from "../data/mockKernel";

type OperationsPageProps = {
  page: PageData;
  source: DataSource;
  sourceMessage?: string;
};

export function OperationsPage({ page, source, sourceMessage }: OperationsPageProps) {
  return (
    <div className="page-shell">
      <PageHeader page={page} />

      <div className="surface source-strip">
        <div>
          <p className="page-eyebrow">Data Mode</p>
          <strong>{source === "live" ? "Connected to CommandCore API" : "Using Mock Kernel Snapshot"}</strong>
          {sourceMessage ? <p className="source-note">{sourceMessage}</p> : null}
        </div>
        <StatusBadge tone={source === "live" ? "ready" : "idle"}>
          {source === "live" ? "Live API" : "Mock Data"}
        </StatusBadge>
      </div>

      <section className="metrics-grid">
        {page.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="panel-grid">
        <InfoPanel title={page.primaryPanel.title} rows={page.primaryPanel.rows} />
        <InfoPanel title={page.secondaryPanel.title} rows={page.secondaryPanel.rows} />
        {page.tertiaryPanel ? <InfoPanel title={page.tertiaryPanel.title} rows={page.tertiaryPanel.rows} /> : null}
      </section>

      <EventFeed title={page.activityTitle} items={page.activity} emptyMessage={page.emptyState} />
    </div>
  );
}
