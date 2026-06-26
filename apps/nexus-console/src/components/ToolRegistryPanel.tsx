import { toolPermissionTone, type NavPage, type ToolRecord } from "../data/mockKernel";
import type { RouteSelection } from "../routing";
import { StatusBadge } from "./StatusBadge";

type ToolRegistryPanelProps = {
  tools: ToolRecord[];
  selectedToolId?: string;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function ToolRegistryPanel({ tools, selectedToolId, onNavigate }: ToolRegistryPanelProps) {
  return (
    <section className="panel surface tool-registry-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Tool Registry</h3>
          <span>{tools.length ? `${tools.length} registered tools` : "No tools registered yet"}</span>
        </div>
      </div>

      {tools.length ? (
        <div className="agent-profile-grid">
          {tools.map((tool) => (
            <article key={tool.toolId} className={`mission-card ${selectedToolId === tool.toolId ? "is-selected" : ""}`}>
              <div className="mission-card-header">
                <strong>{tool.name}</strong>
                <StatusBadge tone={toolPermissionTone(tool.permissionLevel)}>{tool.permissionLevel}</StatusBadge>
              </div>
              <p className="mission-card-id">{tool.toolId}</p>
              <p className="agent-profile-summary">{tool.description}</p>
              <div className="mission-chip-row">
                <button type="button" className="mission-chip route-chip-button" onClick={() => onNavigate("tools", { toolId: tool.toolId })}>
                  Select Tool
                </button>
                {tool.capabilityId ? <span className="mission-chip">{tool.capabilityId}</span> : null}
                {tool.agentId ? (
                  <button
                    type="button"
                    className="mission-chip mission-chip-muted route-chip-button"
                    onClick={() => onNavigate("agents", { agentId: tool.agentId })}
                  >
                    {tool.agentId}
                  </button>
                ) : null}
                <span className="mission-chip mission-chip-muted">{tool.status}</span>
              </div>
              {tool.agentId ? (
                <div className="route-chip-row mission-route-row">
                  <button type="button" className="route-chip" onClick={() => onNavigate("agents", { agentId: tool.agentId })}>
                    Tool → Agent
                  </button>
                  <button type="button" className="route-chip" onClick={() => onNavigate("tools", { toolId: tool.toolId })}>
                    Tool → Invocation
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Tools Registered</strong>
          <p>Tool registry entries will appear here once tools are registered in the runtime.</p>
        </div>
      )}
    </section>
  );
}
