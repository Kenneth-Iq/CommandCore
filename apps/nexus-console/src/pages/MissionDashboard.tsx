import { EventFeed } from "../components/EventFeed";
import { InfoPanel } from "../components/InfoPanel";
import { MetricCard } from "../components/MetricCard";
import { MissionAgentAssignmentPanel } from "../components/MissionAgentAssignmentPanel";
import { MissionOutcomesPanel } from "../components/MissionOutcomesPanel";
import { MissionSectionList } from "../components/MissionSectionList";
import { MissionStatusBreakdown } from "../components/MissionStatusBreakdown";
import { MissionTimeline } from "../components/MissionTimeline";
import { PageHeader } from "../components/PageHeader";
import { RecordDetailPanel } from "../components/RecordDetailPanel";
import { SelectedContextBar } from "../components/SelectedContextBar";
import { SourceStrip } from "../components/SourceStrip";
import type { DataSource } from "../api/commandcoreApi";
import { missionStatusTone, type ConversationCentreData, type MissionCentreData, type NavPage, type PageData } from "../data/mockKernel";
import type { KnowledgeCentreData } from "../data/nexusCentres";
import type { RouteSelection } from "../routing";

type MissionDashboardProps = {
  page: PageData;
  missionCentre: MissionCentreData;
  conversationCentre: ConversationCentreData;
  knowledgeCentre: KnowledgeCentreData;
  selection: RouteSelection;
  source: DataSource;
  sourceMessage?: string;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function MissionDashboard({
  page,
  missionCentre,
  conversationCentre,
  knowledgeCentre,
  selection,
  source,
  sourceMessage,
  onNavigate,
}: MissionDashboardProps) {
  const missions = [...missionCentre.active, ...missionCentre.completed, ...missionCentre.failed];
  const selectedMission = selection.missionId
    ? missions.find((mission) => mission.missionId === selection.missionId)
    : undefined;
  const selectedConversation = selectedMission
    ? conversationCentre.conversations.find((conversation) => conversation.missionId === selectedMission.missionId)
    : undefined;
  const selectedAsset = selectedMission
    ? knowledgeCentre.assets.find((asset) => asset.scopes.some((scope) => scope.kind === "mission" && scope.value === selectedMission.missionId))
    : undefined;

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
          conversationCentre={conversationCentre}
          knowledgeCentre={knowledgeCentre}
          selectedMissionId={selection.missionId}
          onNavigate={onNavigate}
          emptyMessage="No missions are currently active."
        />
        <MissionSectionList
          title="Completed Missions"
          tone="complete"
          records={missionCentre.completed}
          conversationCentre={conversationCentre}
          knowledgeCentre={knowledgeCentre}
          selectedMissionId={selection.missionId}
          onNavigate={onNavigate}
          emptyMessage="No missions have completed yet."
        />
        <MissionSectionList
          title="Failed Missions"
          tone="warning"
          records={missionCentre.failed}
          conversationCentre={conversationCentre}
          knowledgeCentre={knowledgeCentre}
          selectedMissionId={selection.missionId}
          onNavigate={onNavigate}
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
