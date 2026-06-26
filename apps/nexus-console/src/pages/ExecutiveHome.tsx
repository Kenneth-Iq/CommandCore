import { useEffect, useMemo, useState } from "react";
import { DependencyGraph } from "../components/DependencyGraph";
import { ExecutiveAlerts, severityFromTone } from "../components/ExecutiveAlerts";
import { ExecutiveFocusPanel, emptyFocusState, type ExecutiveFocusState } from "../components/ExecutiveFocusPanel";
import { ExecutiveHealthBoard } from "../components/ExecutiveHealthBoard";
import { EnterpriseExplorer } from "../components/EnterpriseExplorer";
import { ExecutiveSimulationPanel } from "../components/ExecutiveSimulationPanel";
import { RecentlyViewedPanel } from "../components/RecentlyViewedPanel";
import { MetricCard } from "../components/MetricCard";
import { OperationalTimeline } from "../components/OperationalTimeline";
import { PageHeader } from "../components/PageHeader";
import { SourceStrip } from "../components/SourceStrip";
import { StatusBadge } from "../components/StatusBadge";
import type { RouteSelection } from "../routing";
import type { DataSource } from "../api/commandcoreApi";
import type {
  ActivityItem,
  AgentCentreData,
  AgentProfile,
  ConversationCentreData,
  MissionCentreData,
  MissionRecord,
  NavPage,
  PageData,
  ToolCentreData,
  ToolRecord,
  MetricCard as MetricCardRecord,
  StatusTone,
} from "../data/mockKernel";
import type { CompanyRecord, KnowledgeAssetRecord, KnowledgeCentreData, PortfolioExplorerData, ProjectRecord, WorkspaceRecord } from "../data/nexusCentres";
import { buildWorldSummary, buildWorldTree, type WorldData } from "../worldModel";
import { useExecutiveSimulation } from "../simulation";
import type { RecentlyViewedEntry } from "../operatorPrefs";

