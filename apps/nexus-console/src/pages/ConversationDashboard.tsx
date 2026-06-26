import { ConversationContextPanel } from "../components/ConversationContextPanel";
import { ConversationInspector } from "../components/ConversationInspector";
import { ConversationKnowledgePanel } from "../components/ConversationKnowledgePanel";
import { ConversationThreadListPanel } from "../components/ConversationThreadListPanel";
import { EventFeed } from "../components/EventFeed";
import { InfoPanel } from "../components/InfoPanel";
import { JarvisIntegrationPlaceholder } from "../components/JarvisIntegrationPlaceholder";
import { MessagePreviewPanel } from "../components/MessagePreviewPanel";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { RecordDetailPanel } from "../components/RecordDetailPanel";
import { SelectedContextBar } from "../components/SelectedContextBar";
import { SourceStrip } from "../components/SourceStrip";
import type { DataSource } from "../api/commandcoreApi";
import type { ConversationCentreData, NavPage, PageData } from "../data/mockKernel";
import type { RouteSelection } from "../routing";

type ConversationDashboardProps = {
  page: PageData;
  conversationCentre: ConversationCentreData;
  selection: RouteSelection;
  source: DataSource;
  sourceMessage?: string;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function ConversationDashboard({ page, conversationCentre, selection, source, sourceMessage, onNavigate }: ConversationDashboardProps) {
  const selectedConversation = selection.conversationId
    ? conversationCentre.conversations.find((conversation) => conversation.conversationId === selection.conversationId)
    : undefined;
  const selectedThread = selectedConversation
    ? conversationCentre.threads.find((thread) => thread.conversationId === selectedConversation.conversationId)
    : undefined;
  const selectedKnowledgeLink = selectedConversation
    ? conversationCentre.knowledgeLinks.find((link) => link.conversationId === selectedConversation.conversationId)
    : undefined;

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

      <section className="operations-layout">
        <ConversationInspector page={page} />
        <InfoPanel title={page.primaryPanel.title} rows={page.primaryPanel.rows} />
        <InfoPanel title={page.secondaryPanel.title} rows={page.secondaryPanel.rows} />
      </section>

      <ConversationThreadListPanel
        conversations={conversationCentre.conversations}
        threads={conversationCentre.threads}
        selectedConversationId={selection.conversationId}
        onNavigate={onNavigate}
      />

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
