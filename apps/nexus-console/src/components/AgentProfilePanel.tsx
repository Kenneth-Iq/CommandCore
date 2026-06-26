import { agentRuntimeTone, type AgentProfile, type NavPage } from "../data/mockKernel";
import type { RouteSelection } from "../routing";
import { DependencyBadge } from "./DependencyBadge";
import { FavouriteToggle } from "./FavouriteToggle";
import { StatusBadge } from "./StatusBadge";

type AgentProfilePanelProps = {
  profiles: AgentProfile[];
  selectedAgentId?: string;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
  isFavourite?: (agentId: string) => boolean;
  onToggleFavourite?: (agentId: string) => void;
};

export function AgentProfilePanel({ profiles, selectedAgentId, onNavigate, isFavourite, onToggleFavourite }: AgentProfilePanelProps) {
  return (
    <section className="panel surface agent-profile-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Agent Profiles</h3>
          <span>{profiles.length ? `${profiles.length} registered agents` : "No agents registered yet"}</span>
        </div>
      </div>

      {profiles.length ? (
        <div className="agent-profile-grid">
          {profiles.map((agent) => (
            <article key={agent.agentId} className={`mission-card ${selectedAgentId === agent.agentId ? "is-selected" : ""}`}>
              <div className="mission-card-header">
                <span className="mission-card-header-lead">
                  {onToggleFavourite ? (
                    <FavouriteToggle
                      active={isFavourite?.(agent.agentId) ?? false}
                      onToggle={() => onToggleFavourite(agent.agentId)}
                      label="favourite agent"
                    />
                  ) : null}
                  <strong>{agent.name}</strong>
                </span>
                <span className="mission-card-header-badges">
                  <DependencyBadge count={agent.capabilityIds.length} label="capability deps" />
                  <StatusBadge tone={agentRuntimeTone(agent.runtimeStatus)}>{agent.runtimeStatus}</StatusBadge>
                </span>
              </div>
              <p className="mission-card-id">{agent.role} / {agent.agentId}</p>
              <div className="mission-chip-row">
                <button type="button" className="mission-chip route-chip-button" onClick={() => onNavigate("agents", { agentId: agent.agentId })}>
                  Select Agent
                </button>
                {agent.capabilityIds.map((capabilityId) => (
                  <span key={capabilityId} className="mission-chip">
                    {capabilityId}
                  </span>
                ))}
                {agent.missionQueue.map((missionId) => (
                  <button
                    key={missionId}
                    type="button"
                    className="mission-chip mission-chip-muted route-chip-button"
                    onClick={() => onNavigate("missions", { missionId })}
                  >
                    {missionId}
                  </button>
                ))}
              </div>
              {agent.stateSummary ? <p className="agent-profile-summary">{agent.stateSummary}</p> : null}
              {agent.missionQueue.length ? (
                <div className="route-chip-row mission-route-row">
                  <button type="button" className="route-chip" onClick={() => onNavigate("missions", { missionId: agent.missionQueue[0] })}>
                    Agent → Mission
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Agents Registered</strong>
          <p>Agent profile cards will appear here once agents are registered in the runtime.</p>
        </div>
      )}
    </section>
  );
}
