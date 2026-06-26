import { useEffect, useMemo, useState } from "react";
import { loadConsoleData, type ConsoleDataResult } from "./api/commandcoreApi";
import { CommandBar } from "./components/CommandBar";
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
import { AgentDashboard } from "./pages/AgentDashboard";
import { ConversationDashboard } from "./pages/ConversationDashboard";
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

export default function App() {
  const [route, setRoute] = useState<NexusRoute>(() => routeFromLocation(window.location));
  const [consoleData, setConsoleData] = useState<ConsoleDataResult>(initialData);

  useEffect(() => {
    let active = true;

    void loadConsoleData().then((result) => {
      if (!active) {
        return;
      }
      setConsoleData(result);
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

  function handleNavigate(page: NavPage, selection: RouteSelection = {}) {
    navigateTo(page, selection);
  }

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
            selection={route.selection}
            onNavigate={handleNavigate}
          />
        );
      case "agents":
        return (
          <AgentDashboard
            {...props}
            agentCentre={consoleData.agentCentre}
            selection={route.selection}
            onNavigate={handleNavigate}
          />
        );
      case "tools":
        return (
          <ToolDashboard
            {...props}
            toolCentre={consoleData.toolCentre}
            selection={route.selection}
            onNavigate={handleNavigate}
          />
        );
      case "conversations":
        return (
          <ConversationDashboard
            {...props}
            conversationCentre={consoleData.conversationCentre}
            selection={route.selection}
            onNavigate={handleNavigate}
          />
        );
      case "knowledge":
        return (
          <KnowledgeDashboard
            {...props}
            knowledgeCentre={consoleData.knowledgeCentre}
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
            selection={route.selection}
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
            onNavigate={handleNavigate}
          />
        );
    }
  }, [
    activePage,
    consoleData,
    currentPage,
    route.selection,
    sourceMessage,
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
        {renderedPage}
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
