import type { MissionAgentExecution, StatusTone } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type ExecutionGroups = {
  active: MissionAgentExecution[];
  completed: MissionAgentExecution[];
  failed: MissionAgentExecution[];
};

type MissionAgentAssignmentPanelProps = {
  executions: ExecutionGroups;
  title?: string;
  emptyMessage?: string;
};

export function MissionAgentAssignmentPanel({
  executions,
  title = "Agent Assignment Panel",
  emptyMessage = "Agent execution telemetry will appear here once missions are assigned to runtime agents.",
}: MissionAgentAssignmentPanelProps) {
  const rows = [
    ...executions.active.map((item) => ({ ...item, tone: "active" as StatusTone })),
    ...executions.completed.map((item) => ({ ...item, tone: "complete" as StatusTone })),
    ...executions.failed.map((item) => ({ ...item, tone: "warning" as StatusTone })),
  ];

  return (
    <section className="panel surface mission-assignment-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>{title}</h3>
          <span>{rows.length ? `${rows.length} execution records` : "No assignment activity yet"}</span>
        </div>
      </div>

      {rows.length ? (
        <div className="panel-rows">
          {rows.map((execution) => (
            <div key={execution.executionId} className="data-row">
              <div>
                <strong>{execution.agentId}</strong>
                <p>
                  {execution.missionId ?? "Unscoped"}
                  {execution.taskId ? ` / ${execution.taskId}` : ""}
                  {execution.capabilityId ? ` / ${execution.capabilityId}` : ""}
                </p>
              </div>
              <div className="row-meta">
                <StatusBadge tone={execution.tone}>{execution.status}</StatusBadge>
                {execution.error ? <span>{execution.error}</span> : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Agent Assignments Yet</strong>
          <p>{emptyMessage}</p>
        </div>
      )}
    </section>
  );
}
