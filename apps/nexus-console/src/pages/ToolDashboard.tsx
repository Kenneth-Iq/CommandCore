import { EventFeed } from "../components/EventFeed";
import { HermesClawPreparationPanel } from "../components/HermesClawPreparationPanel";
import { InfoPanel } from "../components/InfoPanel";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { RecordDetailPanel } from "../components/RecordDetailPanel";
import { SelectedContextBar } from "../components/SelectedContextBar";
import { SourceStrip } from "../components/SourceStrip";
import { ToolInvocationHistoryPanel } from "../components/ToolInvocationHistoryPanel";
import { ToolInvocationSections } from "../components/ToolInvocationSections";
import { ToolMonitor } from "../components/ToolMonitor";
import { ToolPermissionBreakdown } from "../components/ToolPermissionBreakdown";
import { ToolRegistryPanel } from "../components/ToolRegistryPanel";
import type { DataSource } from "../api/commandcoreApi";
import { toolPermissionTone, type NavPage, type PageData, type ToolCentreData } from "../data/mockKernel";
import type { RouteSelection } from "../routing";

type ToolDashboardProps = {
  page: PageData;
  toolCentre: ToolCentreData;
  selection: RouteSelection;
  source: DataSource;
  sourceMessage?: string;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function ToolDashboard({ page, toolCentre, selection, source, sourceMessage, onNavigate }: ToolDashboardProps) {
  const selectedTool = selection.toolId
    ? toolCentre.tools.find((tool) => tool.toolId === selection.toolId)
    : undefined;
  const selectedInvocation = selectedTool
    ? [
        ...toolCentre.invocations.active,
        ...toolCentre.invocations.completed,
        ...toolCentre.invocations.failed,
      ].find((invocation) => invocation.toolId === selectedTool.toolId)
    : undefined;

  return (
    <div className="page-shell">
      <PageHeader page={page} />
      <SourceStrip source={source} sourceMessage={sourceMessage} status={page.status} label="Tool Link" />
      <SelectedContextBar label="Selected Tool Context" selection={selection} />

      <section className="metrics-grid">
        {page.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      {selection.toolId ? selectedTool ? (
        <RecordDetailPanel
          title={selectedTool.name}
          eyebrow={selectedTool.toolId}
          statusLabel={selectedTool.permissionLevel}
          statusTone={toolPermissionTone(selectedTool.permissionLevel)}
          summary={selectedTool.description}
          meta={[
            selectedTool.status,
            selectedTool.capabilityId ?? "no capability mapping",
            selectedInvocation ? `invocation ${selectedInvocation.status}` : "no invocation visible",
          ]}
          relatedLinks={[
            ...(selectedTool.agentId ? [{ label: "Open Tool Agent", page: "agents" as NavPage, selection: { agentId: selectedTool.agentId } }] : []),
            { label: "Open Tool Detail", page: "tools" as NavPage, selection: { toolId: selectedTool.toolId } },
          ]}
          onNavigate={onNavigate}
        />
      ) : (
        <div className="empty-state detail-empty-state">
          <strong>Tool Not Found</strong>
          <p>No tool matched `toolId={selection.toolId}` in the current live or seeded data.</p>
        </div>
      ) : null}

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
        <ToolRegistryPanel tools={toolCentre.tools} selectedToolId={selection.toolId} onNavigate={onNavigate} />
        <ToolInvocationHistoryPanel invocations={toolCentre.invocations} />
      </section>

      <HermesClawPreparationPanel counts={toolCentre.counts} invocationCounts={toolCentre.invocationCounts} />

      <EventFeed title={page.activityTitle} items={page.activity} emptyMessage={page.emptyState} />
    </div>
  );
}
