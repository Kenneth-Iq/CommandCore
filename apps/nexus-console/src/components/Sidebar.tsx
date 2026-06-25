import type { NavPage } from "../data/mockKernel";
import { pageOrder } from "../data/mockKernel";

type SidebarProps = {
  activePage: NavPage;
  onSelect: (page: NavPage) => void;
};

export function Sidebar({ activePage, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-panel">
        <div className="brand-mark">NC</div>
        <div>
          <p className="brand-eyebrow">CommandCore</p>
          <h1>Nexus Console</h1>
        </div>
      </div>

      <div className="sidebar-section">
        <p className="sidebar-label">Command Centre</p>
        <nav className="nav-list">
          {pageOrder.map((page) => (
            <button
              key={page.id}
              type="button"
              className={`nav-item ${activePage === page.id ? "is-active" : ""}`}
              onClick={() => onSelect(page.id)}
            >
              <span className="nav-short">{page.short}</span>
              <span className="nav-label-wrap">
                <span>{page.label}</span>
                <span className={`nav-dot ${activePage === page.id ? "is-active" : ""}`} />
              </span>
            </button>
          ))}
        </nav>
      </div>

      <div className="sidebar-footer">
        <p>Alpha-5.2 Command Centre</p>
        <span>Live telemetry + executive surfaces</span>
      </div>
    </aside>
  );
}
