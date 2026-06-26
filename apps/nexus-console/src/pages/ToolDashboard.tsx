import { useMemo, useState } from "react";
import { EventFeed } from "../components/EventFeed";
import { FilterBar } from "../components/FilterBar";
import { FilterEmptyState } from "../components/FilterEmptyState";
import { HermesClawPreparationPanel } from "../components/HermesClawPreparationPanel";
import { InfoPanel } from "../components/InfoPanel";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { ImpactAnalysisCard } from "../components/ImpactAnalysisCard";
import { RelationshipCard } from "../components/RelationshipCard";
import { RelationshipExplorer } from "../components/RelationshipExplorer";
import { RecordDetailPanel } from "../components/RecordDetailPanel";
import { SelectedContextBar } from "../components/SelectedContextBar";
import { SourceStrip } from "../components/SourceStrip";
import { ToolInvocationHistoryPanel } from "../components/ToolInvocationHistoryPanel";
import { ToolInvocationSections } from "../components/ToolInvocationSections";
import { ToolMonitor } from "../components/ToolMonitor";
import { ToolPermissionBreakdown } from "../components/ToolPermissionBreakdown";
import { ToolRegistryPanel } from "../components/ToolRegistryPanel";
import type { DataSource } from "../api/commandcoreApi";
import { toolPermissionTone, type NavPage, type PageData, type ToolCentreData, type ToolRecord } from "../data/mockKernel";
import { pinSelected, textMatches, uniqueOptions } from "../filtering";
import type { RouteSelection } from "../routing";
import { buildImpactAnalysis, buildRelationshipCard, type WorldData } from "../worldModel";

type ToolDashboardProps = {
  page: PageData;
  toolCentre: ToolCentreData;
  world: WorldData;
  selection: RouteSelection;
  source: DataSource;
  sourceMessage?: string;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

type ToolFilterState = {
  permissionLevel: string;
  agentId: string;
  capabilityId: string;
};

const emptyFilters: ToolFilterState = {
  permissionLevel: "",
  agentId: "",
  capabilityId: "",
};

export function ToolDashboard({ page, toolCentre, world, selection, source, sourceMessage, onNavigate }: ToolDashboardProps) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ToolFilterState>(emptyFilters);

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
  const relationshipData = selection.toolId ? buildRelationshipCard("tool", selection.toolId, world) : undefined;

  const permissionOptions = useMemo(() => uniqueOptions(toolCentre.tools.map((tool) => tool.permissionLevel)), [toolCentre.tools]);
  const agentOptions = useMemo(() => uniqueOptions(toolCentre.tools.map((tool) => tool.agentId)), [toolCentre.tools]);
  const capabilityOptions = useMemo(() => uniqueOptions(toolCentre.tools.map((tool) => tool.capabilityId)), [toolCentre.tools]);

  function matchesFilters(tool: ToolRecord): boolean {
    if (!textMatches([tool.name, tool.toolId, tool.description], search)) {
      return false;
    }
    if (filters.permissionLevel && tool.permissionLevel !== filters.permissionLevel) {
      return false;
    }
    if (filters.agentId && tool.agentId !== filters.agentId) {
      return false;
    }
    if (filters.capabilityId && tool.capabilityId !== filters.capabilityId) {
      return false;
    }
    return true;
  }

  const visibleTools = pinSelected(toolCentre.tools.filter(matchesFilters), selectedTool, (tool) => tool.toolId);
  const hasNoFilterMatches = toolCentre.tools.length > 0 && visibleTools.length === 0;

  function clearFilters() {
    setSearch("");
    setFilters(emptyFilters);
  }

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

      {relationshipData ? (
        <>
          <RelationshipCard data={relationshipData} onNavigate={onNavigate} />
          <ImpactAnalysisCard analysis={buildImpactAnalysis(relationshipData)} onNavigate={onNavigate} />
          <RelationshipExplorer centerLabel={selectedTool?.name ?? "Selected Tool"} data={relationshipData} onNavigate={onNavigate} />
        </>
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

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tools by name, ID, or description"
        fields={[
          { id: "permissionLevel", label: "Permission", value: filters.permissionLevel, options: permissionOptions.map((value) => ({ value, label: value })), onChange: (value) => setFilters((prev) => ({ ...prev, permissionLevel: value })) },
          { id: "agentId", label: "Agent", value: filters.agentId, options: agentOptions.map((value) => ({ value, label: value })), onChange: (value) => setFilters((prev) => ({ ...prev, agentId: value })) },
          { id: "capabilityId", label: "Capability", value: filters.capabilityId, options: capabilityOptions.map((value) => ({ value, label: value })), onChange: (value) => setFilters((prev) => ({ ...prev, capabilityId: value })) },
        ]}
        visibleCount={visibleTools.length}
        totalCount={toolCentre.tools.length}
        onClear={clearFilters}
      />

      <section className="mission-support-grid">
        {hasNoFilterMatches ? (
          <FilterEmptyState message="No tools match the current filters." onClear={clearFilters} />
        ) : (
          <ToolRegistryPanel tools={visibleTools} selectedToolId={selection.toolId} onNavigate={onNavigate} />
        )}
        <ToolInvocationHistoryPanel invocations={toolCentre.invocations} />
      </section>

      <HermesClawPreparationPanel counts={toolCentre.counts} invocationCounts={toolCentre.invocationCounts} />

      <EventFeed title={page.activityTitle} items={page.activity} emptyMessage={page.emptyState} />
    </div>
  );
}
