import type { ActivityItem, NavPage, StatusTone } from "../data/mockKernel";
import type { RouteSelection } from "../routing";
import { StatusBadge } from "./StatusBadge";

type ExecutiveAlert = ActivityItem & {
  page: NavPage;
  severity: "Critical" | "High" | "Medium" | "Low" | "Resolved";
};

type ExecutiveAlertsProps = {
  items: ExecutiveAlert[];
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

const groups: Array<ExecutiveAlert["severity"]> = ["Critical", "High", "Medium", "Low", "Resolved"];

export function ExecutiveAlerts({ items, onNavigate }: ExecutiveAlertsProps) {
  return (
    <section className="panel surface executive-alerts-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Executive Alerts</h3>
          <span>{items.length ? `${items.length} executive alerts grouped by urgency.` : "No executive alerts in the current focus mode."}</span>
        </div>
      </div>
      <div className="executive-alert-grid">
        {groups.map((severity) => {
          const grouped = items.filter((item) => item.severity === severity);
          return (
            <article key={severity} className="executive-alert-column">
              <div className="attention-group-header">
                <strong>{severity}</strong>
                <StatusBadge tone={toneForSeverity(severity)}>{grouped.length}</StatusBadge>
              </div>
              {grouped.length ? (
                <div className="attention-group-list">
                  {grouped.map((item) => (
                    <button key={item.id} type="button" className="attention-route-card" onClick={() => onNavigate(item.page)}>
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
                  <strong>No {severity} Alerts</strong>
                  <p>{emptyCopyForSeverity(severity)}</p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function severityFromTone(tone: ActivityItem["tone"]): ExecutiveAlert["severity"] {
  switch (tone) {
    case "blocked":
      return "Critical";
    case "warning":
      return "High";
    case "active":
      return "Medium";
    case "idle":
    case undefined:
      return "Low";
    case "complete":
    case "ready":
      return "Resolved";
  }
}

function toneForSeverity(severity: ExecutiveAlert["severity"]): StatusTone {
  switch (severity) {
    case "Critical":
      return "blocked";
    case "High":
      return "warning";
    case "Medium":
      return "active";
    case "Resolved":
      return "complete";
    default:
      return "idle";
  }
}

function emptyCopyForSeverity(severity: ExecutiveAlert["severity"]): string {
  switch (severity) {
    case "Critical":
      return "No critical blockers are visible.";
    case "High":
      return "No high-priority warnings are active.";
    case "Medium":
      return "No medium-priority activity needs attention.";
    case "Resolved":
      return "No recently resolved items are highlighted.";
    default:
      return "Low-priority informational signals will appear here.";
  }
}
