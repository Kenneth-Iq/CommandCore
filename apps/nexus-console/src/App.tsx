import { useEffect, useMemo, useState } from "react";
import { loadConsoleData, type ConsoleDataResult } from "./api/commandcoreApi";
import { Sidebar } from "./components/Sidebar";
import { type NavPage, pageMap } from "./data/mockKernel";
import { AgentDashboard } from "./pages/AgentDashboard";
import { ConversationDashboard } from "./pages/ConversationDashboard";
import { ExecutiveDashboard } from "./pages/ExecutiveDashboard";
import { HealthReadiness } from "./pages/HealthReadiness";
import { KernelOverview } from "./pages/KernelOverview";
import { KnowledgeDashboard } from "./pages/KnowledgeDashboard";
import { MissionDashboard } from "./pages/MissionDashboard";
import { ToolDashboard } from "./pages/ToolDashboard";
import { WorkspacesDashboard } from "./pages/WorkspacesDashboard";

const initialData: ConsoleDataResult = {
  pages: pageMap,
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
        return <KernelOverview {...props} />;
      case "executive":
        return <ExecutiveDashboard {...props} />;
      case "missions":
        return <MissionDashboard {...props} />;
      case "agents":
        return <AgentDashboard {...props} />;
      case "tools":
        return <ToolDashboard {...props} />;
      case "conversations":
        return <ConversationDashboard {...props} />;
      case "knowledge":
        return <KnowledgeDashboard {...props} />;
      case "workspaces":
        return <WorkspacesDashboard {...props} />;
      case "health":
        return <HealthReadiness {...props} />;
      default:
        return <KernelOverview {...props} />;
    }
  }, [activePage, consoleData.source, currentPage, sourceMessage]);

  return (
    <div className="app-frame">
      <Sidebar activePage={activePage} onSelect={setActivePage} />
      <main className="console-main">{renderedPage}</main>
    </div>
  );
}
