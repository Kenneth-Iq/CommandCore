import type { AgentProfile, StatusTone } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type AgentStatusSectionsProps = {
  active: AgentProfile[];
  idle: AgentProfile[];
  failed: AgentProfile[];
};

type SectionProps = {
  title: string;
  tone: StatusTone;
  agents: AgentProfile[];
  emptyMessage: string;
};

function AgentStatusSection({ title, tone, agents, emptyMessage }: SectionProps) {
  return (
    <section className="panel surface agent-status-section">
      <div className="panel-header mission-section-header">
        <div className="panel-title-stack">
          <h3>{title}</h3>
          <span>{agents.length ? `${agents.length} agent${agents.length === 1 ? "" : "s"}` : "None currently"}</span>
        </div>
        <StatusBadge tone={tone}>{agents.length}</StatusBadge>
      </div>

      {agents.length ? (
        <div className="agent-status-list">
          {agents.map((agent) => (
            <div key={agent.agentId} className="agent-status-row">
              <div>
                <strong>{agent.name}</strong>
                <p>{agent.role}</p>
              </div>
              <span className="agent-status-id">{agent.agentId}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>Nothing Here Yet</strong>
          <p>{emptyMessage}</p>
        </div>
      )}
    </section>
  );
}

export function AgentStatusSections({ active, idle, failed }: AgentStatusSectionsProps) {
  return (
    <section className="mission-status-grid">
      <AgentStatusSection
        title="Active Agents"
        tone="active"
        agents={active}
        emptyMessage="No agents are currently executing work."
      />
      <AgentStatusSection
        title="Idle Agents"
        tone="ready"
        agents={idle}
        emptyMessage="No agents are currently idle."
      />
      <AgentStatusSection
        title="Failed Agents"
        tone="warning"
        agents={failed}
        emptyMessage="No agents have recent execution failures."
      />
    </section>
  );
}
