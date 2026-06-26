import { useMemo, useState } from "react";
import { AgentAssignmentHistoryPanel } from "../components/AgentAssignmentHistoryPanel";
import { AgentCapabilityPanel } from "../components/AgentCapabilityPanel";
import { AgentProfilePanel } from "../components/AgentProfilePanel";
import { AgentStatusGrid } from "../components/AgentStatusGrid";
import { AgentStatusSections } from "../components/AgentStatusSections";
import { EventFeed } from "../components/EventFeed";
import { FilterBar } from "../components/FilterBar";
import { FilterEmptyState } from "../components/FilterEmptyState";
import { InfoPanel } from "../components/InfoPanel";
import { MetricCard } from "../components/MetricCard";
import { MissionAgentAssignmentPanel } from "../components/MissionAgentAssignmentPanel";
import { PageHeader } from "../components/PageHeader";
import { ImpactAnalysisCard } from "../components/ImpactAnalysisCard";
import { RelationshipCard } from "../components/RelationshipCard";
import { EntityEvidencePanel } from "../components/EntityEvidencePanel";
import { RelationshipExplorer } from "../components/RelationshipExplorer";
import { RecordDetailPanel } from "../components/RecordDetailPanel";
import { SelectedContextBar } from "../components/SelectedContextBar";
import { SortControl, type SortDirection } from "../components/SortControl";
import { SourceStrip } from "../components/SourceStrip";
import type { DataSource } from "../api/commandcoreApi";
import { agentRuntimeTone, type AgentCentreData, type AgentProfile, type NavPage, type PageData } from "../data/mockKernel";
import { pinSelected, textMatches, uniqueOptions } from "../filtering";
import { useFavourites, useWatchlist } from "../operatorPrefs";
import type { RouteSelection } from "../routing";
import { useRuntimeContext } from "../runtimeContext";
import { buildImpactAnalysis, buildRelationshipCard, type WorldData } from "../worldModel";

