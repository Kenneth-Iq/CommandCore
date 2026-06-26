import type { ConversationRecord, ConversationThreadRecord } from "../data/mockKernel";

type ConversationThreadListPanelProps = {
  conversations: ConversationRecord[];
  threads: ConversationThreadRecord[];
};

export function ConversationThreadListPanel({ conversations, threads }: ConversationThreadListPanelProps) {
  return (
    <section className="panel surface conversation-thread-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Conversations &amp; Threads</h3>
          <span>
            {conversations.length
              ? `${conversations.length} conversations / ${threads.length} threads`
              : "No conversations yet"}
          </span>
        </div>
      </div>

      {conversations.length ? (
        <div className="mission-card-list">
          {conversations.map((conversation) => {
            const conversationThreads = threads.filter(
              (thread) => thread.conversationId === conversation.conversationId,
            );
            return (
              <article key={conversation.conversationId} className="mission-card">
                <div className="mission-card-header">
                  <strong>{conversation.conversationId}</strong>
                  <span className="agent-status-id">{conversationThreads.length} thread{conversationThreads.length === 1 ? "" : "s"}</span>
                </div>
                <div className="mission-chip-row">
                  {conversation.participantIds.map((participantId) => (
                    <span key={participantId} className="mission-chip">
                      {participantId}
                    </span>
                  ))}
                  {conversation.missionId ? (
                    <span className="mission-chip mission-chip-muted">{conversation.missionId}</span>
                  ) : null}
                  {conversation.projectId ? (
                    <span className="mission-chip mission-chip-muted">{conversation.projectId}</span>
                  ) : null}
                  {conversation.workspaceId ? (
                    <span className="mission-chip mission-chip-muted">{conversation.workspaceId}</span>
                  ) : null}
                </div>
                {conversationThreads.length ? (
                  <div className="conversation-thread-list">
                    {conversationThreads.map((thread) => (
                      <span key={thread.threadId} className="mission-chip mission-chip-muted">
                        {thread.threadId}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Conversations Yet</strong>
          <p>Conversations and threads will appear here once operators or agents begin discussions.</p>
        </div>
      )}
    </section>
  );
}
