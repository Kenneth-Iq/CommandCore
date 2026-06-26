import { useMemo, useState } from "react";
import { BulkActionsBar } from "../components/BulkActionsBar";
import { EventFeed } from "../components/EventFeed";
import { FilterBar } from "../components/FilterBar";
import { FilterEmptyState } from "../components/FilterEmptyState";
import { ImpactAnalysisCard } from "../components/ImpactAnalysisCard";
import { InfoPanel } from "../components/InfoPanel";
import { MetricCard } from "../components/MetricCard";
import { MissionAgentAssignmentPanel } from "../components/MissionAgentAssignmentPanel";
import { MissionOutcomesPanel } from "../components/MissionOutcomesPanel";
import { MissionSectionList } from "../components/MissionSectionList";
import { MissionStatusBreakdown } from "../components/MissionStatusBreakdown";
import { MissionTimeline } from "../components/MissionTimeline";
import { PageHeader } from "../components/PageHeader";
import { RecordDetailPanel } from "../components/RecordDetailPanel";
import { RelationshipCard } from "../components/RelationshipCard";
import { RelationshipExplorer } from "../components/RelationshipExplorer";
import { SelectedContextBar } from "../components/SelectedContextBar";
import { SortControl, type SortDirection } from "../components/SortControl";
import { SourceStrip } from "../components/SourceStrip";
import type { DataSource } from "../api/commandcoreApi";
import { missionStatusTone, type ConversationCentreData, type MissionCentreData, type MissionRecord, type NavPage, type PageData } from "../data/mockKernel";
import type { KnowledgeCentreData } from "../data/nexusCentres";
import { pinSelected, textMatches, uniqueOptions } from "../filtering";
import { useFavourites, useSavedFilters } from "../operatorPrefs";
import type { RouteSelection } from "../routing";
import { buildImpactAnalysis, buildRelationshipCard, type WorldData } from "../worldModel";

