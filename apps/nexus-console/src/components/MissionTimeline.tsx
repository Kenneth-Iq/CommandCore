import type { ActivityItem, PageData } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type MissionTimelineProps = {
  page: PageData;
};

function combinedTimeline(page: PageData): Array<{ id: string; title: string; detail: string; badge: string; tone: ActivityItem["tone"] }> {
  const rows = [page.primaryPanel, page.secondaryPanel, page.tertiaryPanel]
    .filter(Boolean)
    .flatMap((panel) => panel?.rows ?? []);

  const rowItems = rows.slice(0, 4).map((row, index) => ({
    id: `row-${index}-${row.title}`,
    title: row.title,
    detail: row.subtitle ?? row.meta ?? "Operational state visible.",
    badge: row.badge ?? row.meta ?? "Tracked",
    tone: row.badgeTone ?? "idle",
  }));

  const activityItems = page.activity.slice(0, 4).map((item) => ({
    id: item.id,
    title: item.eventName,
    detail: item.detail,
    badge: item.occurredAt,
    tone: item.tone ?? "idle",
  }));

  return [...rowItems, ...activityItems].slice(0, 6);
}

export function MissionTimeline({ page }: MissionTimelineProps) {
  const timeline = combinedTimeline(page);

  return (
    <section className="panel surface timeline-panel">
      <div className="panel-header">
        <h3>Mission Timeline</h3>
      </div>
      {timeline.length ? (
        <div className="timeline-list">
          {timeline.map((item, index) => (
            <article key={item.id} className="timeline-item">
              <div className="timeline-rail">
                <span className="timeline-dot" />
                {index < timeline.length - 1 ? <span className="timeline-line" /> : null}
              </div>
              <div className="timeline-content">
                <div className="timeline-title-line">
                  <strong>{item.title}</strong>
                  <StatusBadge tone={item.tone ?? "idle"}>{item.badge}</StatusBadge>
                </div>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Mission Events Yet</strong>
          <p>{page.emptyState ?? "Mission activity will appear here once the runtime emits events."}</p>
        </div>
      )}
    </section>
  );
}
