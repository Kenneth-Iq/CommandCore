import { missionStatusTone, type MissionRecord, type StatusTone } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type MissionSectionListProps = {
  title: string;
  tone: StatusTone;
  records: MissionRecord[];
  emptyMessage: string;
};

export function MissionSectionList({ title, tone, records, emptyMessage }: MissionSectionListProps) {
  return (
    <section className="panel surface mission-section-panel">
      <div className="panel-header mission-section-header">
        <div className="panel-title-stack">
          <h3>{title}</h3>
          <span>{records.length ? `${records.length} mission${records.length === 1 ? "" : "s"}` : "None currently"}</span>
        </div>
        <StatusBadge tone={tone}>{records.length}</StatusBadge>
      </div>

      {records.length ? (
        <div className="mission-card-list">
          {records.map((mission) => (
            <article key={mission.missionId} className="mission-card">
              <div className="mission-card-header">
                <strong>{mission.title}</strong>
                <StatusBadge tone={missionStatusTone(mission.status)}>{mission.status}</StatusBadge>
              </div>
              <p className="mission-card-id">{mission.missionId}</p>
              <div className="mission-chip-row">
                {mission.assignedAgentId ? <span className="mission-chip">{mission.assignedAgentId}</span> : null}
                {mission.capabilityIds.map((capabilityId) => (
                  <span key={capabilityId} className="mission-chip mission-chip-muted">
                    {capabilityId}
                  </span>
                ))}
                {typeof mission.taskCount === "number" ? (
                  <span className="mission-chip mission-chip-muted">{mission.taskCount} tasks</span>
                ) : null}
              </div>
            </article>
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
