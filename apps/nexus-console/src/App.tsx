import { useEffect, useMemo, useRef, useState } from "react";
import { loadConsoleData, type ConsoleDataResult } from "./api/commandcoreApi";
import { CommandBar } from "./components/CommandBar";
import { ContextBreadcrumb } from "./components/ContextBreadcrumb";
import { LoadingState } from "./components/LoadingState";
import { Sidebar } from "./components/Sidebar";
import {
  mockAgentCentre,
  mockConversationCentre,
  mockMissionCentre,
  mockToolCentre,
  pageMap,
  type NavPage,
  type StatusTone,
} from "./data/mockKernel";
import {
  mockKnowledgeCentre,
  mockPortfolioExplorer,
  type SearchEntry,
} from "./data/nexusCentres";
import { useRecentlyViewed } from "./operatorPrefs";
import { AgentDashboard } from "./pages/AgentDashboard";
import { ConversationDashboard } from "./pages/ConversationDashboard";
import { ExecutiveBoardroom } from "./pages/ExecutiveBoardroom";
import { ExecutiveDashboard } from "./pages/ExecutiveDashboard";
import { ExecutiveHome } from "./pages/ExecutiveHome";
import { HealthReadiness } from "./pages/HealthReadiness";
import { KnowledgeDashboard } from "./pages/KnowledgeDashboard";
import { MissionDashboard } from "./pages/MissionDashboard";
import { SettingsPlaceholder } from "./pages/SettingsPlaceholder";
import { ToolDashboard } from "./pages/ToolDashboard";
import { WorkspacesDashboard } from "./pages/WorkspacesDashboard";
import {
  navigateTo,
  routeFromLocation,
  type NexusRoute,
  type RouteSelection,
} from "./routing";
import { buildBreadcrumb, type WorldData } from "./worldModel";

const initialData: ConsoleDataResult = {
  pages: pageMap,
  missionCentre: mockMissionCentre,
  agentCentre: mockAgentCentre,
  toolCentre: mockToolCentre,
  conversationCentre: mockConversationCentre,
  knowledgeCentre: mockKnowledgeCentre,
  portfolioExplorer: mockPortfolioExplorer,
  source: "mock",
  error: "Loading console data...",
};

const PAGE_SHORTCUTS: Record<string, NavPage> = {
  h: "kernel",
  m: "missions",
  a: "agents",
  t: "tools",
  c: "conversations",
  k: "knowledge",
  w: "workspaces",
  r: "health",
  s: "settings",
};

