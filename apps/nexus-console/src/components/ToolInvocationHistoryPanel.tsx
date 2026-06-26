import { toolPermissionTone, type ToolInvocationRecord } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type ToolInvocationHistoryPanelProps = {
  invocations: {
    active: ToolInvocationRecord[];
    completed: ToolInvocationRecord[];
    failed: ToolInvocationRecord[];
  };
};

export function ToolInvocationHistoryPanel({ invocations }: ToolInvocationHistoryPanelProps) {
  const rows = [...invocations.active, ...invocations.completed, ...invocations.failed];

  return (
    <section className="panel surface tool-invocation-history-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Recent Invocation History</h3>
          <span>{rows.length ? `${rows.length} invocation records` : "No invocation history yet"}</span>
        </div>
      </div>

      {rows.length ? (
        <div className="panel-rows">
          {rows.map((invocation) => (
            <div key={invocation.invocationId} className="data-row">
              <div>
                <strong>{invocation.toolId}</strong>
                <p>
                  {invocation.agentId ?? "Unassigned"}
                  {invocation.capabilityId ? ` / ${invocation.capabilityId}` : ""}
                </p>
              </div>
              <div className="row-meta">
                <StatusBadge tone={toolPermissionTone(invocation.permissionLevel)}>{invocation.status}</StatusBadge>
                {invocation.error ? <span>{invocation.error}</span> : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Invocation History Yet</strong>
          <p>Tool invocation telemetry will appear here once tools are invoked.</p>
        </div>
      )}
    </section>
  );
}
