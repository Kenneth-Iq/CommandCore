import type { ActivityItem } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type EventFeedProps = {
  title: string;
  items: ActivityItem[];
  emptyMessage?: string;
};

export function EventFeed({ title, items, emptyMessage = "No events available." }: EventFeedProps) {
  const hasEvents = items.length > 0 && items[0]?.eventName !== "NoRecentActivity";

  return (
    <section className="panel surface event-panel">
      <div className="panel-header">
        <h3>{title}</h3>
      </div>

      {hasEvents ? (
        <div className="event-list">
          {items.map((item) => (
            <article key={item.id} className="event-item">
              <div className="event-title-line">
                <strong>{item.eventName}</strong>
                <StatusBadge tone={item.tone ?? "idle"}>{item.occurredAt}</StatusBadge>
              </div>
              <p>{item.detail}</p>
              <span className="event-source">{item.source}</span>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Recent Events</strong>
          <p>{items[0]?.detail ?? emptyMessage}</p>
        </div>
      )}
    </section>
  );
}
