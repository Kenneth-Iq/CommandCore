import { useMemo, useState } from "react";
import { ConversationContextPanel } from "../components/ConversationContextPanel";
import { ConversationInspector } from "../components/ConversationInspector";
import { ConversationKnowledgePanel } from "../components/ConversationKnowledgePanel";
import { ConversationThreadListPanel } from "../components/ConversationThreadListPanel";
import { EventFeed } from "../components/EventFeed";
import { FilterBar } from "../components/FilterBar";
import { FilterEmptyState } from "../components/FilterEmptyState";
import { InfoPanel } from "../components/InfoPanel";
import { JarvisIntegrationPlaceholder } from "../components/JarvisIntegrationPlaceholder";
import { MessagePreviewPanel } from "../components/MessagePreviewPanel";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { RelationshipCard } from "../components/RelationshipCard";
import { RecordDetailPanel } from "../components/RecordDetailPanel";
import { SelectedContextBar } from "../components/SelectedContextBar";
import { SourceStrip } from "../components/SourceStrip";
import type { DataSource } from "../api/commandcoreApi";
import type { ConversationCentreData, ConversationRecord, NavPage, PageData } from "../data/mockKernel";
import { pinSelected, textMatches, uniqueOptions } from "../filtering";
import type { RouteSelection } from "../routing";
import { buildRelationshipCard, type WorldData } from "../worldModel";

