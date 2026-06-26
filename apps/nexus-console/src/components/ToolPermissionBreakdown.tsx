import type { ToolCentreData } from "../data/mockKernel";
import { toolPermissionTone } from "../data/mockKernel";

type ToolPermissionBreakdownProps = {
  counts: ToolCentreData["counts"];
  invocationCounts: ToolCentreData["invocationCounts"];
  permissionBreakdown: ToolCentreData["permissionBreakdown"];
};

export function ToolPermissionBreakdown({
  counts,
  invocationCounts,
  permissionBreakdown,
}: ToolPermissionBreakdownProps) {
  const permissionEntries = Object.entries(permissionBreakdown);
  const permissionTotal = Math.max(
    permissionEntries.reduce((sum, [, value]) => sum + value, 0),
    1,
  );

  return (
    <section className="panel surface mission-breakdown-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Tool Permission &amp; Status Breakdown</h3>
          <span>
            {counts.total} registered tools / {invocationCounts.total} invocations observed
          </span>
        </div>
      </div>

      {permissionEntries.length ? (
        <div className="mission-breakdown-bar">
          {permissionEntries.map(([level, value]) => (
            <span
              key={level}
              className={`mission-breakdown-segment tone-${toolPermissionTone(level)}`}
              style={{ width: `${(value / permissionTotal) * 100}%` }}
            />
          ))}
        </div>
      ) : null}

      <div className="mission-breakdown-legend">
        {permissionEntries.map(([level, value]) => (
          <div key={level} className="mission-breakdown-item">
            <span className={`mission-breakdown-dot tone-${toolPermissionTone(level)}`} />
            <strong>{value}</strong>
            <span>{level}</span>
          </div>
        ))}
        <div className="mission-breakdown-item">
          <strong>{invocationCounts.running}</strong>
          <span>Running</span>
        </div>
        <div className="mission-breakdown-item">
          <strong>{invocationCounts.completed}</strong>
          <span>Completed</span>
        </div>
        <div className="mission-breakdown-item">
          <strong>{invocationCounts.failed}</strong>
          <span>Failed</span>
        </div>
      </div>

      {!permissionEntries.length ? (
        <div className="empty-state">
          <strong>No Tools Registered Yet</strong>
          <p>Permission and status breakdown will appear once tools are registered.</p>
        </div>
      ) : null}
    </section>
  );
}