type AgentDashboardProps = {
  page: PageData;
  agentCentre: AgentCentreData;
  world: WorldData;
  selection: RouteSelection;
  source: DataSource;
  sourceMessage?: string;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

type AgentFilterState = {
  runtimeStatus: string;
  capabilityId: string;
  favouritesOnly: boolean;
};

const emptyFilters: AgentFilterState = {
  runtimeStatus: "",
  capabilityId: "",
  favouritesOnly: false,
};

const sortOptions = [
  { value: "name", label: "Name" },
  { value: "runtimeStatus", label: "Status" },
  { value: "capabilityCount", label: "Capability Count" },
];

export function AgentDashboard({ page, agentCentre, world, selection, source, sourceMessage, onNavigate }: AgentDashboardProps) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<AgentFilterState>(emptyFilters);
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const { isFavourite, toggle: toggleFavourite } = useFavourites("agent");
  const { isWatched, add: addToWatchlist, remove: removeFromWatchlist } = useWatchlist();

  const failedAgentIds = new Set(agentCentre.executions.failed.map((execution) => execution.agentId));
  const selectedAgent = selection.agentId
    ? agentCentre.profiles.find((agent) => agent.agentId === selection.agentId)
    : undefined;
  const selectedAssignment = selectedAgent
    ? agentCentre.assignments.find((assignment) => assignment.agentId === selectedAgent.agentId)
    : undefined;
  const relationshipData = selection.agentId ? buildRelationshipCard("agent", selection.agentId, world) : undefined;
  const { evidenceRegistry } = useRuntimeContext();

  const statusOptions = useMemo(() => uniqueOptions(agentCentre.profiles.map((agent) => agent.runtimeStatus)), [agentCentre.profiles]);
  const capabilityOptions = useMemo(() => uniqueOptions(agentCentre.profiles.flatMap((agent) => agent.capabilityIds)), [agentCentre.profiles]);

  function matchesFilters(agent: AgentProfile): boolean {
    if (!textMatches([agent.name, agent.agentId, agent.role], search)) {
      return false;
    }
    if (filters.runtimeStatus && agent.runtimeStatus !== filters.runtimeStatus) {
      return false;
    }
    if (filters.capabilityId && !agent.capabilityIds.includes(filters.capabilityId)) {
      return false;
    }
    if (filters.favouritesOnly && !isFavourite(agent.agentId)) {
      return false;
    }
    return true;
  }

  function sortAgents(list: AgentProfile[]): AgentProfile[] {
    const sorted = [...list].sort((a, b) => {
      if (sortBy === "runtimeStatus") {
        return a.runtimeStatus.localeCompare(b.runtimeStatus);
      }
      if (sortBy === "capabilityCount") {
        return a.capabilityIds.length - b.capabilityIds.length;
      }
      return a.name.localeCompare(b.name);
    });
    return sortDirection === "asc" ? sorted : sorted.reverse();
  }

  const visibleProfiles = pinSelected(
    sortAgents(agentCentre.profiles.filter(matchesFilters)),
    selectedAgent,
    (agent) => agent.agentId,
  );
  const hasNoFilterMatches = agentCentre.profiles.length > 0 && visibleProfiles.length === 0;

  const activeAgents = visibleProfiles.filter((agent) => agent.runtimeStatus === "busy");
  const idleAgents = visibleProfiles.filter((agent) => agent.runtimeStatus === "available");
  const failedAgents = visibleProfiles.filter((agent) => failedAgentIds.has(agent.agentId));

  function clearFilters() {
    setSearch("");
    setFilters(emptyFilters);
  }

  return (
    <div className="page-shell">
      <PageHeader page={page} />
      <SourceStrip source={source} sourceMessage={sourceMessage} status={page.status} label="Agent Link" />
      <SelectedContextBar label="Selected Agent Context" selection={selection} />

      <section className="metrics-grid">
        {page.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      {selection.agentId ? selectedAgent ? (
        <RecordDetailPanel
          title={selectedAgent.name}
          eyebrow={selectedAgent.agentId}
          statusLabel={selectedAgent.runtimeStatus}
          statusTone={agentRuntimeTone(selectedAgent.runtimeStatus)}
          summary={selectedAgent.stateSummary ?? `${selectedAgent.role} agent profile.`}
          meta={[
            selectedAgent.role,
            `${selectedAgent.capabilityIds.length} capabilities`,
            `${selectedAgent.missionQueue.length} queued missions`,
          ]}
          relatedLinks={[
            ...(selectedAgent.missionQueue[0] ? [{ label: "Open Current Mission", page: "missions" as NavPage, selection: { missionId: selectedAgent.missionQueue[0] } }] : []),
            ...(selectedAssignment?.missionId ? [{ label: "Open Assignment Mission", page: "missions" as NavPage, selection: { missionId: selectedAssignment.missionId } }] : []),
          ]}
          onNavigate={onNavigate}
          isPinned={isWatched(`agent-${selectedAgent.agentId}`)}
          onTogglePin={() => {
            const watchId = `agent-${selectedAgent.agentId}`;
            if (isWatched(watchId)) {
              removeFromWatchlist(watchId);
            } else {
              addToWatchlist({ id: watchId, label: selectedAgent.name, page: "agents", selection: { agentId: selectedAgent.agentId } });
            }
          }}
        />
      ) : (
        <div className="empty-state detail-empty-state">
          <strong>Agent Not Found</strong>
          <p>No agent matched `agentId={selection.agentId}` in the current live or seeded data.</p>
        </div>
      ) : null}

      {relationshipData ? (
        <>
          <RelationshipCard data={relationshipData} onNavigate={onNavigate} />
          <ImpactAnalysisCard analysis={buildImpactAnalysis(relationshipData)} onNavigate={onNavigate} />
          <RelationshipExplorer centerLabel={selectedAgent?.name ?? "Selected Agent"} data={relationshipData} onNavigate={onNavigate} />
          <EntityEvidencePanel registry={evidenceRegistry} selection={selection} impactAnalysis={buildImpactAnalysis(relationshipData)} relationshipData={relationshipData} onNavigate={onNavigate} />
        </>
      ) : null}

      <section className="operations-layout">
        <AgentStatusGrid page={page} />
        <InfoPanel title={page.primaryPanel.title} rows={page.primaryPanel.rows} />
        <InfoPanel title={page.secondaryPanel.title} rows={page.secondaryPanel.rows} />
      </section>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search agents by name, ID, or role"
        fields={[
          { id: "runtimeStatus", label: "Status", value: filters.runtimeStatus, options: statusOptions.map((value) => ({ value, label: value })), onChange: (value) => setFilters((prev) => ({ ...prev, runtimeStatus: value })) },
          { id: "capabilityId", label: "Capability", value: filters.capabilityId, options: capabilityOptions.map((value) => ({ value, label: value })), onChange: (value) => setFilters((prev) => ({ ...prev, capabilityId: value })) },
          { id: "favouritesOnly", label: "Favourites", value: filters.favouritesOnly ? "yes" : "", options: [{ value: "yes", label: "Favourites Only" }], onChange: (value) => setFilters((prev) => ({ ...prev, favouritesOnly: value === "yes" })) },
        ]}
        visibleCount={visibleProfiles.length}
        totalCount={agentCentre.profiles.length}
        onClear={clearFilters}
      />

      <div className="filter-toolbar-row">
        <SortControl
          options={sortOptions}
          value={sortBy}
          direction={sortDirection}
          onChange={setSortBy}
          onToggleDirection={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
        />
      </div>

      {hasNoFilterMatches ? (
        <FilterEmptyState message="No agents match the current filters." onClear={clearFilters} />
      ) : (
        <>
          <AgentStatusSections active={activeAgents} idle={idleAgents} failed={failedAgents} />
          <AgentProfilePanel
            profiles={visibleProfiles}
            selectedAgentId={selection.agentId}
            onNavigate={onNavigate}
            isFavourite={isFavourite}
            onToggleFavourite={toggleFavourite}
          />
        </>
      )}

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