type ConversationDashboardProps = {
  page: PageData;
  conversationCentre: ConversationCentreData;
  world: WorldData;
  selection: RouteSelection;
  source: DataSource;
  sourceMessage?: string;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

type ConversationFilterState = {
  workspaceId: string;
  companyId: string;
  projectId: string;
  missionId: string;
};

const emptyFilters: ConversationFilterState = {
  workspaceId: "",
  companyId: "",
  projectId: "",
  missionId: "",
};

export function ConversationDashboard({ page, conversationCentre, world, selection, source, sourceMessage, onNavigate }: ConversationDashboardProps) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ConversationFilterState>(emptyFilters);

  const selectedConversation = selection.conversationId
    ? conversationCentre.conversations.find((conversation) => conversation.conversationId === selection.conversationId)
    : undefined;
  const selectedThread = selectedConversation
    ? conversationCentre.threads.find((thread) => thread.conversationId === selectedConversation.conversationId)
    : undefined;
  const selectedKnowledgeLink = selectedConversation
    ? conversationCentre.knowledgeLinks.find((link) => link.conversationId === selectedConversation.conversationId)
    : undefined;
  const relationshipData = selection.conversationId ? buildRelationshipCard("conversation", selection.conversationId, world) : undefined;

  const workspaceOptions = useMemo(() => uniqueOptions(conversationCentre.conversations.map((conversation) => conversation.workspaceId)), [conversationCentre.conversations]);
  const companyOptions = useMemo(() => uniqueOptions(conversationCentre.conversations.map((conversation) => conversation.companyId)), [conversationCentre.conversations]);
  const projectOptions = useMemo(() => uniqueOptions(conversationCentre.conversations.map((conversation) => conversation.projectId)), [conversationCentre.conversations]);
  const missionOptions = useMemo(() => uniqueOptions(conversationCentre.conversations.map((conversation) => conversation.missionId)), [conversationCentre.conversations]);

  function matchesFilters(conversation: ConversationRecord): boolean {
    if (!textMatches([conversation.conversationId, ...conversation.participantIds], search)) {
      return false;
    }
    if (filters.workspaceId && conversation.workspaceId !== filters.workspaceId) {
      return false;
    }
    if (filters.companyId && conversation.companyId !== filters.companyId) {
      return false;
    }
    if (filters.projectId && conversation.projectId !== filters.projectId) {
      return false;
    }
    if (filters.missionId && conversation.missionId !== filters.missionId) {
      return false;
    }
    return true;
  }

  const visibleConversations = pinSelected(
    conversationCentre.conversations.filter(matchesFilters),
    selectedConversation,
    (conversation) => conversation.conversationId,
  );
  const hasNoFilterMatches = conversationCentre.conversations.length > 0 && visibleConversations.length === 0;

  function clearFilters() {
    setSearch("");
    setFilters(emptyFilters);
  }

  return (
    <div className="page-shell">
      <PageHeader page={page} />
      <SourceStrip source={source} sourceMessage={sourceMessage} status={page.status} label="Conversation Link" />
      <SelectedContextBar label="Selected Conversation Context" selection={selection} />

      <section className="metrics-grid">
        {page.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      {selection.conversationId ? selectedConversation ? (
        <RecordDetailPanel
          title={selectedConversation.conversationId}
          eyebrow={selectedThread?.threadId ?? "conversation detail"}
          statusLabel="linked"
          statusTone="active"
          summary={selectedConversation.missionId ?? selectedConversation.projectId ?? selectedConversation.workspaceId ?? "Conversation record available."}
          meta={[
            `${selectedConversation.participantIds.length} participants`,
            selectedConversation.missionId ?? "no mission link",
            selectedKnowledgeLink?.knowledgeAssetId ?? "no knowledge link",
          ]}
          relatedLinks={[
            ...(selectedConversation.missionId ? [{ label: "Open Related Mission", page: "missions" as NavPage, selection: { missionId: selectedConversation.missionId } }] : []),
            ...(selectedKnowledgeLink ? [{ label: "Open Related Knowledge", page: "knowledge" as NavPage, selection: { assetId: selectedKnowledgeLink.knowledgeAssetId } }] : []),
            ...(selectedConversation.projectId ? [{ label: "Open Related Project", page: "workspaces" as NavPage, selection: { projectId: selectedConversation.projectId } }] : []),
            ...(selectedConversation.workspaceId ? [{ label: "Open Related Workspace", page: "workspaces" as NavPage, selection: { workspaceId: selectedConversation.workspaceId } }] : []),
          ]}
          onNavigate={onNavigate}
        />
      ) : (
        <div className="empty-state detail-empty-state">
          <strong>Conversation Not Found</strong>
          <p>No conversation matched `conversationId={selection.conversationId}` in the current live or seeded data.</p>
        </div>
      ) : null}

      {relationshipData ? <RelationshipCard data={relationshipData} onNavigate={onNavigate} /> : null}

      <section className="operations-layout">
        <ConversationInspector page={page} />
        <InfoPanel title={page.primaryPanel.title} rows={page.primaryPanel.rows} />
        <InfoPanel title={page.secondaryPanel.title} rows={page.secondaryPanel.rows} />
      </section>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search conversations by ID or participant"
        fields={[
          { id: "workspaceId", label: "Workspace", value: filters.workspaceId, options: workspaceOptions.map((value) => ({ value, label: value })), onChange: (value) => setFilters((prev) => ({ ...prev, workspaceId: value })) },
          { id: "companyId", label: "Company", value: filters.companyId, options: companyOptions.map((value) => ({ value, label: value })), onChange: (value) => setFilters((prev) => ({ ...prev, companyId: value })) },
          { id: "projectId", label: "Project", value: filters.projectId, options: projectOptions.map((value) => ({ value, label: value })), onChange: (value) => setFilters((prev) => ({ ...prev, projectId: value })) },
          { id: "missionId", label: "Mission", value: filters.missionId, options: missionOptions.map((value) => ({ value, label: value })), onChange: (value) => setFilters((prev) => ({ ...prev, missionId: value })) },
        ]}
        visibleCount={visibleConversations.length}
        totalCount={conversationCentre.conversations.length}
        onClear={clearFilters}
      />

      {hasNoFilterMatches ? (
        <FilterEmptyState message="No conversations match the current filters." onClear={clearFilters} />
      ) : (
        <ConversationThreadListPanel
          conversations={visibleConversations}
          threads={conversationCentre.threads}
          selectedConversationId={selection.conversationId}
          onNavigate={onNavigate}
        />
      )}

      <section className="mission-support-grid">
        <MessagePreviewPanel messages={conversationCentre.messages} />
        <ConversationKnowledgePanel knowledgeLinks={conversationCentre.knowledgeLinks} onNavigate={onNavigate} />
      </section>

      <ConversationContextPanel
        contexts={conversationCentre.contexts}
        availability={conversationCentre.contextAvailability}
      />

      <JarvisIntegrationPlaceholder />

      <EventFeed title={page.activityTitle} items={page.activity} emptyMessage={page.emptyState} />
    </div>
  );
}
