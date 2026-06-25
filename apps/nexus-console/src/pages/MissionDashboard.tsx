import { EventFeed } from "../components/EventFeed";
import { InfoPanel } from "../components/InfoPanel";
import { MetricCard } from "../components/MetricCard";
import { MissionAgentAssignmentPanel } from "../components/MissionAgentAssignmentPanel";
import { MissionOutcomesPanel } from "../components/MissionOutcomesPanel";
import { MissionSectionList } from "../components/MissionSectionList";
import { MissionStatusBreakdown } from "../components/MissionStatusBreakdown";
import { MissionTimeline } from "../components/MissionTimeline";
import { PageHeader } from "../components/PageHeader";
import { SourceStrip } from "../components/SourceStrip";
import type { DataSource } from "../api/commandcoreApi";
import type { MissionCentreData, PageData } from "../data/mockKernel";

type MissionDashboardProps = {
  page: PageData;
  missionCentre: MissionCentreData;
  source: DataSource;
  sourceMessage?: string;
};

export function MissionDashboard({ page, missionCentre, source, sourceMessage }: MissionDashboardProps) {
  return (
    <div className="page-shell">
      <PageHeader page={page} />
      <SourceStrip source={source} sourceMessage={sourceMessage} status={page.status} label="Mission Link" />

      <section className="metrics-grid">
        {page.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <MissionStatusBreakdown
        counts={missionCentre.counts}
        throughput={missionCentre.throughput}
        assignedAgentCount={missionCentre.assignedAgentCount}
      />

      <section className="operations-layout">
        <MissionTimeline page={page} />
        <InfoPanel title={page.primaryPanel.title} rows={page.primaryPanel.rows} />
        <InfoPanel title={page.secondaryPanel.title} rows={page.secondaryPanel.rows} />
      </section>

      <section className="mission-status-grid">
        <MissionSectionList
          title="Active Missions"
          tone="active"
          records={missionCentre.active}
          emptyMessage="No missions are currently active."
        />
        <MissionSectionList
          title="Completed Missions"
          tone="complete"
          records={missionCentre.completed}
          emptyMessage="No missions have completed yet."
        />
        <MissionSectionList
          title="Failed Missions"
          tone="warning"
          records={missionCentre.failed}
          emptyMessage="No mission failures recorded."
        />
      </section>

      <section className="mission-support-grid">
        <MissionAgentAssignmentPanel executions={missionCentre.executions} />
        <MissionOutcomesPanel completed={missionCentre.completed} failed={missionCentre.failed} />
      </section>

      <EventFeed title={page.activityTitle} items={page.activity} emptyMessage={page.emptyState} />
    </div>
  );
}
