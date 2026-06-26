import type { ConversationCentreData } from "../data/mockKernel";
import { missionStatusTone, type MissionRecord, type NavPage, type StatusTone } from "../data/mockKernel";
import type { KnowledgeCentreData } from "../data/nexusCentres";
import type { RouteSelection } from "../routing";
import { StatusBadge } from "./StatusBadge";

type MissionSectionListProps = {
  title: string;
  tone: StatusTone;
  records: MissionRecord[];
  conversationCentre: ConversationCentreData;
  knowledgeCentre: KnowledgeCentreData;
  selectedMissionId?: string;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
  emptyMessage: string;
};

export function MissionSectionList({
  title,
  tone,
  records,
  conversationCentre,
  knowledgeCentre,
  selectedMissionId,
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
            const linkedAsset = knowledgeCentre.assets.find((asset) =>
              asset.scopes.some((scope) => scope.kind === "mission" && scope.value === mission.missionId),
            );

            return (
              <article
                key={mission.missionId}
                className={`mission-card ${selectedMissionId === mission.missionId ? "is-selected" : ""}`}
              >
                <div className="mission-card-header">
                  <strong>{mission.title}</strong>
                  <StatusBadge tone={missionStatusTone(mission.status)}>{mission.status}</StatusBadge>
                </div>
                <p className="mission-card-id">{mission.missionId}</p>
                <div className="mission-chip-row">
                  <button
                    type="button"
                    className="mission-chip route-chip-button"
                    onClick={() => onNavigate("missions", { missionId: mission.missionId })}
                  >
                    Select Mission
                  </button>
                  {mission.assignedAgentId ? (
                    <button type="button" className="mission-chip route-chip-button" onClick={() => onNavigate("agents", { agentId: mission.assignedAgentId })}>
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
                  {mission.assignedAgentId ? (
                    <button type="button" className="route-chip" onClick={() => onNavigate("agents", { agentId: mission.assignedAgentId })}>
                      Mission → Agent
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="route-chip"
                    onClick={() => onNavigate("conversations", hasConversation ? { conversationId: conversationCentre.conversations.find((conversation) => conversation.missionId === mission.missionId)?.conversationId } : {})}
                  >
                    {hasConversation ? "Mission → Conversation" : "Open Conversations"}
                  </button>
                  <button
                    type="button"
                    className="route-chip"
                    onClick={() => onNavigate("knowledge", linkedAsset ? { assetId: linkedAsset.assetId } : {})}
                  >
                    {linkedAsset ? "Mission → Knowledge" : "Open Knowledge"}
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
