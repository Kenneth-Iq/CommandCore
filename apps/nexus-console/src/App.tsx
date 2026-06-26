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
} from "./data/mockKernel";
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

const initialData: ConsoleDataResult = {
  pages: pageMap,
  missionCentre: mockMissionCentre,
  agentCentre: mockAgentCentre,
  toolCentre: mockToolCentre,
  conversationCentre: mockConversationCentre,
  source: "mock",
  error: "Loading console data...",
};

export default function App() {
  const [activePage, setActivePage] = useState<NavPage>("kernel");
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

  const currentPage = consoleData.pages[activePage];
  const sourceMessage = consoleData.source === "live"
    ? `Connected to ${consoleData.baseUrl}`
    : consoleData.error ?? "Using built-in mock kernel data.";

  const renderedPage = useMemo(() => {
    const props = {
      page: currentPage,
      source: consoleData.source,
      sourceMessage,
    };

    switch (activePage) {
      case "kernel":
        return <ExecutiveHome {...props} pages={consoleData.pages} />;
      case "executive":
        return <ExecutiveDashboard {...props} />;
      case "missions":
        return <MissionDashboard {...props} missionCentre={consoleData.missionCentre} />;
      case "agents":
        return <AgentDashboard {...props} agentCentre={consoleData.agentCentre} />;
      case "tools":
        return <ToolDashboard {...props} toolCentre={consoleData.toolCentre} />;
      case "conversations":
        return <ConversationDashboard {...props} conversationCentre={consoleData.conversationCentre} />;
      case "knowledge":
        return <KnowledgeDashboard {...props} />;
      case "workspaces":
        return <WorkspacesDashboard {...props} />;
      case "health":
        return <HealthReadiness {...props} />;
      case "settings":
        return <SettingsPlaceholder {...props} />;
      default:
        return <ExecutiveHome {...props} pages={consoleData.pages} />;
    }
  }, [
    activePage,
    consoleData.agentCentre,
    consoleData.conversationCentre,
    consoleData.missionCentre,
    consoleData.pages,
    consoleData.source,
    consoleData.toolCentre,
    currentPage,
    sourceMessage,
  ]);

  return (
    <div className="app-frame">
      <Sidebar activePage={activePage} onSelect={setActivePage} />
      <main className="console-main">
        <CommandBar />
        {renderedPage}
      </main>
    </div>
  );
}
