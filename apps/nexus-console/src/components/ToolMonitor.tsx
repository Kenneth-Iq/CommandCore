import type { PageData } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type ToolMonitorProps = {
  page: PageData;
};

export function ToolMonitor({ page }: ToolMonitorProps) {
  const rows = [...page.primaryPanel.rows, ...page.secondaryPanel.rows].slice(0, 6);

  return (
    <section className="panel surface monitor-panel">
      <div className="panel-header">
        <h3>Tool Monitor</h3>
      </div>
      {rows.length ? (
        <div className="monitor-list">
          {rows.map((row) => (
            <article key={`${row.title}-${row.subtitle ?? ""}`} className="monitor-item">
              <div className="monitor-copy">
                <strong>{row.title}</strong>
                <p>{row.subtitle ?? "Runtime telemetry visible."}</p>
              </div>
              <div className="monitor-meta">
                {row.badge ? (
                  <StatusBadge tone={row.badgeTone ?? "idle"}>{row.badge}</StatusBadge>
                ) : null}
                {row.meta ? <span>{row.meta}</span> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Tool Telemetry Yet</strong>
          <p>{page.emptyState ?? "Tool activity will appear here when invocations are visible."}</p>
        </div>
      )}
    </section>
  );
}
