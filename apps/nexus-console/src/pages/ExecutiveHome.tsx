import { AttentionCentre } from "../components/AttentionCentre";
import { MetricCard } from "../components/MetricCard";
import { OperationalTimeline } from "../components/OperationalTimeline";
import { PageHeader } from "../components/PageHeader";
import { SourceStrip } from "../components/SourceStrip";
import { StatusBadge } from "../components/StatusBadge";
import type { DataSource } from "../api/commandcoreApi";
import type {
  ActivityItem,
  AgentCentreData,
  ConversationCentreData,
  MissionCentreData,
  NavPage,
  PageData,
  ToolCentreData,
  MetricCard as MetricCardRecord,
} from "../data/mockKernel";
import type { KnowledgeCentreData, PortfolioExplorerData } from "../data/nexusCentres";

type ExecutiveHomeProps = {
  page: PageData;
  pages: Record<NavPage, PageData>;
  missionCentre: MissionCentreData;
  agentCentre: AgentCentreData;
  toolCentre: ToolCentreData;
  conversationCentre: ConversationCentreData;
  knowledgeCentre: KnowledgeCentreData;
  portfolioExplorer: PortfolioExplorerData;
  source: DataSource;
  sourceMessage?: string;
  onNavigate: (page: NavPage) => void;
};

type RoutedActivity = ActivityItem & {
  page: NavPage;
  category: string;
};

type RoutedAttention = RoutedActivity & {
  group: "Critical" | "Warning" | "Info" | "Completed";
};

