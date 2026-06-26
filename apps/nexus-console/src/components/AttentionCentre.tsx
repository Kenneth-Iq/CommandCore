import type { ActivityItem, NavPage, StatusTone } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type AttentionItem = ActivityItem & {
  page: NavPage;
  group: "Critical" | "Warning" | "Info" | "Completed";
};

type AttentionCentreProps = {
  items: AttentionItem[];
  onNavigate: (page: NavPage) => void;
};

const orderedGroups: Array<AttentionItem["group"]> = ["Critical", "Warning", "Info", "Completed"];

export function AttentionCentre({ items, onNavigate }: AttentionCentreProps) {
  const grouped = orderedGroups.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  }));

  return (
    <section className="panel surface attention-centre-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Attention Centre</h3>
          <span>{items.length ? `${items.length} routed signals grouped by urgency` : "No grouped attention signals right now"}</span>
        </div>
      </div>

      <div className="attention-group-grid">
        {grouped.map((entry) => (
          <article key={entry.group} className="attention-group-card">
            <div className="attention-group-header">
              <strong>{entry.group}</strong>
              <StatusBadge tone={toneForGroup(entry.group)}>{entry.items.length}</StatusBadge>
            </div>
            {entry.items.length ? (
              <div className="attention-group-list">
                {entry.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="attention-route-card"
                    onClick={() => onNavigate(item.page)}
                  >
                    <div className={`attention-dot tone-${item.tone ?? "idle"}`} />
                    <div className="attention-copy">
                      <div className="attention-title-line">
                        <strong>{item.eventName}</strong>
                        <StatusBadge tone={item.tone ?? "idle"}>{item.occurredAt}</StatusBadge>
                      </div>
                      <p>{item.detail}</p>
                      <span className="event-source">{item.source}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state compact-empty">
                <strong>No {entry.group} Signals</strong>
                <p>{emptyCopyForGroup(entry.group)}</p>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function toneForGroup(group: AttentionItem["group"]): StatusTone {
  switch (group) {
    case "Critical":
      return "blocked";
    case "Warning":
      return "warning";
    case "Completed":
      return "complete";
    default:
      return "active";
  }
}

function emptyCopyForGroup(group: AttentionItem["group"]): string {
  switch (group) {
    case "Critical":
      return "No blocked or critical operating issues are visible.";
    case "Warning":
      return "No warning-level signals need review.";
    case "Completed":
      return "No recent completions are highlighted yet.";
    default:
      return "Informational runtime updates will appear here.";
  }
}
