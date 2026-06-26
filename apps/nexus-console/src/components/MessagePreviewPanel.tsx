import type { ConversationMessageRecord } from "../data/mockKernel";

type MessagePreviewPanelProps = {
  messages: ConversationMessageRecord[];
};

export function MessagePreviewPanel({ messages }: MessagePreviewPanelProps) {
  return (
    <section className="panel surface message-preview-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Message Preview</h3>
          <span>{messages.length ? `${messages.length} recent messages` : "No messages yet"}</span>
        </div>
      </div>

      {messages.length ? (
        <div className="panel-rows">
          {messages.map((message) => (
            <div key={message.messageId} className="data-row">
              <div>
                <strong>{message.participantId}</strong>
                <p>{message.content}</p>
              </div>
              <div className="row-meta">
                <span>{message.role}</span>
                <span>{message.threadId ?? message.conversationId}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Messages Yet</strong>
          <p>Message previews will appear here once conversations include messages.</p>
        </div>
      )}
    </section>
  );
}