export default function App() {
  const [route, setRoute] = useState<NexusRoute>(() => routeFromLocation(window.location));
  const [consoleData, setConsoleData] = useState<ConsoleDataResult>(initialData);
  const [hasLoaded, setHasLoaded] = useState(false);
  const pendingShortcutPrefix = useRef(false);
  const { items: recentlyViewed, record: recordRecentlyViewed } = useRecentlyViewed();

  useEffect(() => {
    let active = true;

    void loadConsoleData().then((result) => {
      if (!active) {
        return;
      }
      setConsoleData(result);
      setHasLoaded(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => setRoute(routeFromLocation(window.location));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const activePage = route.page;
  const currentPage = consoleData.pages[activePage];
  const sourceMessage = consoleData.source === "live"
    ? `Connected to ${consoleData.baseUrl}`
    : consoleData.error ?? "Using built-in mock kernel data.";

  const searchEntries = useMemo(() => buildSearchEntries(consoleData), [consoleData]);

  const world: WorldData = useMemo(
    () => ({
      portfolioExplorer: consoleData.portfolioExplorer,
      missionCentre: consoleData.missionCentre,
      agentCentre: consoleData.agentCentre,
      toolCentre: consoleData.toolCentre,
      conversationCentre: consoleData.conversationCentre,
      knowledgeCentre: consoleData.knowledgeCentre,
    }),
    [consoleData],
  );

  const breadcrumbSegments = useMemo(() => buildBreadcrumb(route.selection, world), [route.selection, world]);

  function handleNavigate(page: NavPage, selection: RouteSelection = {}) {
    navigateTo(page, selection);
  }

  useEffect(() => {
    const hasSelection = Object.values(route.selection).some(Boolean);
    if (!hasSelection) {
      return;
    }
    const matchingEntry = searchEntries.find((entry) =>
      entry.page === route.page
      && Object.entries(route.selection).every(([key, value]) => !value || (entry.selection as Record<string, string | undefined>)[key] === value),
    );
    const label = matchingEntry?.label ?? Object.values(route.selection).find(Boolean) ?? route.page;
    recordRecentlyViewed({ label, page: route.page, selection: route.selection });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.page, route.selection]);

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      const tagName = target.tagName.toLowerCase();
      return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (event.key === "/" && !isTypingTarget(event.target)) {
        event.preventDefault();
        document.getElementById("command-bar-input")?.focus();
        return;
      }
      if (isTypingTarget(event.target)) {
        return;
      }
      if (event.key.toLowerCase() === "g") {
        pendingShortcutPrefix.current = true;
        window.setTimeout(() => {
          pendingShortcutPrefix.current = false;
        }, 1200);
        return;
      }
      if (pendingShortcutPrefix.current) {
        pendingShortcutPrefix.current = false;
        const targetPage = PAGE_SHORTCUTS[event.key.toLowerCase()];
        if (targetPage) {
          event.preventDefault();
          handleNavigate(targetPage);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const renderedPage = useMemo(() => {
    const props = {
      page: currentPage,
      source: consoleData.source,
      sourceMessage,
    };

    switch (activePage) {
      case "kernel":
        return (
          <ExecutiveHome
            {...props}
            pages={consoleData.pages}
            missionCentre={consoleData.missionCentre}
            agentCentre={consoleData.agentCentre}
            toolCentre={consoleData.toolCentre}
            conversationCentre={consoleData.conversationCentre}
            knowledgeCentre={consoleData.knowledgeCentre}
            portfolioExplorer={consoleData.portfolioExplorer}
            recentlyViewed={recentlyViewed}
            onNavigate={handleNavigate}
          />
        );
      case "executive":
        return <ExecutiveDashboard {...props} />;
      case "missions":
        return (
          <MissionDashboard
            {...props}
            missionCentre={consoleData.missionCentre}
            conversationCentre={consoleData.conversationCentre}
            knowledgeCentre={consoleData.knowledgeCentre}
            world={world}
            selection={route.selection}
            onNavigate={handleNavigate}
          />
        );
      case "agents":
        return (
          <AgentDashboard
            {...props}
            agentCentre={consoleData.agentCentre}
            world={world}
            selection={route.selection}
            onNavigate={handleNavigate}
          />
        );
      case "tools":
        return (
          <ToolDashboard
            {...props}
            toolCentre={consoleData.toolCentre}
            world={world}
            selection={route.selection}
            onNavigate={handleNavigate}
          />
        );
      case "conversations":
        return (
          <ConversationDashboard
            {...props}
            conversationCentre={consoleData.conversationCentre}
            world={world}
            selection={route.selection}
            onNavigate={handleNavigate}
          />
        );
      case "knowledge":
        return (
          <KnowledgeDashboard
            {...props}
            knowledgeCentre={consoleData.knowledgeCentre}
            world={world}
            selection={route.selection}
            onNavigate={handleNavigate}
          />
        );
      case "workspaces":
        return (
          <WorkspacesDashboard
            {...props}
            portfolioExplorer={consoleData.portfolioExplorer}
            knowledgeCentre={consoleData.knowledgeCentre}
            world={world}
            selection={route.selection}
            onNavigate={handleNavigate}
          />
        );
      case "boardroom":
        return (
          <ExecutiveBoardroom
            {...props}
            pages={consoleData.pages}
            world={world}
            onNavigate={handleNavigate}
          />
        );
      case "health":
        return <HealthReadiness {...props} />;
      case "settings":
        return <SettingsPlaceholder {...props} />;
      default:
        return (
          <ExecutiveHome
            {...props}
            pages={consoleData.pages}
            missionCentre={consoleData.missionCentre}
            agentCentre={consoleData.agentCentre}
            toolCentre={consoleData.toolCentre}
            conversationCentre={consoleData.conversationCentre}
            knowledgeCentre={consoleData.knowledgeCentre}
            portfolioExplorer={consoleData.portfolioExplorer}
            recentlyViewed={recentlyViewed}
            onNavigate={handleNavigate}
          />
        );
    }
  }, [
    activePage,
    consoleData,
    currentPage,
    recentlyViewed,
    route.selection,
    sourceMessage,
    world,
  ]);

  return (
    <div className="app-frame">
      <Sidebar activePage={activePage} onSelect={(page) => handleNavigate(page)} />
      <main className="console-main">
        <CommandBar
          activePage={activePage}
          onNavigate={handleNavigate}
          searchEntries={searchEntries}
        />
        <ContextBreadcrumb segments={breadcrumbSegments} onNavigate={handleNavigate} />
        {hasLoaded ? renderedPage : <LoadingState label="Connecting To CommandCore" detail="Loading the current operating picture from the live API or seeded fallback..." />}
      </main>
    </div>
  );
}

function buildSearchEntries(data: ConsoleDataResult): SearchEntry[] {
  const pageEntries = Object.entries(data.pages).map(([page, details]) => ({
    id: `page-${page}`,
    label: details.title,
    description: details.description,
    page: page as NavPage,
    selection: {},
    keywords: [details.eyebrow, details.status.label, ...details.metrics.map((metric) => String(metric.label))],
    context: details.eyebrow,
    tone: details.status.tone,
  }));

  const missionEntries = [
    ...data.missionCentre.active,
    ...data.missionCentre.completed,
    ...data.missionCentre.failed,
  ].map((mission) => ({
    id: `mission-${mission.missionId}`,
    label: mission.title,
    description: mission.resultSummary ?? mission.failureReason ?? mission.scope.join(" • ") ?? mission.status,
    page: "missions" as NavPage,
    selection: { missionId: mission.missionId },
    keywords: [mission.missionId, mission.status, ...mission.capabilityIds, ...mission.scope],
    context: mission.missionId,
    tone: undefined,
  }));

  const agentEntries = data.agentCentre.profiles.map((agent) => ({
    id: `agent-${agent.agentId}`,
    label: agent.name,
    description: agent.stateSummary ?? `${agent.role} / ${agent.runtimeStatus}`,
    page: "agents" as NavPage,
    selection: { agentId: agent.agentId },
    keywords: [agent.agentId, agent.role, agent.runtimeStatus, ...agent.capabilityIds, ...agent.missionQueue],
    context: agent.agentId,
    tone: undefined,
  }));

  const toolEntries = data.toolCentre.tools.map((tool) => ({
    id: `tool-${tool.toolId}`,
    label: tool.name,
    description: tool.description,
    page: "tools" as NavPage,
    selection: { toolId: tool.toolId },
    keywords: [tool.toolId, tool.permissionLevel, tool.status, tool.agentId ?? "", tool.capabilityId ?? ""],
    context: tool.toolId,
    tone: undefined,
  }));

  const conversationEntries = data.conversationCentre.conversations.map((conversation) => ({
    id: `conversation-${conversation.conversationId}`,
    label: conversation.conversationId,
    description: conversation.missionId ?? conversation.projectId ?? conversation.workspaceId ?? "Conversation record",
    page: "conversations" as NavPage,
    selection: { conversationId: conversation.conversationId },
    keywords: [
      conversation.conversationId,
      conversation.missionId ?? "",
      conversation.projectId ?? "",
      conversation.workspaceId ?? "",
      ...conversation.participantIds,
    ],
    context: `${conversation.participantIds.length} participants`,
    tone: undefined,
  }));

  const knowledgeEntries = data.knowledgeCentre.assets.map((asset) => ({
    id: `knowledge-${asset.assetId}`,
    label: asset.title,
    description: asset.summary,
    page: "knowledge" as NavPage,
    selection: { assetId: asset.assetId },
    keywords: [asset.assetId, asset.assetType, ...asset.tags, ...asset.scopes.map((scope) => scope.value)],
    context: asset.assetId,
    tone: (asset.safeToQuery ? "ready" : "warning") as StatusTone,
  }));

  const workspaceEntries = data.portfolioExplorer.workspaces.map((workspace) => ({
    id: `workspace-${workspace.workspaceId}`,
    label: workspace.name,
    description: workspace.knowledgeBoundarySummary ?? `${workspace.assetCount} assets / ${workspace.relationshipCount} relationships`,
    page: "workspaces" as NavPage,
    selection: { workspaceId: workspace.workspaceId },
    keywords: [workspace.workspaceId, workspace.status, ...workspace.projectIds, ...workspace.companyIds, ...workspace.capabilityIds],
    context: workspace.workspaceId,
    tone: undefined,
  }));

  const companyEntries = data.portfolioExplorer.companies.map((company) => ({
    id: `company-${company.companyId}`,
    label: company.name,
    description: company.mission,
    page: "workspaces" as NavPage,
    selection: { companyId: company.companyId },
    keywords: [company.companyId, company.status, ...company.projectIds, ...company.capabilityIds],
    context: company.companyId,
    tone: undefined,
  }));

  const projectEntries = data.portfolioExplorer.projects.map((project) => ({
    id: `project-${project.projectId}`,
    label: project.name,
    description: project.nextActionSummary ?? project.mission ?? "Project record",
    page: "workspaces" as NavPage,
    selection: { projectId: project.projectId },
    keywords: [project.projectId, project.status, ...project.capabilityIds, ...project.agentIds],
    context: project.projectId,
    tone: undefined,
  }));

  return [
    ...pageEntries,
    ...missionEntries,
    ...agentEntries,
    ...toolEntries,
    ...conversationEntries,
    ...knowledgeEntries,
    ...workspaceEntries,
    ...companyEntries,
    ...projectEntries,
  ];
}
