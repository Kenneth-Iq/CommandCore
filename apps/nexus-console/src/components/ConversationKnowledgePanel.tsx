import type { RouteSelection } from "../routing";
import type { ConversationKnowledgeLinkRecord, NavPage } from "../data/mockKernel";

type ConversationKnowledgePanelProps = {
  knowledgeLinks: ConversationKnowledgeLinkRecord[];
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function ConversationKnowledgePanel({ knowledgeLinks, onNavigate }: ConversationKnowledgePanelProps) {
  return (
    <section className="panel surface conversation-knowledge-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Linked Knowledge</h3>
          <span>{knowledgeLinks.length ? `${knowledgeLinks.length} knowledge links` : "No knowledge links yet"}</span>
        </div>
      </div>

      {knowledgeLinks.length ? (
        <div className="agent-capability-list">
          {knowledgeLinks.map((link, index) => (
            <div key={`${link.conversationId}-${link.knowledgeAssetId}-${index}`} className="agent-capability-item linked-knowledge-row">
              <button type="button" className="mission-chip route-chip-button" onClick={() => onNavigate("knowledge", { assetId: link.knowledgeAssetId })}>
                {link.knowledgeAssetId}
              </button>
              <span className="agent-capability-agents">
                {link.conversationId}
                {link.threadId ? ` / ${link.threadId}` : ""}
                {link.messageId ? ` / ${link.messageId}` : ""}
              </span>
              <button type="button" className="route-chip" onClick={() => onNavigate("conversations", { conversationId: link.conversationId })}>
                Open Conversation
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Linked Knowledge Yet</strong>
          <p>Knowledge links will appear here once conversations or messages reference knowledge assets.</p>
        </div>
      )}
    </section>
  );
}
