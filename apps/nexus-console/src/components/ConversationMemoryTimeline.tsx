import type { ConversationMemory, TimelineEntryKind } from "../executiveAssistant";
import type { NavPage } from "../data/mockKernel";
import type { RouteSelection } from "../routing";
import type { WorldData } from "../worldModel";
import { EvidenceCard } from "./EvidenceCard";
import { StatusBadge } from "./StatusBadge";

type ConversationMemoryTimelineProps = {
  memory: ConversationMemory;
  world: WorldData;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
  onInvestigate?: (label: string) => void;
};

const kindLabel: Record<TimelineEntryKind, string> = {
  briefing: "Briefing",
  recommendation: "Recommendation",
  decision: "Decision",
  conversation: "Conversation",
};

const kindTone: Record<TimelineEntryKind, "active" | "warning" | "complete" | "idle"> = {
  briefing: "active",
  recommendation: "warning",
  decision: "complete",
  conversation: "idle",
};

export function ConversationMemoryTimeline({ memory, world, onNavigate, onInvestigate }: ConversationMemoryTimelineProps) {
  const hasHistory = memory.groups.some((group) => group.entries.length > 0);

  return (
    <section className="panel surface conversation-timeline-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Conversation Memory Timeline</h3>
          <span>Previous discussions, conversation groups, and what's still unresolved versus completed.</span>
        </div>
      </div>

      {hasHistory ? (
        <div className="conversation-memory-groups">
          {memory.groups.map((group) => (
            <div key={group.id} className="conversation-memory-group">
              <strong className="conversation-memory-group-label">{group.label}</strong>
              <div className="conversation-timeline-list">
                {group.entries.map((entry) => (
                  <article key={entry.id} className="conversation-timeline-item">
                    <div className={`event-rail tone-${kindTone[entry.kind]}`} />
                    <div className="conversation-timeline-body">
                      <div className="conversation-timeline-header">
                        <strong>{entry.label}</strong>
                        <span className="conversation-timeline-meta">
                          <StatusBadge tone={kindTone[entry.kind]}>{kindLabel[entry.kind]}</StatusBadge>
                          <span>{entry.occurredAt}</span>
                        </span>
                      </div>
                      <p>{entry.detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No History Yet</strong>
          <p>Briefings, recommendations, decisions, and conversation turns will appear here as they happen.</p>
        </div>
      )}

      <div className="conversation-memory-status-grid">
        <div className="conversation-memory-status-column">
          <div className="conversation-memory-status-header">
            <strong>Unresolved Topics</strong>
            <StatusBadge tone="warning">{memory.unresolvedTopics.length}</StatusBadge>
          </div>
          {memory.unresolvedTopics.length ? (
            <div className="panel-rows">
              {memory.unresolvedTopics.map((item) => (
                <div key={item.id} className="data-row">
                  <p>{item.text}</p>
                  {item.evidence ? (
                    <EvidenceCard evidence={item.evidence} world={world} onNavigate={onNavigate} onInvestigate={onInvestigate} />
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="simulation-empty">Nothing unresolved right now.</p>
          )}
        </div>
        <div className="conversation-memory-status-column">
          <div className="conversation-memory-status-header">
            <strong>Completed Topics</strong>
            <StatusBadge tone="complete">{memory.completedTopics.length}</StatusBadge>
          </div>
          {memory.completedTopics.length ? (
            <div className="panel-rows">
              {memory.completedTopics.map((item) => (
                <div key={item.id} className="data-row">
                  <p>{item.title}</p>
                  {item.evidence ? (
                    <EvidenceCard evidence={item.evidence} world={world} onNavigate={onNavigate} onInvestigate={onInvestigate} />
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="simulation-empty">Nothing completed yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
