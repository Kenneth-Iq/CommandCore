import type { ConversationRecord, ConversationThreadRecord, NavPage } from "../data/mockKernel";
import type { RouteSelection } from "../routing";

type ConversationThreadListPanelProps = {
  conversations: ConversationRecord[];
  threads: ConversationThreadRecord[];
  selectedConversationId?: string;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function ConversationThreadListPanel({ conversations, threads, selectedConversationId, onNavigate }: ConversationThreadListPanelProps) {
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
              <article key={conversation.conversationId} className={`mission-card ${selectedConversationId === conversation.conversationId ? "is-selected" : ""}`}>
                <div className="mission-card-header">
                  <strong>{conversation.conversationId}</strong>
                  <span className="agent-status-id">{conversationThreads.length} thread{conversationThreads.length === 1 ? "" : "s"}</span>
                </div>
                <div className="mission-chip-row">
                  <button type="button" className="mission-chip route-chip-button" onClick={() => onNavigate("conversations", { conversationId: conversation.conversationId })}>
                    Select Conversation
                  </button>
                  {conversation.participantIds.map((participantId) => (
                    <span key={participantId} className="mission-chip">
                      {participantId}
                    </span>
                  ))}
                  {conversation.missionId ? (
                    <button type="button" className="mission-chip mission-chip-muted route-chip-button" onClick={() => onNavigate("missions", { missionId: conversation.missionId })}>
                      {conversation.missionId}
                    </button>
                  ) : null}
                  {conversation.projectId ? (
                    <button type="button" className="mission-chip mission-chip-muted route-chip-button" onClick={() => onNavigate("workspaces", { projectId: conversation.projectId })}>
                      {conversation.projectId}
                    </button>
                  ) : null}
                  {conversation.workspaceId ? (
                    <button type="button" className="mission-chip mission-chip-muted route-chip-button" onClick={() => onNavigate("workspaces", { workspaceId: conversation.workspaceId })}>
                      {conversation.workspaceId}
                    </button>
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
                <div className="route-chip-row mission-route-row">
                  {conversation.missionId ? (
                    <button type="button" className="route-chip" onClick={() => onNavigate("missions", { missionId: conversation.missionId })}>
                      Conversation → Mission
                    </button>
                  ) : null}
                  <button type="button" className="route-chip" onClick={() => onNavigate("knowledge") }>
                    Conversation → Knowledge
                  </button>
                </div>
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
