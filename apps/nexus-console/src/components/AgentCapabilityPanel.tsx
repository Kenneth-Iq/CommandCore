import type { AgentProfile } from "../data/mockKernel";

type AgentCapabilityPanelProps = {
  profiles: AgentProfile[];
};

type CapabilityEntry = {
  capabilityId: string;
  agentNames: string[];
};

function buildCapabilityMap(profiles: AgentProfile[]): CapabilityEntry[] {
  const map = new Map<string, string[]>();
  profiles.forEach((agent) => {
    agent.capabilityIds.forEach((capabilityId) => {
      const existing = map.get(capabilityId) ?? [];
      existing.push(agent.name);
      map.set(capabilityId, existing);
    });
  });
  return Array.from(map.entries()).map(([capabilityId, agentNames]) => ({ capabilityId, agentNames }));
}

export function AgentCapabilityPanel({ profiles }: AgentCapabilityPanelProps) {
  const capabilities = buildCapabilityMap(profiles);

  return (
    <section className="panel surface agent-capability-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Agent Capability Panel</h3>
          <span>{capabilities.length ? `${capabilities.length} capabilities covered` : "No capabilities registered yet"}</span>
        </div>
      </div>

      {capabilities.length ? (
        <div className="agent-capability-list">
          {capabilities.map(({ capabilityId, agentNames }) => (
            <div key={capabilityId} className="agent-capability-item">
              <span className="mission-chip">{capabilityId}</span>
              <span className="agent-capability-agents">{agentNames.join(", ")}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Capabilities Yet</strong>
          <p>Agent capabilities will appear here once agents are registered with capability assignments.</p>
        </div>
      )}
    </section>
  );
}
