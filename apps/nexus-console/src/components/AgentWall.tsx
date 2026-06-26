import { agentRuntimeTone, type NavPage } from "../data/mockKernel";
import type { RouteSelection } from "../routing";
import type { ExecutiveSimulationState } from "../simulation";
import type { WorldData } from "../worldModel";
import { StatusBadge } from "./StatusBadge";

type AgentWallProps = {
  world: WorldData;
  simulation: ExecutiveSimulationState;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function AgentWall({ world, simulation, onNavigate }: AgentWallProps) {
  const { counts } = world.agentCentre;
  const agents = world.agentCentre.profiles.slice(0, 5);

  return (
    <div className="agent-wall">
      <div className="status-wall-grid">
        <div className="status-wall-chip">
          <strong>{counts.total}</strong>
          <span>Total</span>
        </div>
        <div className="status-wall-chip">
          <strong>{counts.available}</strong>
          <span>Available</span>
        </div>
        <div className="status-wall-chip">
          <strong>{counts.busy}</strong>
          <span>Busy</span>
        </div>
        <div className="status-wall-chip">
          <strong>{counts.offline}</strong>
          <span>Offline</span>
        </div>
      </div>
      <div className="mission-wall-list">
        {agents.map((agent) => (
          <button key={agent.agentId} type="button" className="mission-wall-row" onClick={() => onNavigate("agents", { agentId: agent.agentId })}>
            <span>{agent.name}</span>
            <StatusBadge tone={agentRuntimeTone(agent.runtimeStatus)}>
              {simulation.agents[agent.agentId]?.activity ?? agent.runtimeStatus}
            </StatusBadge>
          </button>
        ))}
      </div>
    </div>
  );
}
