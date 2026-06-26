import type { PageData } from "../data/mockKernel";
import type { ExecutiveSimulationState } from "../simulation";
import { StatusBadge } from "./StatusBadge";

type HealthWallProps = {
  healthStatus: PageData["status"];
  readinessStatus: PageData["status"];
  simulation: ExecutiveSimulationState;
};

export function HealthWall({ healthStatus, readinessStatus, simulation }: HealthWallProps) {
  return (
    <div className="health-wall">
      <div className="status-wall-grid">
        <div className="status-wall-chip">
          <StatusBadge tone={healthStatus.tone}>{healthStatus.label}</StatusBadge>
          <span>Health</span>
        </div>
        <div className="status-wall-chip">
          <StatusBadge tone={readinessStatus.tone}>{readinessStatus.label}</StatusBadge>
          <span>Readiness</span>
        </div>
        <div className="status-wall-chip">
          <strong>{simulation.healthScore}</strong>
          <span>Simulated Score</span>
        </div>
        <div className="status-wall-chip">
          <strong>{simulation.tick}</strong>
          <span>Simulation Tick</span>
        </div>
      </div>
      <div className="health-score-bar">
        <div className={`health-score-fill tone-${healthStatus.tone}`} style={{ width: `${simulation.healthScore}%` }} />
      </div>
    </div>
  );
}
