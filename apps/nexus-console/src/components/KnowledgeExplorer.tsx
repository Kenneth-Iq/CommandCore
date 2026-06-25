import type { PageData } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type KnowledgeExplorerProps = {
  page: PageData;
};

export function KnowledgeExplorer({ page }: KnowledgeExplorerProps) {
  const rows = [...page.primaryPanel.rows, ...page.secondaryPanel.rows].slice(0, 6);

  return (
    <section className="panel surface explorer-panel">
      <div className="panel-header">
        <h3>Knowledge Explorer</h3>
      </div>
      {rows.length ? (
        <div className="explorer-list">
          {rows.map((row) => (
            <article key={`${row.title}-${row.subtitle ?? ""}`} className="explorer-item">
              <div>
                <strong>{row.title}</strong>
                <p>{row.subtitle ?? "Knowledge signal available."}</p>
              </div>
              <div className="explorer-meta">
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
          <strong>No Knowledge Signals Yet</strong>
          <p>{page.emptyState ?? "Knowledge coverage will appear here when the dashboard exposes assets and links."}</p>
        </div>
      )}
    </section>
  );
}
