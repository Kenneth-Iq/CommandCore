import type { ActivityItem } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type AttentionPanelProps = {
  items: ActivityItem[];
};

export function AttentionPanel({ items }: AttentionPanelProps) {
  const actionable = items.filter((item) => item.eventName !== "NoRecentActivity");

  return (
    <section className="panel surface attention-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Attention Panel</h3>
          <span>{actionable.length ? `${actionable.length} items need review` : "No immediate intervention required"}</span>
        </div>
      </div>

      {actionable.length ? (
        <div className="attention-list">
          {actionable.map((item) => (
            <article key={item.id} className="attention-item">
              <div className={`attention-dot tone-${item.tone ?? "idle"}`} />
              <div className="attention-copy">
                <div className="attention-title-line">
                  <strong>{item.eventName}</strong>
                  <StatusBadge tone={item.tone ?? "idle"}>{item.occurredAt}</StatusBadge>
                </div>
                <p>{item.detail}</p>
                <span className="event-source">{item.source}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Immediate Attention Needed</strong>
          <p>Readiness, mission flow, agent runtime, tool runtime, and policy signals are currently clear.</p>
        </div>
      )}
    </section>
  );
}
