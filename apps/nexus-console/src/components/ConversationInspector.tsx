import type { PageData } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type ConversationInspectorProps = {
  page: PageData;
};

export function ConversationInspector({ page }: ConversationInspectorProps) {
  const focusItem = page.activity[0];
  const contextRows = [...page.primaryPanel.rows, ...page.secondaryPanel.rows].slice(0, 4);

  return (
    <section className="panel surface inspector-panel">
      <div className="panel-header">
        <h3>Conversation Inspector</h3>
      </div>
      {focusItem && focusItem.eventName !== "NoRecentActivity" ? (
        <div className="inspector-focus">
          <div className="inspector-focus-header">
            <div>
              <p className="page-eyebrow">Live Focus</p>
              <strong>{focusItem.eventName}</strong>
            </div>
            <StatusBadge tone={focusItem.tone ?? "idle"}>{focusItem.occurredAt}</StatusBadge>
          </div>
          <p>{focusItem.detail}</p>
          <span className="event-source">{focusItem.source}</span>
        </div>
      ) : (
        <div className="empty-state inspector-empty">
          <strong>No Conversation Focus Yet</strong>
          <p>{page.emptyState ?? "Conversation events will appear here when messages or context are visible."}</p>
        </div>
      )}

      <div className="inspector-grid">
        {contextRows.map((row) => (
          <article key={`${row.title}-${row.subtitle ?? ""}`} className="inspector-card">
            <div className="inspector-card-header">
              <strong>{row.title}</strong>
              {row.badge ? (
                <StatusBadge tone={row.badgeTone ?? "idle"}>{row.badge}</StatusBadge>
              ) : null}
            </div>
            <p>{row.subtitle ?? row.meta ?? "No additional context available."}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
