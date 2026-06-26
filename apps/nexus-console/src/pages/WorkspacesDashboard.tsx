import type { DataSource } from "../api/commandcoreApi";
import { EventFeed } from "../components/EventFeed";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { PortfolioExplorer } from "../components/PortfolioExplorer";
import { SourceStrip } from "../components/SourceStrip";
import type { NavPage, PageData } from "../data/mockKernel";
import type { PortfolioExplorerData } from "../data/nexusCentres";

type WorkspacesDashboardProps = {
  page: PageData;
  source: DataSource;
  sourceMessage?: string;
  portfolioExplorer: PortfolioExplorerData;
  onNavigate: (page: NavPage) => void;
};

export function WorkspacesDashboard({ page, source, sourceMessage, portfolioExplorer, onNavigate }: WorkspacesDashboardProps) {
  return (
    <div className="page-shell">
      <PageHeader page={page} />
      <SourceStrip source={source} sourceMessage={sourceMessage} status={page.status} />

      <section className="metrics-grid">
        {page.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <PortfolioExplorer portfolioExplorer={portfolioExplorer} onNavigate={onNavigate} />

      <EventFeed title={page.activityTitle} items={page.activity} emptyMessage={page.emptyState} />
    </div>
  );
}
