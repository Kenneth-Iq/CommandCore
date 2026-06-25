import type { PageData } from "../data/mockKernel";
import { ActivityFeed } from "../components/ActivityFeed";
import { InfoPanel } from "../components/InfoPanel";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";

type DashboardPageProps = {
  page: PageData;
};

export function DashboardPage({ page }: DashboardPageProps) {
  return (
    <div className="page-shell">
      <PageHeader page={page} />

      <section className="metrics-grid">
        {page.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="panel-grid">
        <InfoPanel title={page.primaryPanel.title} rows={page.primaryPanel.rows} />
        <InfoPanel title={page.secondaryPanel.title} rows={page.secondaryPanel.rows} />
      </section>

      <ActivityFeed title={page.activityTitle} items={page.activity} />
    </div>
  );
}
