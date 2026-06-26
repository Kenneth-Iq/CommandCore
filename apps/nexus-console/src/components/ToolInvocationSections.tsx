import { toolPermissionTone, type StatusTone, type ToolInvocationRecord } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type ToolInvocationSectionsProps = {
  active: ToolInvocationRecord[];
  completed: ToolInvocationRecord[];
  failed: ToolInvocationRecord[];
};

type SectionProps = {
  title: string;
  tone: StatusTone;
  invocations: ToolInvocationRecord[];
  emptyMessage: string;
};

function InvocationSection({ title, tone, invocations, emptyMessage }: SectionProps) {
  return (
    <section className="panel surface mission-section-panel">
      <div className="panel-header mission-section-header">
        <div className="panel-title-stack">
          <h3>{title}</h3>
          <span>
            {invocations.length ? `${invocations.length} invocation${invocations.length === 1 ? "" : "s"}` : "None currently"}
          </span>
        </div>
        <StatusBadge tone={tone}>{invocations.length}</StatusBadge>
      </div>

      {invocations.length ? (
        <div className="mission-card-list">
          {invocations.map((invocation) => (
            <article key={invocation.invocationId} className="mission-card">
              <div className="mission-card-header">
                <strong>{invocation.toolId}</strong>
                <StatusBadge tone={toolPermissionTone(invocation.permissionLevel)}>
                  {invocation.permissionLevel}
                </StatusBadge>
              </div>
              <p className="mission-card-id">{invocation.invocationId}</p>
              <div className="mission-chip-row">
                {invocation.agentId ? <span className="mission-chip">{invocation.agentId}</span> : null}
                {invocation.capabilityId ? (
                  <span className="mission-chip mission-chip-muted">{invocation.capabilityId}</span>
                ) : null}
              </div>
              {invocation.error ? <p className="agent-profile-summary">{invocation.error}</p> : null}
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

export function ToolInvocationSections({ active, completed, failed }: ToolInvocationSectionsProps) {
  return (
    <section className="mission-status-grid">
      <InvocationSection
        title="Active Invocations"
        tone="active"
        invocations={active}
        emptyMessage="No tool invocations are currently running."
      />
      <InvocationSection
        title="Completed Invocations"
        tone="complete"
        invocations={completed}
        emptyMessage="No tool invocations have completed yet."
      />
      <InvocationSection
        title="Failed Invocations"
        tone="warning"
        invocations={failed}
        emptyMessage="No tool invocation failures recorded."
      />
    </section>
  );
}
