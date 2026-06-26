import type { ConversationCentreData, ConversationContextRecord } from "../data/mockKernel";

type ConversationContextPanelProps = {
  contexts: ConversationContextRecord[];
  availability: ConversationCentreData["contextAvailability"];
};

export function ConversationContextPanel({ contexts, availability }: ConversationContextPanelProps) {
  return (
    <section className="panel surface conversation-context-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Context View</h3>
          <span>
            {availability.contextRecordCount} context records / {availability.conversationCountWithContext} conversations enriched
          </span>
        </div>
      </div>

      {contexts.length ? (
        <div className="mission-outcome-list">
          {contexts.map((context) => (
            <article key={context.contextId} className="mission-outcome-item">
              <div className="mission-outcome-header">
                <strong>{context.conversationId}</strong>
                <span className="agent-status-id">{context.threadId ?? "conversation-level"}</span>
              </div>
              <p>{context.content}</p>
              {context.missionId || context.projectId ? (
                <div className="mission-chip-row">
                  {context.missionId ? <span className="mission-chip">{context.missionId}</span> : null}
                  {context.projectId ? (
                    <span className="mission-chip mission-chip-muted">{context.projectId}</span>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Context Records Yet</strong>
          <p>Context records will appear here once conversations attach mission, project, or scope context.</p>
        </div>
      )}
    </section>
  );
}
