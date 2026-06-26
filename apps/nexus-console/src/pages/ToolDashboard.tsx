import { EventFeed } from "../components/EventFeed";
import { HermesClawPreparationPanel } from "../components/HermesClawPreparationPanel";
import { InfoPanel } from "../components/InfoPanel";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { SourceStrip } from "../components/SourceStrip";
import { ToolInvocationHistoryPanel } from "../components/ToolInvocationHistoryPanel";
import { ToolInvocationSections } from "../components/ToolInvocationSections";
import { ToolMonitor } from "../components/ToolMonitor";
import { ToolPermissionBreakdown } from "../components/ToolPermissionBreakdown";
import { ToolRegistryPanel } from "../components/ToolRegistryPanel";
import type { DataSource } from "../api/commandcoreApi";
import type { NavPage, PageData, ToolCentreData } from "../data/mockKernel";

type ToolDashboardProps = {
  page: PageData;
  toolCentre: ToolCentreData;
  source: DataSource;
  sourceMessage?: string;
  onNavigate: (page: NavPage) => void;
};

export function ToolDashboard({ page, toolCentre, source, sourceMessage, onNavigate }: ToolDashboardProps) {
  return (
    <div className="page-shell">
      <PageHeader page={page} />
      <SourceStrip source={source} sourceMessage={sourceMessage} status={page.status} label="Tool Link" />

      <section className="metrics-grid">
        {page.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="operations-layout">
        <ToolMonitor page={page} />
        <InfoPanel title={page.primaryPanel.title} rows={page.primaryPanel.rows} />
        <InfoPanel title={page.secondaryPanel.title} rows={page.secondaryPanel.rows} />
      </section>

      <ToolPermissionBreakdown
        counts={toolCentre.counts}
        invocationCounts={toolCentre.invocationCounts}
        permissionBreakdown={toolCentre.permissionBreakdown}
      />

      <ToolInvocationSections
        active={toolCentre.invocations.active}
        completed={toolCentre.invocations.completed}
        failed={toolCentre.invocations.failed}
      />

      <section className="mission-support-grid">
        <ToolRegistryPanel tools={toolCentre.tools} onNavigate={onNavigate} />
        <ToolInvocationHistoryPanel invocations={toolCentre.invocations} />
      </section>

      <HermesClawPreparationPanel counts={toolCentre.counts} invocationCounts={toolCentre.invocationCounts} />

      <EventFeed title={page.activityTitle} items={page.activity} emptyMessage={page.emptyState} />
    </div>
  );
}