export function ExecutiveHome({
  page,
  pages,
  missionCentre,
  agentCentre,
  toolCentre,
  conversationCentre,
  knowledgeCentre,
  portfolioExplorer,
  source,
  sourceMessage,
  onNavigate,
}: ExecutiveHomeProps) {
  const systemMetrics = buildExecutiveMetrics(page, missionCentre, agentCentre, toolCentre, conversationCentre, knowledgeCentre, portfolioExplorer);
  const attentionItems = collectAttentionItems(pages);
  const timelineItems = collectTimelineItems(pages);
  const activeMission = missionCentre.active[0];
  const activeAgent = agentCentre.profiles.find((agent) => agent.runtimeStatus === "busy") ?? agentCentre.profiles[0];
  const activeTool = toolCentre.tools[0];
  const leadConversation = conversationCentre.conversations[0];
  const leadWorkspace = portfolioExplorer.workspaces[0];
  const leadProject = portfolioExplorer.projects[0];
  const latestKnowledge = knowledgeCentre.assets[0];

  return (
    <div className="page-shell executive-home-shell">
      <PageHeader page={page} />
      <SourceStrip
        source={source}
        sourceMessage={sourceMessage}
        label="Operating Picture"
        title={source === "live" ? "Live executive operating system view" : "Seeded executive operating system view"}
        status={page.status}
      />

      <section className="metrics-grid executive-summary-band executive-system-metrics">
        {systemMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="executive-os-grid">
        <article className="panel surface executive-system-board">
          <div className="panel-header">
            <div className="panel-title-stack">
              <h3>Global System Status</h3>
              <span>Kernel posture, runtime readiness, and the current operating mix in one glance.</span>
            </div>
          </div>
          <div className="executive-status-grid">
            <article className="executive-status-card">
              <div className="knowledge-card-header">
                <strong>Kernel Health</strong>
                <StatusBadge tone={pages.kernel.status.tone}>{pages.kernel.status.label}</StatusBadge>
              </div>
              <p>{pages.kernel.description}</p>
              <button type="button" className="route-chip" onClick={() => onNavigate("health")}>Open Health</button>
            </article>
            <article className="executive-status-card">
              <div className="knowledge-card-header">
                <strong>Readiness</strong>
                <StatusBadge tone={pages.health.status.tone}>{pages.health.status.label}</StatusBadge>
              </div>
              <p>{pages.health.primaryPanel.rows[0]?.subtitle ?? "Readiness data available."}</p>
              <button type="button" className="route-chip" onClick={() => onNavigate("health")}>Review Readiness</button>
            </article>
            <article className="executive-status-card">
              <div className="knowledge-card-header">
                <strong>Operating Estate</strong>
                <StatusBadge tone="active">Portfolio</StatusBadge>
              </div>
              <p>
                {portfolioExplorer.workspaces.length} workspaces / {portfolioExplorer.companies.length} companies / {portfolioExplorer.projects.length} projects
              </p>
              <button type="button" className="route-chip" onClick={() => onNavigate("workspaces")}>Open Portfolio</button>
            </article>
          </div>
        </article>

        <article className="panel surface executive-runtime-board">
          <div className="panel-header">
            <div className="panel-title-stack">
              <h3>Executive Runtime Mesh</h3>
              <span>Active missions, agents, tools, conversations, knowledge changes, and portfolio context.</span>
            </div>
          </div>
          <div className="executive-runtime-cards">
            <button type="button" className="executive-runtime-card" onClick={() => onNavigate("missions")}>
              <div className="knowledge-card-header">
                <strong>Active Missions</strong>
                <StatusBadge tone="active">{missionCentre.counts.active}</StatusBadge>
              </div>
              <p>{activeMission ? `${activeMission.title} • ${activeMission.missionId}` : "No active mission records."}</p>
            </button>
            <button type="button" className="executive-runtime-card" onClick={() => onNavigate("agents")}>
              <div className="knowledge-card-header">
                <strong>Active Agents</strong>
                <StatusBadge tone="ready">{agentCentre.counts.busy}</StatusBadge>
              </div>
              <p>{activeAgent ? `${activeAgent.name} • ${activeAgent.runtimeStatus}` : "No active agent records."}</p>
            </button>
            <button type="button" className="executive-runtime-card" onClick={() => onNavigate("tools")}>
              <div className="knowledge-card-header">
                <strong>Active Tools</strong>
                <StatusBadge tone="warning">{toolCentre.invocationCounts.running}</StatusBadge>
              </div>
              <p>{activeTool ? `${activeTool.name} • ${activeTool.permissionLevel}` : "No tool records published."}</p>
            </button>
            <button type="button" className="executive-runtime-card" onClick={() => onNavigate("conversations")}>
              <div className="knowledge-card-header">
                <strong>Active Conversations</strong>
                <StatusBadge tone="idle">{conversationCentre.counts.conversations}</StatusBadge>
              </div>
              <p>{leadConversation ? `${leadConversation.conversationId} • ${leadConversation.participantIds.join(", ")}` : "No conversation records published."}</p>
            </button>
            <button type="button" className="executive-runtime-card" onClick={() => onNavigate("knowledge")}>
              <div className="knowledge-card-header">
                <strong>Knowledge Changes</strong>
                <StatusBadge tone="complete">{knowledgeCentre.assets.length}</StatusBadge>
              </div>
              <p>{latestKnowledge ? `${latestKnowledge.title} • ${latestKnowledge.relationshipCount} links` : "No knowledge asset updates visible."}</p>
            </button>
            <button type="button" className="executive-runtime-card" onClick={() => onNavigate("workspaces")}>
              <div className="knowledge-card-header">
                <strong>Company / Project / Workspace</strong>
                <StatusBadge tone="active">Mapped</StatusBadge>
              </div>
              <p>{leadWorkspace && leadProject ? `${leadWorkspace.name} • ${leadProject.name}` : "Portfolio summary not populated yet."}</p>
            </button>
          </div>
        </article>
      </section>

      <AttentionCentre items={attentionItems} onNavigate={onNavigate} />

      <section className="executive-cross-nav-grid">
        <article className="panel surface executive-link-card">
          <div className="panel-header">
            <div className="panel-title-stack">
              <h3>Mission Linkage</h3>
              <span>Route from current mission activity into the surrounding operating surfaces.</span>
            </div>
          </div>
          {activeMission ? (
            <div className="executive-link-body">
              <div>
                <strong>{activeMission.title}</strong>
                <p>{activeMission.missionId}</p>
              </div>
              <div className="route-chip-row">
                {activeMission.assignedAgentId ? (
                  <button type="button" className="route-chip" onClick={() => onNavigate("agents")}>
                    Agent {activeMission.assignedAgentId}
                  </button>
                ) : null}
                <button type="button" className="route-chip" onClick={() => onNavigate("conversations")}>Open Conversation</button>
                <button type="button" className="route-chip" onClick={() => onNavigate("knowledge")}>Open Knowledge</button>
              </div>
            </div>
          ) : (
            <div className="empty-state compact-empty">
              <strong>No Active Mission Focus</strong>
              <p>Mission cross-links will surface here once mission records become active.</p>
            </div>
          )}
        </article>

        <article className="panel surface executive-link-card">
          <div className="panel-header">
            <div className="panel-title-stack">
              <h3>Portfolio Linkage</h3>
              <span>Jump from workspace and project oversight into missions and assets.</span>
            </div>
          </div>
          {leadWorkspace ? (
            <div className="executive-link-body">
              <div>
                <strong>{leadWorkspace.name}</strong>
                <p>{leadWorkspace.knowledgeBoundarySummary ?? "Workspace summary available."}</p>
              </div>
              <div className="route-chip-row">
                <button type="button" className="route-chip" onClick={() => onNavigate("workspaces")}>Open Portfolio</button>
                <button type="button" className="route-chip" onClick={() => onNavigate("missions")}>View Missions</button>
                <button type="button" className="route-chip" onClick={() => onNavigate("knowledge")}>View Assets</button>
              </div>
            </div>
          ) : (
            <div className="empty-state compact-empty">
              <strong>No Portfolio Focus</strong>
              <p>Workspace and project links will appear here when estate records are visible.</p>
            </div>
          )}
        </article>
      </section>

      <OperationalTimeline items={timelineItems} onNavigate={onNavigate} />
    </div>
  );
}

function buildExecutiveMetrics(
  page: PageData,
  missionCentre: MissionCentreData,
  agentCentre: AgentCentreData,
  toolCentre: ToolCentreData,
  conversationCentre: ConversationCentreData,
  knowledgeCentre: KnowledgeCentreData,
  portfolioExplorer: PortfolioExplorerData,
): MetricCardRecord[] {
  return [
    {
      label: "Global Status",
      value: page.status.label,
      hint: "Current executive operating posture",
      tone: page.status.tone,
    },
    {
      label: "Active Missions",
      value: missionCentre.counts.active,
      hint: "Requested, approved, or running mission work",
      tone: missionCentre.counts.active ? "active" : "idle",
    },
    {
      label: "Busy Agents",
      value: agentCentre.counts.busy,
      hint: "Runtime agents currently engaged",
      tone: agentCentre.counts.busy ? "ready" : "idle",
    },
    {
      label: "Running Tools",
      value: toolCentre.invocationCounts.running,
      hint: "Active tool invocation flow",
      tone: toolCentre.invocationCounts.running ? "warning" : "idle",
    },
    {
      label: "Conversations",
      value: conversationCentre.counts.conversations,
      hint: "Top-level operating dialogue records",
      tone: conversationCentre.counts.conversations ? "idle" : "idle",
    },
    {
      label: "Knowledge Changes",
      value: knowledgeCentre.assets.length,
      hint: "Knowledge assets visible to the console",
      tone: knowledgeCentre.assets.length ? "complete" : "idle",
    },
    {
      label: "Projects",
      value: portfolioExplorer.projects.length,
      hint: "Visible project operating units",
      tone: portfolioExplorer.projects.length ? "active" : "idle",
    },
    {
      label: "Workspaces",
      value: portfolioExplorer.workspaces.length,
      hint: "Workspace estate under review",
      tone: portfolioExplorer.workspaces.length ? "ready" : "idle",
    },
  ];
}

function collectAttentionItems(pages: Record<NavPage, PageData>): RoutedAttention[] {
  return collectTimelineItems(pages)
    .filter((item) => item.eventName !== "NoRecentActivity")
    .slice(0, 12)
    .map((item) => ({
      ...item,
      group: groupForTone(item.tone),
    }))
    .sort((left, right) => severityRank(left.group) - severityRank(right.group));
}

function collectTimelineItems(pages: Record<NavPage, PageData>): RoutedActivity[] {
  const groups: Array<{ page: NavPage; category: string; items: ActivityItem[] }> = [
    { page: "kernel", category: "Kernel", items: pages.kernel.activity },
    { page: "executive", category: "Executive", items: pages.executive.activity },
    { page: "missions", category: "Missions", items: pages.missions.activity },
    { page: "agents", category: "Agents", items: pages.agents.activity },
    { page: "tools", category: "Tools", items: pages.tools.activity },
    { page: "conversations", category: "Conversations", items: pages.conversations.activity },
    { page: "knowledge", category: "Knowledge", items: pages.knowledge.activity },
    { page: "health", category: "Readiness", items: pages.health.activity },
    { page: "workspaces", category: "Portfolio", items: pages.workspaces.activity },
  ];

  return groups
    .flatMap((group) => group.items.map((item) => ({ ...item, page: group.page, category: group.category })))
    .filter((item) => item.eventName !== "NoRecentActivity")
    .slice(0, 16);
}

function groupForTone(tone: ActivityItem["tone"]): RoutedAttention["group"] {
  if (tone === "blocked") {
    return "Critical";
  }
  if (tone === "warning") {
    return "Warning";
  }
  if (tone === "complete") {
    return "Completed";
  }
  return "Info";
}

function severityRank(group: RoutedAttention["group"]): number {
  switch (group) {
    case "Critical":
      return 0;
    case "Warning":
      return 1;
    case "Info":
      return 2;
    case "Completed":
      return 3;
  }
}
