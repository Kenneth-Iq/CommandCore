import type { MissionCentreData } from "../data/mockKernel";

type MissionStatusBreakdownProps = {
  counts: MissionCentreData["counts"];
  throughput: MissionCentreData["throughput"];
  assignedAgentCount: number;
};

export function MissionStatusBreakdown({ counts, throughput, assignedAgentCount }: MissionStatusBreakdownProps) {
  const segments = [
    { label: "Active", value: counts.active, tone: "active" },
    { label: "Completed", value: counts.completed, tone: "complete" },
    { label: "Failed", value: counts.failed, tone: "warning" },
  ];
  const total = Math.max(counts.total, 1);
  const completionPercent = Math.round(throughput.completionRate * 100);

  return (
    <section className="panel surface mission-breakdown-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Mission Status Breakdown</h3>
          <span>{counts.total} mission records / {completionPercent}% completion rate</span>
        </div>
      </div>

      {counts.total ? (
        <div className="mission-breakdown-bar">
          {segments.map((segment) => (
            <span
              key={segment.label}
              className={`mission-breakdown-segment tone-${segment.tone}`}
              style={{ width: `${(segment.value / total) * 100}%` }}
            />
          ))}
        </div>
      ) : null}

      <div className="mission-breakdown-legend">
        {segments.map((segment) => (
          <div key={segment.label} className="mission-breakdown-item">
            <span className={`mission-breakdown-dot tone-${segment.tone}`} />
            <strong>{segment.value}</strong>
            <span>{segment.label}</span>
          </div>
        ))}
        <div className="mission-breakdown-item">
          <strong>{assignedAgentCount}</strong>
          <span>Assigned Agents</span>
        </div>
      </div>

      {!counts.total ? (
        <div className="empty-state">
          <strong>No Mission Records Yet</strong>
          <p>Mission status breakdown will appear once missions are created.</p>
        </div>
      ) : null}
    </section>
  );
}
