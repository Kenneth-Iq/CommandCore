import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { pageMap, type NavPage } from "./data/mockKernel";
import { DashboardPage } from "./pages/DashboardPage";

export default function App() {
  const [activePage, setActivePage] = useState<NavPage>("kernel");

  return (
    <div className="app-frame">
      <Sidebar activePage={activePage} onSelect={setActivePage} />
      <main className="console-main">
        <DashboardPage page={pageMap[activePage]} />
      </main>
    </div>
  );
}