type MissionDashboardProps = {
  page: PageData;
  missionCentre: MissionCentreData;
  conversationCentre: ConversationCentreData;
  knowledgeCentre: KnowledgeCentreData;
  world: WorldData;
  selection: RouteSelection;
  source: DataSource;
  sourceMessage?: string;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

type MissionFilterState = {
  agentId: string;
  capabilityId: string;
  workspaceId: string;
  projectId: string;
  favouritesOnly: boolean;
};

type MissionSavedFilters = {
  search: string;
  filters: MissionFilterState;
};

const emptyFilters: MissionFilterState = {
  agentId: "",
  capabilityId: "",
  workspaceId: "",
  projectId: "",
  favouritesOnly: false,
};

const sortOptions = [
  { value: "title", label: "Title" },
  { value: "status", label: "Status" },
  { value: "capabilityCount", label: "Capability Count" },
];

export function MissionDashboard({
  page,
  missionCentre,
  conversationCentre,
  knowledgeCentre,
  world,
  selection,
  source,
  sourceMessage,
  onNavigate,
}: MissionDashboardProps) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<MissionFilterState>(emptyFilters);
  const [sortBy, setSortBy] = useState("title");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());

  const { isFavourite, toggle: toggleFavourite } = useFavourites("mission");
  const { savedFilters, save: saveFilters, clear: clearSavedFilters } = useSavedFilters<MissionSavedFilters>("missions", { search: "", filters: emptyFilters });

  const missions = useMemo(
    () => [...missionCentre.active, ...missionCentre.completed, ...missionCentre.failed],
    [missionCentre],
  );
  const selectedMission = selection.missionId
    ? missions.find((mission) => mission.missionId === selection.missionId)
    : undefined;
  const selectedConversation = selectedMission
    ? conversationCentre.conversations.find((conversation) => conversation.missionId === selectedMission.missionId)
    : undefined;
  const selectedAsset = selectedMission
    ? knowledgeCentre.assets.find((asset) => asset.scopes.some((scope) => scope.kind === "mission" && scope.value === selectedMission.missionId))
    : undefined;
  const relationshipData = selection.missionId ? buildRelationshipCard("mission", selection.missionId, world) : undefined;

  const agentOptions = useMemo(() => uniqueOptions(missions.map((mission) => mission.assignedAgentId)), [missions]);
  const capabilityOptions = useMemo(() => uniqueOptions(missions.flatMap((mission) => mission.capabilityIds)), [missions]);
  const workspaceOptions = useMemo(() => uniqueOptions(missions.flatMap((mission) => mission.scope.filter((entry) => entry.startsWith("workspace:")).map((entry) => entry.replace("workspace:", "")))), [missions]);
  const projectOptions = useMemo(() => uniqueOptions(missions.flatMap((mission) => mission.scope.filter((entry) => entry.startsWith("project:")).map((entry) => entry.replace("project:", "")))), [missions]);

  function matchesFilters(mission: MissionRecord): boolean {
    if (!textMatches([mission.title, mission.missionId], search)) {
      return false;
    }
    if (filters.agentId && mission.assignedAgentId !== filters.agentId) {
      return false;
    }
    if (filters.capabilityId && !mission.capabilityIds.includes(filters.capabilityId)) {
      return false;
    }
    if (filters.workspaceId && !mission.scope.includes(`workspace:${filters.workspaceId}`)) {
      return false;
    }
    if (filters.projectId && !mission.scope.includes(`project:${filters.projectId}`)) {
      return false;
    }
    if (filters.favouritesOnly && !isFavourite(mission.missionId)) {
      return false;
    }
    return true;
  }

  function sortMissions(list: MissionRecord[]): MissionRecord[] {
    const sorted = [...list].sort((a, b) => {
      if (sortBy === "status") {
        return a.status.localeCompare(b.status);
      }
      if (sortBy === "capabilityCount") {
        return a.capabilityIds.length - b.capabilityIds.length;
      }
      return a.title.localeCompare(b.title);
    });
    return sortDirection === "asc" ? sorted : sorted.reverse();
  }

  function visibleBucket(bucket: MissionRecord[]): MissionRecord[] {
    const filtered = sortMissions(bucket.filter(matchesFilters));
    const belongsHere = selectedMission && bucket.some((mission) => mission.missionId === selectedMission.missionId);
    return belongsHere ? pinSelected(filtered, selectedMission, (mission) => mission.missionId) : filtered;
  }

  const activeVisible = visibleBucket(missionCentre.active);
  const completedVisible = visibleBucket(missionCentre.completed);
  const failedVisible = visibleBucket(missionCentre.failed);
  const visibleCount = activeVisible.length + completedVisible.length + failedVisible.length;
  const hasNoFilterMatches = missions.length > 0 && visibleCount === 0;

  function clearFilters() {
    setSearch("");
    setFilters(emptyFilters);
  }

  function toggleBulkSelected(missionId: string) {
    setBulkSelected((previous) => {
      const next = new Set(previous);
      if (next.has(missionId)) {
        next.delete(missionId);
      } else {
        next.add(missionId);
      }
      return next;
    });
  }

  function handleCopyIds() {
    const ids = Array.from(bulkSelected).join(", ");
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(ids);
    }
  }

  function handleExportJson() {
    const selectedRecords = missions.filter((mission) => bulkSelected.has(mission.missionId));
    const blob = new Blob([JSON.stringify(selectedRecords, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nexus-mission-selection.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-shell">
      <PageHeader page={page} />
      <SourceStrip source={source} sourceMessage={sourceMessage} status={page.status} label="Mission Link" />
      <SelectedContextBar label="Selected Mission Context" selection={selection} />

      <section className="metrics-grid">
        {page.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      {selection.missionId ? selectedMission ? (
        <RecordDetailPanel
          title={selectedMission.title}
          eyebrow={selectedMission.missionId}
          statusLabel={selectedMission.status}
          statusTone={missionStatusTone(selectedMission.status)}
          summary={selectedMission.resultSummary ?? selectedMission.failureReason ?? selectedMission.scope.join(" • ") ?? "Mission detail available."}
          meta={[
            selectedMission.assignedAgentId ? `agent ${selectedMission.assignedAgentId}` : "no assigned agent",
            `${selectedMission.capabilityIds.length} capabilities`,
            typeof selectedMission.taskCount === "number" ? `${selectedMission.taskCount} tasks` : "task count unavailable",
          ]}
          relatedLinks={[
            ...(selectedMission.assignedAgentId ? [{ label: "Open Assigned Agent", page: "agents" as NavPage, selection: { agentId: selectedMission.assignedAgentId } }] : []),
            ...(selectedConversation ? [{ label: "Open Related Conversation", page: "conversations" as NavPage, selection: { conversationId: selectedConversation.conversationId } }] : []),
            ...(selectedAsset ? [{ label: "Open Related Knowledge", page: "knowledge" as NavPage, selection: { assetId: selectedAsset.assetId } }] : []),
          ]}
          onNavigate={onNavigate}
        />
      ) : (
        <div className="empty-state detail-empty-state">
          <strong>Mission Not Found</strong>
          <p>No mission matched `missionId={selection.missionId}` in the current live or seeded data.</p>
        </div>
      ) : null}

      {relationshipData ? (
        <>
          <RelationshipCard data={relationshipData} onNavigate={onNavigate} />
          <ImpactAnalysisCard analysis={buildImpactAnalysis(relationshipData)} onNavigate={onNavigate} />
          <RelationshipExplorer centerLabel={selectedMission?.title ?? "Selected Mission"} data={relationshipData} onNavigate={onNavigate} />
        </>
      ) : null}

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

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search missions by title or ID"
        fields={[
          { id: "agentId", label: "Agent", value: filters.agentId, options: agentOptions.map((value) => ({ value, label: value })), onChange: (value) => setFilters((prev) => ({ ...prev, agentId: value })) },
          { id: "capabilityId", label: "Capability", value: filters.capabilityId, options: capabilityOptions.map((value) => ({ value, label: value })), onChange: (value) => setFilters((prev) => ({ ...prev, capabilityId: value })) },
          { id: "workspaceId", label: "Workspace", value: filters.workspaceId, options: workspaceOptions.map((value) => ({ value, label: value })), onChange: (value) => setFilters((prev) => ({ ...prev, workspaceId: value })) },
          { id: "projectId", label: "Project", value: filters.projectId, options: projectOptions.map((value) => ({ value, label: value })), onChange: (value) => setFilters((prev) => ({ ...prev, projectId: value })) },
          { id: "favouritesOnly", label: "Favourites", value: filters.favouritesOnly ? "yes" : "", options: [{ value: "yes", label: "Favourites Only" }], onChange: (value) => setFilters((prev) => ({ ...prev, favouritesOnly: value === "yes" })) },
        ]}
        visibleCount={visibleCount}
        totalCount={missions.length}
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
        <div className="route-chip-row">
          <button type="button" className="route-chip" onClick={() => saveFilters({ search, filters })}>
            Save Current Filters
          </button>
          <button
            type="button"
            className="route-chip"
            disabled={!savedFilters}
            onClick={() => {
              if (savedFilters) {
                setSearch(savedFilters.search);
                setFilters(savedFilters.filters);
              }
            }}
          >
            Load Saved Filters
          </button>
          <button type="button" className="route-chip" disabled={!savedFilters} onClick={clearSavedFilters}>
            Clear Saved Filters
          </button>
        </div>
      </div>

      <BulkActionsBar
        selectedIds={Array.from(bulkSelected)}
        onCopyIds={handleCopyIds}
        onExportJson={handleExportJson}
        onClear={() => setBulkSelected(new Set())}
      />

      {hasNoFilterMatches ? (
        <FilterEmptyState message="No missions match the current filters." onClear={clearFilters} />
      ) : (
        <section className="mission-status-grid">
          <MissionSectionList
            title="Active Missions"
            tone="active"
            records={activeVisible}
            conversationCentre={conversationCentre}
            knowledgeCentre={knowledgeCentre}
            selectedMissionId={selection.missionId}
            onNavigate={onNavigate}
            emptyMessage="No missions are currently active."
            isFavourite={isFavourite}
            onToggleFavourite={toggleFavourite}
            bulkSelectedIds={bulkSelected}
            onToggleBulk={toggleBulkSelected}
          />
          <MissionSectionList
            title="Completed Missions"
            tone="complete"
            records={completedVisible}
            conversationCentre={conversationCentre}
            knowledgeCentre={knowledgeCentre}
            selectedMissionId={selection.missionId}
            onNavigate={onNavigate}
            emptyMessage="No missions have completed yet."
            isFavourite={isFavourite}
            onToggleFavourite={toggleFavourite}
            bulkSelectedIds={bulkSelected}
            onToggleBulk={toggleBulkSelected}
          />
          <MissionSectionList
            title="Failed Missions"
            tone="warning"
            records={failedVisible}
            conversationCentre={conversationCentre}
            knowledgeCentre={knowledgeCentre}
            selectedMissionId={selection.missionId}
            onNavigate={onNavigate}
            emptyMessage="No mission failures recorded."
            isFavourite={isFavourite}
            onToggleFavourite={toggleFavourite}
            bulkSelectedIds={bulkSelected}
            onToggleBulk={toggleBulkSelected}
          />
        </section>
      )}

      <section className="mission-support-grid">
        <MissionAgentAssignmentPanel executions={missionCentre.executions} />
        <MissionOutcomesPanel completed={missionCentre.completed} failed={missionCentre.failed} />
      </section>

      <EventFeed title={page.activityTitle} items={page.activity} emptyMessage={page.emptyState} />
    </div>
  );
}