type ExecutiveHomeProps = {
  page: PageData;
  pages: Record<NavPage, PageData>;
  missionCentre: MissionCentreData;
  agentCentre: AgentCentreData;
  toolCentre: ToolCentreData;
  conversationCentre: ConversationCentreData;
  knowledgeCentre: KnowledgeCentreData;
  portfolioExplorer: PortfolioExplorerData;
  recentlyViewed: RecentlyViewedEntry[];
  source: DataSource;
  sourceMessage?: string;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

type RoutedActivity = ActivityItem & {
  page: NavPage;
  category: string;
};

type ExecutiveScopeModel = {
  missions: MissionRecord[];
  agents: AgentProfile[];
  tools: ToolRecord[];
  conversations: ConversationCentreData["conversations"];
  knowledge: KnowledgeAssetRecord[];
  workspaces: WorkspaceRecord[];
  companies: CompanyRecord[];
  projects: ProjectRecord[];
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
  recentlyViewed,
  source,
  sourceMessage,
  onNavigate,
}: ExecutiveHomeProps) {
  const [focus, setFocus] = useState<ExecutiveFocusState>(emptyFocusState());
  const [expandedWorldNodes, setExpandedWorldNodes] = useState<Set<string>>(() => loadExpandedWorldNodes());

  useEffect(() => {
    saveExpandedWorldNodes(expandedWorldNodes);
  }, [expandedWorldNodes]);

  const world: WorldData = useMemo(
    () => ({ portfolioExplorer, missionCentre, agentCentre, toolCentre, conversationCentre, knowledgeCentre }),
    [portfolioExplorer, missionCentre, agentCentre, toolCentre, conversationCentre, knowledgeCentre],
  );
  const worldTree = useMemo(() => buildWorldTree(world), [world]);
  const worldSummary = useMemo(() => buildWorldSummary(world), [world]);

  function toggleWorldNode(id: string) {
    setExpandedWorldNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }
  const allMissions = useMemo(() => [...missionCentre.active, ...missionCentre.completed, ...missionCentre.failed], [missionCentre]);

  const filtered = useMemo<ExecutiveScopeModel>(() => {
    const missions = allMissions.filter((mission) => missionMatchesFocus(mission, focus, portfolioExplorer));
    const missionIds = new Set(missions.map((mission) => mission.missionId));

    const workspaces = portfolioExplorer.workspaces.filter((workspace) => workspaceMatchesFocus(workspace, focus, missions));
    const workspaceIds = new Set(workspaces.map((workspace) => workspace.workspaceId));
    const companies = portfolioExplorer.companies.filter((company) => companyMatchesFocus(company, focus, workspaces));
    const companyIds = new Set(companies.map((company) => company.companyId));
    const projects = portfolioExplorer.projects.filter((project) => projectMatchesFocus(project, focus, workspaces, companies));
    const projectIds = new Set(projects.map((project) => project.projectId));

    const agents = agentCentre.profiles.filter((agent) => agentMatchesFocus(agent, focus, missionIds, workspaces, companies, projects));
    const agentIds = new Set(agents.map((agent) => agent.agentId));
    const tools = toolCentre.tools.filter((tool) => toolMatchesFocus(tool, focus, agentIds, workspaces, companies, projects));
    const conversations = conversationCentre.conversations.filter((conversation) => conversationMatchesFocus(conversation, focus, missionIds, workspaceIds, companyIds, projectIds, agentIds));
    const knowledge = knowledgeCentre.assets.filter((asset) => knowledgeMatchesFocus(asset, focus, workspaceIds, companyIds, projectIds, missionIds));

    return {
      missions,
      agents,
      tools,
      conversations,
      knowledge,
      workspaces,
      companies,
      projects,
    };
  }, [allMissions, agentCentre.profiles, conversationCentre.conversations, focus, knowledgeCentre.assets, portfolioExplorer, toolCentre.tools]);

  const simulation = useExecutiveSimulation(world);
  const healthMetrics = useMemo(() => buildHealthMetrics(pages, filtered), [pages, filtered]);
  const healthMetricsWithSimulation = useMemo(
    () => [
      ...healthMetrics,
      {
        label: "Live Simulated Health",
        score: simulation.healthScore,
        detail: "Derived dynamically from simulated mission, agent, and tool activity.",
      },
    ],
    [healthMetrics, simulation.healthScore],
  );
  const kpiMetrics = useMemo(() => buildOperationalKpis(pages, filtered, conversationCentre, knowledgeCentre), [pages, filtered, conversationCentre, knowledgeCentre]);
  const activityItems = useMemo(() => buildExecutiveActivityFeed(pages, filtered), [pages, filtered]);
  const alerts = useMemo(() => activityItems.slice(0, 15).map((item) => ({ ...item, severity: severityFromTone(item.tone) })), [activityItems]);
  const graphNodes = useMemo(() => buildDependencyNodes(filtered), [filtered]);
  const objectiveMetric = pages.executive.metrics.find((metric) => String(metric.label).toLowerCase().includes("objective"));
  const activeMission = filtered.missions[0];
  const activeAgent = filtered.agents[0];
  const activeTool = filtered.tools[0];
  const activeConversation = filtered.conversations[0];
  const activeKnowledge = filtered.knowledge[0];
  const activeWorkspace = filtered.workspaces[0];
  const activeCompany = filtered.companies[0];
  const activeProject = filtered.projects[0];

  return (
    <div className="page-shell executive-home-shell">
      <PageHeader page={page} />
      <SourceStrip
        source={source}
        sourceMessage={sourceMessage}
        label="Operating Picture"
        title={source === "live" ? "Live executive operational intelligence view" : "Seeded executive operational intelligence view"}
        status={page.status}
      />

      <EnterpriseExplorer
        tree={worldTree}
        summary={worldSummary}
        healthStatus={pages.health.status}
        readinessStatus={pages.kernel.status}
        selection={{}}
        expanded={expandedWorldNodes}
        onToggle={toggleWorldNode}
        onNavigate={onNavigate}
      />

      <RecentlyViewedPanel items={recentlyViewed} onNavigate={onNavigate} />

      <ExecutiveFocusPanel
        focus={focus}
        companyOptions={portfolioExplorer.companies.map((company) => ({ value: company.companyId, label: company.name }))}
        workspaceOptions={portfolioExplorer.workspaces.map((workspace) => ({ value: workspace.workspaceId, label: workspace.name }))}
        projectOptions={portfolioExplorer.projects.map((project) => ({ value: project.projectId, label: project.name }))}
        missionOptions={allMissions.map((mission) => ({ value: mission.missionId, label: mission.title }))}
        agentOptions={agentCentre.profiles.map((agent) => ({ value: agent.agentId, label: agent.name }))}
        onChange={setFocus}
      />

      <ExecutiveHealthBoard metrics={healthMetricsWithSimulation} />

      <ExecutiveSimulationPanel
        simulation={simulation}
        missions={allMissions}
        agents={agentCentre.profiles}
        tools={toolCentre.tools}
        conversations={conversationCentre.conversations}
        knowledgeAssets={knowledgeCentre.assets}
      />

      <section className="metrics-grid executive-summary-band executive-system-metrics">
        {kpiMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="executive-os-grid executive-intelligence-grid">
        <article className="panel surface executive-system-board">
          <div className="panel-header">
            <div className="panel-title-stack">
              <h3>Executive Situational Awareness</h3>
              <span>Current runtime posture and the most relevant entities in the selected focus scope.</span>
            </div>
          </div>
          <div className="executive-status-grid">
            <button type="button" className="executive-status-card" onClick={() => onNavigate("missions", activeMission ? { missionId: activeMission.missionId } : {})}>
              <div className="knowledge-card-header">
                <strong>Mission Health</strong>
                <StatusBadge tone={toneFromScore(healthMetrics.find((metric) => metric.label === "Mission Health")?.score ?? 0)}>{filtered.missions.length}</StatusBadge>
              </div>
              <p>{activeMission ? `${activeMission.title} • ${activeMission.status}` : "No focused mission records."}</p>
            </button>
            <button type="button" className="executive-status-card" onClick={() => onNavigate("agents", activeAgent ? { agentId: activeAgent.agentId } : {})}>
              <div className="knowledge-card-header">
                <strong>Agent Health</strong>
                <StatusBadge tone={toneFromScore(healthMetrics.find((metric) => metric.label === "Agent Health")?.score ?? 0)}>{filtered.agents.length}</StatusBadge>
              </div>
              <p>{activeAgent ? `${activeAgent.name} • ${activeAgent.runtimeStatus}` : "No focused agent records."}</p>
            </button>
            <button type="button" className="executive-status-card" onClick={() => onNavigate("tools", activeTool ? { toolId: activeTool.toolId } : {})}>
              <div className="knowledge-card-header">
                <strong>Tool Health</strong>
                <StatusBadge tone={toneFromScore(healthMetrics.find((metric) => metric.label === "Tool Health")?.score ?? 0)}>{filtered.tools.length}</StatusBadge>
              </div>
              <p>{activeTool ? `${activeTool.name} • ${activeTool.permissionLevel}` : "No focused tool records."}</p>
            </button>
            <button type="button" className="executive-status-card" onClick={() => onNavigate("conversations", activeConversation ? { conversationId: activeConversation.conversationId } : {})}>
              <div className="knowledge-card-header">
                <strong>Conversation Health</strong>
                <StatusBadge tone={toneFromScore(healthMetrics.find((metric) => metric.label === "Conversation Health")?.score ?? 0)}>{filtered.conversations.length}</StatusBadge>
              </div>
              <p>{activeConversation ? `${activeConversation.conversationId} • ${activeConversation.participantIds.join(", ")}` : "No focused conversation records."}</p>
            </button>
            <button type="button" className="executive-status-card" onClick={() => onNavigate("knowledge", activeKnowledge ? { assetId: activeKnowledge.assetId } : {})}>
              <div className="knowledge-card-header">
                <strong>Knowledge Health</strong>
                <StatusBadge tone={toneFromScore(healthMetrics.find((metric) => metric.label === "Knowledge Health")?.score ?? 0)}>{filtered.knowledge.length}</StatusBadge>
              </div>
              <p>{activeKnowledge ? `${activeKnowledge.title} • ${activeKnowledge.relationshipCount} links` : "No focused knowledge records."}</p>
            </button>
            <button type="button" className="executive-status-card" onClick={() => onNavigate("workspaces", activeWorkspace ? { workspaceId: activeWorkspace.workspaceId } : activeCompany ? { companyId: activeCompany.companyId } : activeProject ? { projectId: activeProject.projectId } : {})}>
              <div className="knowledge-card-header">
                <strong>Portfolio Focus</strong>
                <StatusBadge tone="active">Mapped</StatusBadge>
              </div>
              <p>{activeWorkspace ? activeWorkspace.name : activeCompany ? activeCompany.name : activeProject ? activeProject.name : "No focused portfolio records."}</p>
            </button>
          </div>
        </article>

        <DependencyGraph nodes={graphNodes} onNavigate={onNavigate} />
      </section>

      <ExecutiveAlerts items={alerts} onNavigate={onNavigate} />

      <section className="executive-cross-nav-grid">
        <article className="panel surface executive-link-card">
          <div className="panel-header">
            <div className="panel-title-stack">
              <h3>Operational Chain</h3>
              <span>Selected focus links across missions, agents, tools, knowledge, conversations, and the portfolio estate.</span>
            </div>
          </div>
          <div className="executive-link-body">
            <div>
              <strong>{activeMission?.title ?? "No focused mission"}</strong>
              <p>{activeMission?.missionId ?? "Select a focus mode filter to narrow the operational chain."}</p>
            </div>
            <div className="route-chip-row">
              {activeMission?.assignedAgentId ? (
                <button type="button" className="route-chip" onClick={() => onNavigate("agents", { agentId: activeMission.assignedAgentId })}>
                  Mission → Agent
                </button>
              ) : null}
              {activeConversation ? (
                <button type="button" className="route-chip" onClick={() => onNavigate("conversations", { conversationId: activeConversation.conversationId })}>
                  Mission → Conversation
                </button>
              ) : null}
              {activeKnowledge ? (
                <button type="button" className="route-chip" onClick={() => onNavigate("knowledge", { assetId: activeKnowledge.assetId })}>
                  Mission → Knowledge
                </button>
              ) : null}
              {activeWorkspace ? (
                <button type="button" className="route-chip" onClick={() => onNavigate("workspaces", { workspaceId: activeWorkspace.workspaceId })}>
                  Knowledge → Workspace
                </button>
              ) : null}
              {activeCompany ? (
                <button type="button" className="route-chip" onClick={() => onNavigate("workspaces", { companyId: activeCompany.companyId })}>
                  Workspace → Company
                </button>
              ) : null}
            </div>
          </div>
        </article>

        <article className="panel surface executive-link-card">
          <div className="panel-header">
            <div className="panel-title-stack">
              <h3>Executive Objective Pulse</h3>
              <span>Objective framing and throughput inside the current operating scope.</span>
            </div>
          </div>
          <div className="executive-link-body">
            <div>
              <strong>{objectiveMetric?.value ?? "Objectives unavailable"}</strong>
              <p>{objectiveMetric?.hint ?? "Executive objective data is derived from the governance dashboard."}</p>
            </div>
            <div className="route-chip-row">
              <button type="button" className="route-chip" onClick={() => onNavigate("executive")}>Open Governance</button>
              <button type="button" className="route-chip" onClick={() => onNavigate("health")}>Open Readiness</button>
            </div>
          </div>
        </article>
      </section>

      <OperationalTimeline items={activityItems} onNavigate={onNavigate} />
    </div>
  );
}

function buildHealthMetrics(pages: Record<NavPage, PageData>, filtered: ExecutiveScopeModel) {
  const readinessScore = scoreFromTone(pages.health.status.tone, 92);
  const kernelAvailability = pages.kernel.availabilityGrid?.filter((item) => item.available).length ?? 0;
  const kernelTotal = pages.kernel.availabilityGrid?.length ?? 1;
  const kernelScore = Math.round((kernelAvailability / kernelTotal) * 100);
  const missionHealth = clamp(100 - filtered.missions.filter((mission) => mission.status.toLowerCase().includes("fail") || mission.status.toLowerCase().includes("block")).length * 25 + filtered.missions.filter((mission) => mission.status.toLowerCase().includes("complete")).length * 4, 28, 98);
  const busyAgents = filtered.agents.filter((agent) => agent.runtimeStatus === "busy").length;
  const offlineAgents = filtered.agents.filter((agent) => agent.runtimeStatus === "offline").length;
  const agentHealth = clamp(82 + busyAgents * 4 - offlineAgents * 14, 22, 98);
  const failedTools = filtered.tools.filter((tool) => tool.permissionLevel === "privileged").length;
  const toolHealth = clamp(88 - failedTools * 14 + filtered.tools.length * 2, 20, 98);
  const conversationHealth = clamp(74 + filtered.conversations.length * 5, 36, 97);
  const linkedKnowledge = filtered.knowledge.reduce((total, asset) => total + asset.relationshipCount, 0);
  const knowledgeHealth = clamp(68 + filtered.knowledge.length * 5 + linkedKnowledge, 30, 99);
  const overall = Math.round((readinessScore + kernelScore + missionHealth + agentHealth + toolHealth + conversationHealth + knowledgeHealth) / 7);

  return [
    { label: "Overall Platform Health", score: overall, detail: "Aggregate command-centre health across readiness, kernel, runtime, memory, and execution." },
    { label: "Readiness Score", score: readinessScore, detail: pages.health.status.label },
    { label: "Kernel Score", score: kernelScore, detail: `${kernelAvailability}/${kernelTotal} kernel surfaces available.` },
    { label: "Agent Health", score: agentHealth, detail: `${busyAgents} busy / ${offlineAgents} offline agents in the current focus.` },
    { label: "Mission Health", score: missionHealth, detail: `${filtered.missions.length} missions in focus with failure and completion weighting.` },
    { label: "Conversation Health", score: conversationHealth, detail: `${filtered.conversations.length} focused conversations contributing to operational context.` },
    { label: "Tool Health", score: toolHealth, detail: `${filtered.tools.length} tools in focus with permission and coverage weighting.` },
    { label: "Knowledge Health", score: knowledgeHealth, detail: `${filtered.knowledge.length} assets and ${linkedKnowledge} relationships in the current scope.` },
  ];
}

function buildOperationalKpis(
  pages: Record<NavPage, PageData>,
  filtered: ExecutiveScopeModel,
  conversationCentre: ConversationCentreData,
  knowledgeCentre: KnowledgeCentreData,
): MetricCardRecord[] {
  const blockedMissions = filtered.missions.filter((mission) => mission.status.toLowerCase().includes("fail") || mission.status.toLowerCase().includes("block")).length;
  const busyAgents = filtered.agents.filter((agent) => agent.runtimeStatus === "busy").length;
  const agentUtilisation = filtered.agents.length ? `${Math.round((busyAgents / filtered.agents.length) * 100)}%` : "0%";
  const toolAvailability = filtered.tools.length ? `${filtered.tools.filter((tool) => tool.status === "registered").length}/${filtered.tools.length}` : "0/0";
  const knowledgeGrowth = `${filtered.knowledge.length}/${knowledgeCentre.assets.length}`;
  const conversationActivity = `${filtered.conversations.length}/${conversationCentre.counts.messages}`;
  const eventThroughput = buildExecutiveActivityFeed(pages, filtered).length;
  const executiveObjectives = pages.executive.metrics.find((metric) => String(metric.label).toLowerCase().includes("objective"))?.value ?? 0;

  return [
    { label: "Active Missions", value: filtered.missions.filter((mission) => !mission.status.toLowerCase().includes("complete") && !mission.status.toLowerCase().includes("fail")).length, hint: "Focused mission work currently in motion.", tone: "active" },
    { label: "Blocked Missions", value: blockedMissions, hint: "Failed or blocked missions in the current focus.", tone: blockedMissions ? "warning" : "ready" },
    { label: "Agent Utilisation", value: agentUtilisation, hint: `${busyAgents}/${Math.max(filtered.agents.length, 1)} agents engaged.`, tone: busyAgents ? "ready" : "idle" },
    { label: "Tool Availability", value: toolAvailability, hint: "Registered tool coverage in focus.", tone: filtered.tools.length ? "active" : "idle" },
    { label: "Knowledge Growth", value: knowledgeGrowth, hint: "Focused knowledge assets versus total visible assets.", tone: filtered.knowledge.length ? "complete" : "idle" },
    { label: "Conversation Activity", value: conversationActivity, hint: "Focused conversations against current message volume.", tone: filtered.conversations.length ? "idle" : "idle" },
    { label: "Event Throughput", value: eventThroughput, hint: "Merged operational signals in the executive activity feed.", tone: eventThroughput ? "active" : "idle" },
    { label: "Executive Objectives", value: executiveObjectives, hint: pages.executive.description, tone: "ready" },
  ];
}

function buildExecutiveActivityFeed(pages: Record<NavPage, PageData>, filtered: ExecutiveScopeModel): RoutedActivity[] {
  const items: RoutedActivity[] = [
    ...collectTimelineItems(pages),
    ...filtered.missions.slice(0, 4).map((mission, index) => ({
      id: `focused-mission-${mission.missionId}-${index}`,
      eventName: "MissionFocusSignal",
      source: "nexus.executive.focus",
      occurredAt: mission.status,
      detail: `${mission.title} • ${mission.missionId}`,
      tone: (mission.status.toLowerCase().includes("complete") ? "complete" : mission.status.toLowerCase().includes("fail") ? "warning" : "active") as StatusTone,
      page: "missions" as NavPage,
      category: "Focused Mission",
    })),
    ...filtered.conversations.slice(0, 3).map((conversation, index) => ({
      id: `focused-conversation-${conversation.conversationId}-${index}`,
      eventName: "ConversationFocusSignal",
      source: "nexus.executive.focus",
      occurredAt: `${conversation.participantIds.length}p`,
      detail: `${conversation.conversationId} • ${conversation.participantIds.join(", ")}`,
      tone: "idle" as StatusTone,
      page: "conversations" as NavPage,
      category: "Focused Conversation",
    })),
    ...filtered.knowledge.slice(0, 3).map((asset, index) => ({
      id: `focused-knowledge-${asset.assetId}-${index}`,
      eventName: "KnowledgeFocusSignal",
      source: "nexus.executive.focus",
      occurredAt: `${asset.relationshipCount} links`,
      detail: `${asset.title} • ${asset.assetType}`,
      tone: (asset.safeToQuery ? "complete" : "warning") as StatusTone,
      page: "knowledge" as NavPage,
      category: "Focused Knowledge",
    })),
  ];

  return items.slice(0, 20);
}

function buildDependencyNodes(filtered: ExecutiveScopeModel) {
  const mission = filtered.missions[0];
  const agent = mission?.assignedAgentId ? filtered.agents.find((candidate) => candidate.agentId === mission.assignedAgentId) ?? filtered.agents[0] : filtered.agents[0];
  const tool = agent ? filtered.tools.find((candidate) => candidate.agentId === agent.agentId) ?? filtered.tools[0] : filtered.tools[0];
  const knowledge = mission ? filtered.knowledge.find((asset) => asset.scopes.some((scope) => scope.kind === "mission" && scope.value === mission.missionId)) ?? filtered.knowledge[0] : filtered.knowledge[0];
  const conversation = mission ? filtered.conversations.find((item) => item.missionId === mission.missionId) ?? filtered.conversations[0] : filtered.conversations[0];
  const workspace = knowledge ? filtered.workspaces.find((item) => knowledge.scopes.some((scope) => scope.kind === "workspace" && scope.value === item.workspaceId)) ?? filtered.workspaces[0] : filtered.workspaces[0];
  const company = workspace ? filtered.companies.find((item) => workspace.companyIds.includes(item.companyId)) ?? filtered.companies[0] : filtered.companies[0];

  return [
    { label: "Mission", value: mission ? `${mission.title}` : "No focused mission", page: "missions" as NavPage, selection: mission ? { missionId: mission.missionId } : {} },
    { label: "Agent", value: agent ? agent.name : "No focused agent", page: "agents" as NavPage, selection: agent ? { agentId: agent.agentId } : {} },
    { label: "Tool", value: tool ? tool.name : "No focused tool", page: "tools" as NavPage, selection: tool ? { toolId: tool.toolId } : {} },
    { label: "Knowledge", value: knowledge ? knowledge.title : "No focused knowledge", page: "knowledge" as NavPage, selection: knowledge ? { assetId: knowledge.assetId } : {} },
    { label: "Conversation", value: conversation ? conversation.conversationId : "No focused conversation", page: "conversations" as NavPage, selection: conversation ? { conversationId: conversation.conversationId } : {} },
    { label: "Workspace", value: workspace ? workspace.name : "No focused workspace", page: "workspaces" as NavPage, selection: workspace ? { workspaceId: workspace.workspaceId } : {} },
    { label: "Company", value: company ? company.name : "No focused company", page: "workspaces" as NavPage, selection: company ? { companyId: company.companyId } : {} },
  ];
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
    .filter((item) => item.eventName !== "NoRecentActivity");
}

function missionMatchesFocus(mission: MissionRecord, focus: ExecutiveFocusState, portfolioExplorer: PortfolioExplorerData) {
  if (focus.missionId && mission.missionId !== focus.missionId) {
    return false;
  }
  if (focus.agentId && mission.assignedAgentId !== focus.agentId) {
    return false;
  }
  if (focus.projectId && !mission.scope.includes(`project:${focus.projectId}`)) {
    return false;
  }
  if (focus.workspaceId && !mission.scope.includes(`workspace:${focus.workspaceId}`)) {
    return false;
  }
  if (focus.companyId) {
    const companyProjects = new Set(portfolioExplorer.companies.find((company) => company.companyId === focus.companyId)?.projectIds ?? []);
    const matchesCompanyProject = mission.scope.some((scope) => scope.startsWith("project:") && companyProjects.has(scope.replace("project:", "")));
    if (!matchesCompanyProject) {
      return false;
    }
  }
  return true;
}

function workspaceMatchesFocus(workspace: WorkspaceRecord, focus: ExecutiveFocusState, missions: MissionRecord[]) {
  if (focus.workspaceId && workspace.workspaceId !== focus.workspaceId) {
    return false;
  }
  if (focus.companyId && !workspace.companyIds.includes(focus.companyId)) {
    return false;
  }
  if (focus.projectId && !workspace.projectIds.includes(focus.projectId)) {
    return false;
  }
  if (focus.agentId && !workspace.agentIds.includes(focus.agentId)) {
    return false;
  }
  if (focus.missionId && !missions.some((mission) => mission.missionId === focus.missionId && mission.scope.includes(`workspace:${workspace.workspaceId}`))) {
    return false;
  }
  return true;
}

function companyMatchesFocus(company: CompanyRecord, focus: ExecutiveFocusState, workspaces: WorkspaceRecord[]) {
  if (focus.companyId && company.companyId !== focus.companyId) {
    return false;
  }
  if (focus.workspaceId && !workspaces.some((workspace) => workspace.workspaceId === focus.workspaceId && workspace.companyIds.includes(company.companyId))) {
    return false;
  }
  if (focus.projectId && !company.projectIds.includes(focus.projectId)) {
    return false;
  }
  if (focus.agentId && !company.agentIds.includes(focus.agentId)) {
    return false;
  }
  return true;
}

function projectMatchesFocus(project: ProjectRecord, focus: ExecutiveFocusState, workspaces: WorkspaceRecord[], companies: CompanyRecord[]) {
  if (focus.projectId && project.projectId !== focus.projectId) {
    return false;
  }
  if (focus.companyId && project.companyId !== focus.companyId) {
    return false;
  }
  if (focus.workspaceId && !workspaces.some((workspace) => workspace.workspaceId === focus.workspaceId && workspace.projectIds.includes(project.projectId))) {
    return false;
  }
  if (focus.agentId && !project.agentIds.includes(focus.agentId)) {
    return false;
  }
  if (focus.missionId && !project.mission?.toLowerCase().includes(focus.missionId.toLowerCase()) && !companies.some((company) => company.projectIds.includes(project.projectId))) {
    return !focus.missionId;
  }
  return true;
}

function agentMatchesFocus(agent: AgentProfile, focus: ExecutiveFocusState, missionIds: Set<string>, workspaces: WorkspaceRecord[], companies: CompanyRecord[], projects: ProjectRecord[]) {
  if (focus.agentId && agent.agentId !== focus.agentId) {
    return false;
  }
  if (focus.missionId && !agent.missionQueue.includes(focus.missionId) && !missionIds.has(focus.missionId)) {
    return false;
  }
  if (focus.workspaceId && !workspaces.some((workspace) => workspace.workspaceId === focus.workspaceId && workspace.agentIds.includes(agent.agentId))) {
    return false;
  }
  if (focus.companyId && !companies.some((company) => company.companyId === focus.companyId && company.agentIds.includes(agent.agentId))) {
    return false;
  }
  if (focus.projectId && !projects.some((project) => project.projectId === focus.projectId && project.agentIds.includes(agent.agentId))) {
    return false;
  }
  return true;
}

function toolMatchesFocus(tool: ToolRecord, focus: ExecutiveFocusState, agentIds: Set<string>, workspaces: WorkspaceRecord[], companies: CompanyRecord[], projects: ProjectRecord[]) {
  if (focus.agentId && tool.agentId !== focus.agentId) {
    return false;
  }
  if (focus.workspaceId && !workspaces.some((workspace) => workspace.workspaceId === focus.workspaceId && workspace.capabilityIds.includes(tool.capabilityId ?? ""))) {
    return false;
  }
  if (focus.companyId && !companies.some((company) => company.companyId === focus.companyId && company.capabilityIds.includes(tool.capabilityId ?? ""))) {
    return false;
  }
  if (focus.projectId && !projects.some((project) => project.projectId === focus.projectId && project.capabilityIds.includes(tool.capabilityId ?? ""))) {
    return false;
  }
  if (focus.missionId && !agentIds.has(tool.agentId ?? "")) {
    return false;
  }
  return true;
}

function conversationMatchesFocus(
  conversation: ConversationCentreData["conversations"][number],
  focus: ExecutiveFocusState,
  missionIds: Set<string>,
  workspaceIds: Set<string>,
  companyIds: Set<string>,
  projectIds: Set<string>,
  agentIds: Set<string>,
) {
  if (focus.missionId && conversation.missionId !== focus.missionId) {
    return false;
  }
  if (focus.workspaceId && conversation.workspaceId !== focus.workspaceId) {
    return false;
  }
  if (focus.companyId && conversation.companyId !== focus.companyId && !companyIds.has(focus.companyId)) {
    return false;
  }
  if (focus.projectId && conversation.projectId !== focus.projectId) {
    return false;
  }
  if (focus.agentId && !conversation.participantIds.includes(focus.agentId) && !agentIds.has(focus.agentId)) {
    return false;
  }
  if (focus.missionId && !missionIds.has(focus.missionId)) {
    return false;
  }
  if (focus.workspaceId && !workspaceIds.has(focus.workspaceId)) {
    return false;
  }
  if (focus.projectId && !projectIds.has(focus.projectId)) {
    return false;
  }
  return true;
}

function knowledgeMatchesFocus(
  asset: KnowledgeAssetRecord,
  focus: ExecutiveFocusState,
  workspaceIds: Set<string>,
  companyIds: Set<string>,
  projectIds: Set<string>,
  missionIds: Set<string>,
) {
  if (focus.missionId && !asset.scopes.some((scope) => scope.kind === "mission" && scope.value === focus.missionId)) {
    return false;
  }
  if (focus.workspaceId && !asset.scopes.some((scope) => scope.kind === "workspace" && scope.value === focus.workspaceId)) {
    return false;
  }
  if (focus.companyId && !asset.scopes.some((scope) => scope.kind === "company" && scope.value === focus.companyId)) {
    return false;
  }
  if (focus.projectId && !asset.scopes.some((scope) => scope.kind === "project" && scope.value === focus.projectId)) {
    return false;
  }
  if (focus.agentId && !projectIds.size && !workspaceIds.size && !companyIds.size && !missionIds.size) {
    return true;
  }
  return true;
}

function scoreFromTone(tone: StatusTone, base: number) {
  switch (tone) {
    case "complete":
      return clamp(base + 6, 0, 100);
    case "ready":
      return clamp(base, 0, 100);
    case "active":
      return clamp(base - 12, 0, 100);
    case "warning":
      return clamp(base - 28, 0, 100);
    case "blocked":
      return clamp(base - 48, 0, 100);
    default:
      return clamp(base - 18, 0, 100);
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function toneFromScore(score: number): StatusTone {
  if (score >= 90) {
    return "complete";
  }
  if (score >= 75) {
    return "ready";
  }
  if (score >= 60) {
    return "active";
  }
  if (score >= 40) {
    return "warning";
  }
  return "blocked";
}

const WORLD_EXPANDED_NODES_STORAGE_KEY = "nexus.worldExplorer.expandedNodes";

function loadExpandedWorldNodes(): Set<string> {
  if (typeof window === "undefined") {
    return new Set(["portfolio-root"]);
  }
  try {
    const raw = window.localStorage.getItem(WORLD_EXPANDED_NODES_STORAGE_KEY);
    if (!raw) {
      return new Set(["portfolio-root"]);
    }
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed.length ? parsed : ["portfolio-root"]);
  } catch {
    return new Set(["portfolio-root"]);
  }
}

function saveExpandedWorldNodes(nodes: Set<string>): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(WORLD_EXPANDED_NODES_STORAGE_KEY, JSON.stringify(Array.from(nodes)));
  } catch {
    // Local storage is unavailable; expanded state simply will not persist across reloads.
  }
}
