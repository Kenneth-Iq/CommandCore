import { missionStatusTone, type AgentAssignmentRecord } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type AgentAssignmentHistoryPanelProps = {
  assignments: AgentAssignmentRecord[];
};

export function AgentAssignmentHistoryPanel({ assignments }: AgentAssignmentHistoryPanelProps) {
  return (
    <section className="panel surface agent-assignment-history-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Mission Assignment History</h3>
          <span>{assignments.length ? `${assignments.length} assignment records` : "No assignment history yet"}</span>
        </div>
      </div>

      {assignments.length ? (
        <div className="panel-rows">
          {assignments.map((assignment) => (
            <div key={assignment.assignmentId} className="data-row">
              <div>
                <strong>{assignment.agentId}</strong>
                <p>
                  {assignment.missionId ?? "Unscoped"}
                  {assignment.taskId ? ` / ${assignment.taskId}` : ""}
                  {assignment.capabilityId ? ` / ${assignment.capabilityId}` : ""}
                </p>
              </div>
              <div className="row-meta">
                <StatusBadge tone={missionStatusTone(assignment.status)}>{assignment.status}</StatusBadge>
                {assignment.error ? <span>{assignment.error}</span> : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Assignment History Yet</strong>
          <p>Mission assignment records will appear here once agents are assigned to missions.</p>
        </div>
      )}
    </section>
  );
}
