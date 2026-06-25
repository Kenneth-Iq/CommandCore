import type { ActivityItem } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type ActivityFeedProps = {
  title: string;
  items: ActivityItem[];
};

export function ActivityFeed({ title, items }: ActivityFeedProps) {
  return (
    <section className="panel surface activity-panel">
      <div className="panel-header">
        <h3>{title}</h3>
      </div>
      <div className="activity-list">
        {items.map((item) => (
          <article key={item.id} className="activity-item">
            <div className="activity-main">
              <div className="activity-title-line">
                <strong>{item.eventName}</strong>
                {item.tone ? <StatusBadge tone={item.tone}>{item.occurredAt}</StatusBadge> : null}
              </div>
              <p>{item.detail}</p>
            </div>
            <span className="activity-source">{item.source}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
