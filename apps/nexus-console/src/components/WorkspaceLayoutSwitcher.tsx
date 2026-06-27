import { useWorkspace } from "../workspaceContext";

export function WorkspaceLayoutSwitcher() {
  const { layouts, activeLayoutId, selectLayout, resetLayout, fullscreenPanelId, exitFullscreen } = useWorkspace();

  return (
    <section className="panel surface workspace-layout-switcher-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Executive Workspace</h3>
          <span>Switch between saved layouts. Panel visibility, size, and the active layout persist locally.</span>
        </div>
      </div>
      <div className="workspace-layout-switcher-row">
        {layouts.map((layout) => (
          <button
            key={layout.id}
            type="button"
            className={layout.id === activeLayoutId ? "route-chip is-active-layout" : "route-chip"}
            onClick={() => selectLayout(layout.id)}
          >
            {layout.label}
          </button>
        ))}
        <button type="button" className="route-chip" onClick={resetLayout}>
          Reset Current Layout
        </button>
        {fullscreenPanelId ? (
          <button type="button" className="route-chip" onClick={exitFullscreen}>
            Exit Fullscreen
          </button>
        ) : null}
      </div>
    </section>
  );
}
