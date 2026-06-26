import { missionStatusTone, type NavPage } from "../data/mockKernel";
import type { RouteSelection } from "../routing";
import type { WorldData } from "../worldModel";
import { StatusBadge } from "./StatusBadge";

type MissionWallProps = {
  world: WorldData;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function MissionWall({ world, onNavigate }: MissionWallProps) {
  const { counts } = world.missionCentre;
  const topMissions = [...world.missionCentre.active, ...world.missionCentre.failed].slice(0, 4);

  return (
    <div className="mission-wall">
      <div className="status-wall-grid">
        <div className="status-wall-chip">
          <strong>{counts.total}</strong>
          <span>Total</span>
        </div>
        <div className="status-wall-chip">
          <strong>{counts.active}</strong>
          <span>Active</span>
        </div>
        <div className="status-wall-chip">
          <strong>{counts.completed}</strong>
          <span>Completed</span>
        </div>
        <div className="status-wall-chip">
          <strong>{counts.failed}</strong>
          <span>Failed</span>
        </div>
      </div>
      <div className="mission-wall-list">
        {topMissions.map((mission) => (
          <button key={mission.missionId} type="button" className="mission-wall-row" onClick={() => onNavigate("missions", { missionId: mission.missionId })}>
            <span>{mission.title}</span>
            <StatusBadge tone={missionStatusTone(mission.status)}>{mission.status}</StatusBadge>
          </button>
        ))}
      </div>
    </div>
  );
}
