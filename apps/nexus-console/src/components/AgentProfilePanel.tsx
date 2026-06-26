import { agentRuntimeTone, type AgentProfile } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type AgentProfilePanelProps = {
  profiles: AgentProfile[];
};

export function AgentProfilePanel({ profiles }: AgentProfilePanelProps) {
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
                  <span key={missionId} className="mission-chip mission-chip-muted">
                    {missionId}
                  </span>
                ))}
              </div>
              {agent.stateSummary ? <p className="agent-profile-summary">{agent.stateSummary}</p> : null}
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
