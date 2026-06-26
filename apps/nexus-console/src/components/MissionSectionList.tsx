import type { ConversationCentreData } from "../data/mockKernel";
import { missionStatusTone, type MissionRecord, type NavPage, type StatusTone } from "../data/mockKernel";
import type { KnowledgeCentreData } from "../data/nexusCentres";
import { StatusBadge } from "./StatusBadge";

type MissionSectionListProps = {
  title: string;
  tone: StatusTone;
  records: MissionRecord[];
  conversationCentre: ConversationCentreData;
  knowledgeCentre: KnowledgeCentreData;
  onNavigate: (page: NavPage) => void;
  emptyMessage: string;
};

export function MissionSectionList({
  title,
  tone,
  records,
  conversationCentre,
  knowledgeCentre,
  onNavigate,
  emptyMessage,
}: MissionSectionListProps) {
  return (
    <section className="panel surface mission-section-panel">
      <div className="panel-header mission-section-header">
        <div className="panel-title-stack">
          <h3>{title}</h3>
          <span>{records.length ? `${records.length} mission${records.length === 1 ? "" : "s"}` : "None currently"}</span>
        </div>
        <StatusBadge tone={tone}>{records.length}</StatusBadge>
      </div>

      {records.length ? (
        <div className="mission-card-list">
          {records.map((mission) => {
            const hasConversation = conversationCentre.conversations.some(
              (conversation) => conversation.missionId === mission.missionId,
            );
            const hasKnowledge = knowledgeCentre.assets.some((asset) =>
              asset.scopes.some((scope) => scope.kind === "mission" && scope.value === mission.missionId),
            );

            return (
              <article key={mission.missionId} className="mission-card">
                <div className="mission-card-header">
                  <strong>{mission.title}</strong>
                  <StatusBadge tone={missionStatusTone(mission.status)}>{mission.status}</StatusBadge>
                </div>
                <p className="mission-card-id">{mission.missionId}</p>
                <div className="mission-chip-row">
                  {mission.assignedAgentId ? (
                    <button type="button" className="mission-chip route-chip-button" onClick={() => onNavigate("agents")}>
                      {mission.assignedAgentId}
                    </button>
                  ) : null}
                  {mission.capabilityIds.map((capabilityId) => (
                    <span key={capabilityId} className="mission-chip mission-chip-muted">
                      {capabilityId}
                    </span>
                  ))}
                  {typeof mission.taskCount === "number" ? (
                    <span className="mission-chip mission-chip-muted">{mission.taskCount} tasks</span>
                  ) : null}
                </div>
                <div className="route-chip-row mission-route-row">
                  <button type="button" className="route-chip" onClick={() => onNavigate("agents")}>
                    Mission → Agent
                  </button>
                  <button type="button" className="route-chip" onClick={() => onNavigate("conversations")}>
                    {hasConversation ? "Mission → Conversation" : "Open Conversations"}
                  </button>
                  <button type="button" className="route-chip" onClick={() => onNavigate("knowledge")}>
                    {hasKnowledge ? "Mission → Knowledge" : "Open Knowledge"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <strong>Nothing Here Yet</strong>
          <p>{emptyMessage}</p>
        </div>
      )}
    </section>
  );
}
