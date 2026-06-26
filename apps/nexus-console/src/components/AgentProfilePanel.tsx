import { agentRuntimeTone, type AgentProfile, type NavPage } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type AgentProfilePanelProps = {
  profiles: AgentProfile[];
  onNavigate: (page: NavPage) => void;
};

export function AgentProfilePanel({ profiles, onNavigate }: AgentProfilePanelProps) {
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
            <article key={agent.agentId} className="mission-card">
              <div className="mission-card-header">
                <strong>{agent.name}</strong>
                <StatusBadge tone={agentRuntimeTone(agent.runtimeStatus)}>{agent.runtimeStatus}</StatusBadge>
              </div>
              <p className="mission-card-id">{agent.role} / {agent.agentId}</p>
              <div className="mission-chip-row">
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
                    onClick={() => onNavigate("missions")}
                  >
                    {missionId}
                  </button>
                ))}
              </div>
              {agent.stateSummary ? <p className="agent-profile-summary">{agent.stateSummary}</p> : null}
              {agent.missionQueue.length ? (
                <div className="route-chip-row mission-route-row">
                  <button type="button" className="route-chip" onClick={() => onNavigate("missions")}>
                    Agent → Missions
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
