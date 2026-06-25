import { AttentionPanel } from "../components/AttentionPanel";
import { EventFeed } from "../components/EventFeed";
import { InfoPanel } from "../components/InfoPanel";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { SourceStrip } from "../components/SourceStrip";
import type { DataSource } from "../api/commandcoreApi";
import type { ActivityItem, NavPage, PageData } from "../data/mockKernel";

type ExecutiveHomeProps = {
  page: PageData;
  pages: Record<NavPage, PageData>;
  source: DataSource;
  sourceMessage?: string;
};

export function ExecutiveHome({ page, pages, source, sourceMessage }: ExecutiveHomeProps) {
  const attentionItems = collectAttentionItems(pages);
  const activityItems = collectRecentActivity(pages);
  const missionRows = pages.missions.secondaryPanel.rows.slice(0, 3);
  const agentRows = pages.agents.secondaryPanel.rows.slice(0, 3);
  const toolRows = pages.tools.secondaryPanel.rows.slice(0, 3);
  const changeRows = [
    ...pages.conversations.primaryPanel.rows.slice(0, 2),
    ...pages.knowledge.primaryPanel.rows.slice(0, 2),
  ];

  return (
    <div className="page-shell">
      <PageHeader page={page} />
      <SourceStrip
        source={source}
        sourceMessage={sourceMessage}
        label="Executive Link"
        title={source === "live" ? "Live CommandCore operating picture" : "Mock operating picture in use"}
        status={page.status}
      />

      <section className="metrics-grid executive-home-metrics">
        {page.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="executive-home-grid">
        <AttentionPanel items={attentionItems} />
        <InfoPanel title="Active Missions" rows={missionRows} />
        <InfoPanel title="Agent Runtime" rows={agentRows} />
        <InfoPanel title="Tool Runtime" rows={toolRows} />
        <InfoPanel title="Conversation / Knowledge Changes" rows={changeRows} />
        <section className="panel surface availability-panel executive-availability-panel">
          <div className="panel-header">
            <div className="panel-title-stack">
              <h3>Kernel Availability</h3>
              <span>Second-monitor summary of governed runtime surfaces</span>
            </div>
          </div>
          <div className="availability-grid">
            {(page.availabilityGrid ?? []).map((item) => (
              <article key={item.name} className="availability-card">
                <div className="availability-card-header">
                  <strong>{item.name}</strong>
                  <span className={`status-badge ${item.available ? "tone-ready" : "tone-blocked"}`}>
                    {item.available ? "Up" : "Down"}
                  </span>
                </div>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <EventFeed title="Live Activity Feed" items={activityItems} emptyMessage={page.emptyState} />
    </div>
  );
}

function collectAttentionItems(pages: Record<NavPage, PageData>): ActivityItem[] {
  const healthWarnings = pages.health.activity.filter((item) => item.tone === "warning" || item.tone === "blocked");
  const missionFailures = pages.missions.activity.filter((item) => item.eventName.toLowerCase().includes("failed"));
  const toolFailures = pages.tools.activity.filter((item) => item.eventName.toLowerCase().includes("failed"));
  const agentFailures = pages.agents.activity.filter((item) => item.eventName.toLowerCase().includes("failed"));
  const policyBlocks = pages.executive.activity.filter((item) => {
    const name = item.eventName.toLowerCase();
    return name.includes("blocked") || (name.includes("policy") && (item.tone === "warning" || item.tone === "blocked"));
  });

  return [
    ...healthWarnings,
    ...missionFailures,
    ...toolFailures,
    ...agentFailures,
    ...policyBlocks,
  ].slice(0, 8);
}

function collectRecentActivity(pages: Record<NavPage, PageData>): ActivityItem[] {
  return [
    ...pages.kernel.activity,
    ...pages.missions.activity,
    ...pages.agents.activity,
    ...pages.tools.activity,
    ...pages.conversations.activity,
    ...pages.knowledge.activity,
    ...pages.executive.activity,
    ...pages.health.activity,
  ].filter((item) => item.eventName !== "NoRecentActivity").slice(0, 10);
}
