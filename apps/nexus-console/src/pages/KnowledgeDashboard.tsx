import type { DataSource } from "../api/commandcoreApi";
import { EventFeed } from "../components/EventFeed";
import { KnowledgeCentre } from "../components/KnowledgeCentre";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { SourceStrip } from "../components/SourceStrip";
import type { NavPage, PageData } from "../data/mockKernel";
import type { KnowledgeCentreData } from "../data/nexusCentres";

type KnowledgeDashboardProps = {
  page: PageData;
  source: DataSource;
  sourceMessage?: string;
  knowledgeCentre: KnowledgeCentreData;
  onNavigate: (page: NavPage) => void;
};

export function KnowledgeDashboard({ page, source, sourceMessage, knowledgeCentre, onNavigate }: KnowledgeDashboardProps) {
  return (
    <div className="page-shell">
      <PageHeader page={page} />
      <SourceStrip source={source} sourceMessage={sourceMessage} status={page.status} />

      <section className="metrics-grid">
        {page.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <KnowledgeCentre knowledgeCentre={knowledgeCentre} onNavigate={onNavigate} />

      <EventFeed title={page.activityTitle} items={page.activity} emptyMessage={page.emptyState} />
    </div>
  );
}
