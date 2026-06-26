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
import { SourceStrip } from "../components/SourceStrip";
import type { DataSource } from "../api/commandcoreApi";
import type { ConversationCentreData, PageData } from "../data/mockKernel";

type ConversationDashboardProps = {
  page: PageData;
  conversationCentre: ConversationCentreData;
  source: DataSource;
  sourceMessage?: string;
};

export function ConversationDashboard({ page, conversationCentre, source, sourceMessage }: ConversationDashboardProps) {
  return (
    <div className="page-shell">
      <PageHeader page={page} />
      <SourceStrip source={source} sourceMessage={sourceMessage} status={page.status} label="Conversation Link" />

      <section className="metrics-grid">
        {page.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="operations-layout">
        <ConversationInspector page={page} />
        <InfoPanel title={page.primaryPanel.title} rows={page.primaryPanel.rows} />
        <InfoPanel title={page.secondaryPanel.title} rows={page.secondaryPanel.rows} />
      </section>

      <ConversationThreadListPanel
        conversations={conversationCentre.conversations}
        threads={conversationCentre.threads}
      />

      <section className="mission-support-grid">
        <MessagePreviewPanel messages={conversationCentre.messages} />
        <ConversationKnowledgePanel knowledgeLinks={conversationCentre.knowledgeLinks} />
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
