import type { ActivityItem, NavPage } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type OperationalTimelineItem = ActivityItem & {
  page: NavPage;
  category: string;
};

type OperationalTimelineProps = {
  items: OperationalTimelineItem[];
  onNavigate: (page: NavPage) => void;
};

export function OperationalTimeline({ items, onNavigate }: OperationalTimelineProps) {
  const visibleItems = items.filter((item) => item.eventName !== "NoRecentActivity");

  return (
    <section className="panel surface operational-timeline-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Unified Timeline</h3>
          <span>{visibleItems.length ? `${visibleItems.length} mission, agent, tool, memory, and readiness signals` : "No operational signals published yet"}</span>
        </div>
      </div>

      {visibleItems.length ? (
        <div className="timeline-feed">
          {visibleItems.map((item) => (
            <article key={item.id} className="timeline-feed-item">
              <div className={`event-rail tone-${item.tone ?? "idle"}`} />
              <div className="timeline-feed-body">
                <div className="timeline-feed-header">
                  <div>
                    <strong>{item.eventName}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <div className="timeline-feed-meta">
                    <StatusBadge tone={item.tone ?? "idle"}>{item.occurredAt}</StatusBadge>
                    <span>{item.category}</span>
                  </div>
                </div>
                <div className="timeline-feed-footer">
                  <span className="event-source">{item.source}</span>
                  <button type="button" className="route-chip" onClick={() => onNavigate(item.page)}>
                    Open {pageLabel(item.page)}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Unified Timeline Signals</strong>
          <p>Operational activity will aggregate here as missions, agents, tools, conversations, knowledge, and readiness publish updates.</p>
        </div>
      )}
    </section>
  );
}

function pageLabel(page: NavPage): string {
  switch (page) {
    case "kernel":
      return "Home";
    case "workspaces":
      return "Portfolio";
    default:
      return page.charAt(0).toUpperCase() + page.slice(1);
  }
}
