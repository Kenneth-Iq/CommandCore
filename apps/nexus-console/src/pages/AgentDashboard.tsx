import { AgentAssignmentHistoryPanel } from "../components/AgentAssignmentHistoryPanel";
import { AgentCapabilityPanel } from "../components/AgentCapabilityPanel";
import { AgentProfilePanel } from "../components/AgentProfilePanel";
import { AgentStatusGrid } from "../components/AgentStatusGrid";
import { AgentStatusSections } from "../components/AgentStatusSections";
import { EventFeed } from "../components/EventFeed";
import { InfoPanel } from "../components/InfoPanel";
import { MetricCard } from "../components/MetricCard";
import { MissionAgentAssignmentPanel } from "../components/MissionAgentAssignmentPanel";
import { PageHeader } from "../components/PageHeader";
import { SourceStrip } from "../components/SourceStrip";
import type { DataSource } from "../api/commandcoreApi";
import type { AgentCentreData, PageData } from "../data/mockKernel";

type AgentDashboardProps = {
  page: PageData;
  agentCentre: AgentCentreData;
  source: DataSource;
  sourceMessage?: string;
};

export function AgentDashboard({ page, agentCentre, source, sourceMessage }: AgentDashboardProps) {
  const failedAgentIds = new Set(agentCentre.executions.failed.map((execution) => execution.agentId));
  const activeAgents = agentCentre.profiles.filter((agent) => agent.runtimeStatus === "busy");
  const idleAgents = agentCentre.profiles.filter((agent) => agent.runtimeStatus === "available");
  const failedAgents = agentCentre.profiles.filter((agent) => failedAgentIds.has(agent.agentId));

  return (
    <div className="page-shell">
      <PageHeader page={page} />
      <SourceStrip source={source} sourceMessage={sourceMessage} status={page.status} label="Agent Link" />

      <section className="metrics-grid">
        {page.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="operations-layout">
        <AgentStatusGrid page={page} />
        <InfoPanel title={page.primaryPanel.title} rows={page.primaryPanel.rows} />
        <InfoPanel title={page.secondaryPanel.title} rows={page.secondaryPanel.rows} />
      </section>

      <AgentStatusSections active={activeAgents} idle={idleAgents} failed={failedAgents} />

      <AgentProfilePanel profiles={agentCentre.profiles} />

      <section className="mission-support-grid">
        <AgentAssignmentHistoryPanel assignments={agentCentre.assignments} />
        <MissionAgentAssignmentPanel
          executions={agentCentre.executions}
          title="Recent Execution History"
          emptyMessage="Execution telemetry will appear here once agents run mission tasks."
        />
      </section>

      <AgentCapabilityPanel profiles={agentCentre.profiles} />

      <EventFeed title={page.activityTitle} items={page.activity} emptyMessage={page.emptyState} />
    </div>
  );
}
