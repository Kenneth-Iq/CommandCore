import type { AgentProfile, ConversationRecord, MissionRecord, ToolRecord } from "../data/mockKernel";
import type { KnowledgeAssetRecord } from "../data/nexusCentres";
import type { ExecutiveSimulationState } from "../simulation";
import { StatusBadge } from "./StatusBadge";

type ExecutiveSimulationPanelProps = {
  simulation: ExecutiveSimulationState;
  missions: MissionRecord[];
  agents: AgentProfile[];
  tools: ToolRecord[];
  conversations: ConversationRecord[];
  knowledgeAssets: KnowledgeAssetRecord[];
};

export function ExecutiveSimulationPanel({
  simulation,
  missions,
  agents,
  tools,
  conversations,
  knowledgeAssets,
}: ExecutiveSimulationPanelProps) {
  const activeMissions = missions.filter((mission) => !mission.status.toLowerCase().includes("complete") && !mission.status.toLowerCase().includes("fail")).slice(0, 4);
  const visibleAgents = agents.slice(0, 6);
  const visibleTools = tools.slice(0, 4);
  const visibleConversations = conversations.slice(0, 4);
  const visibleKnowledge = knowledgeAssets.slice(0, 4);

  return (
    <section className="panel surface executive-simulation-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Live Operational Simulation</h3>
          <span>Simulated runtime activity layered over the current operating picture. Updates every few seconds.</span>
        </div>
        <StatusBadge tone="active">Tick {simulation.tick}</StatusBadge>
      </div>

      <div className="simulation-grid">
        <article className="simulation-block">
          <h4>Mission Progress</h4>
          {activeMissions.length ? (
            <div className="simulation-list">
              {activeMissions.map((mission) => {
                const state = simulation.missions[mission.missionId];
                if (!state) {
                  return null;
                }
                return (
                  <div key={mission.missionId} className="simulation-mission-row">
                    <div className="simulation-mission-header">
                      <strong>{mission.title}</strong>
                      <span>{state.progressPercent}%</span>
                    </div>
                    <div className="simulation-progress-bar">
                      <div
                        className={`simulation-progress-fill ${state.isBlocked ? "tone-warning" : "tone-active"}`}
                        style={{ width: `${state.progressPercent}%` }}
                      />
                    </div>
                    <div className="simulation-mission-meta">
                      <span>ETA {state.etaMinutes}m</span>
                      {state.isBlocked ? <StatusBadge tone="warning">Blocked</StatusBadge> : null}
                      {state.isOverdue ? <StatusBadge tone="blocked">Overdue</StatusBadge> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="simulation-empty">No active missions to simulate.</p>
          )}
        </article>

        <article className="simulation-block">
          <h4>Agent Activity</h4>
          {visibleAgents.length ? (
            <div className="simulation-pulse-list">
              {visibleAgents.map((agent) => {
                const state = simulation.agents[agent.agentId];
                if (!state) {
                  return null;
                }
                return (
                  <div key={agent.agentId} className="simulation-pulse-row">
                    <span className={`simulation-pulse-dot pulse-${state.activity}`} />
                    <strong>{agent.name}</strong>
                    <span className="simulation-pulse-label">{state.activity}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="simulation-empty">No agents to simulate.</p>
          )}
        </article>

        <article className="simulation-block">
          <h4>Tool Activity</h4>
          {visibleTools.length ? (
            <div className="simulation-pulse-list">
              {visibleTools.map((tool) => {
                const state = simulation.tools[tool.toolId];
                if (!state) {
                  return null;
                }
                return (
                  <div key={tool.toolId} className="simulation-pulse-row">
                    <span className={`simulation-pulse-dot health-${state.health}`} />
                    <strong>{tool.name}</strong>
                    <span className="simulation-pulse-label">{state.lastExecutionDurationMs}ms / {state.availability}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="simulation-empty">No tools to simulate.</p>
          )}
        </article>

        <article className="simulation-block">
          <h4>Conversation Activity</h4>
          {visibleConversations.length ? (
            <div className="simulation-pulse-list">
              {visibleConversations.map((conversation) => {
                const state = simulation.conversations[conversation.conversationId];
                if (!state) {
                  return null;
                }
                return (
                  <div key={conversation.conversationId} className="simulation-pulse-row">
                    <strong>{conversation.conversationId}</strong>
                    <span className="simulation-pulse-label">
                      +{state.incomingActivityCount} new / {state.threadGrowth} thread growth
                    </span>
                    {state.unreadCount > 0 ? <StatusBadge tone="active">{state.unreadCount} unread</StatusBadge> : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="simulation-empty">No conversations to simulate.</p>
          )}
        </article>

        <article className="simulation-block">
          <h4>Knowledge Activity</h4>
          {visibleKnowledge.length ? (
            <div className="simulation-pulse-list">
              {visibleKnowledge.map((asset) => {
                const state = simulation.knowledge[asset.assetId];
                if (!state) {
                  return null;
                }
                return (
                  <div key={asset.assetId} className="simulation-pulse-row">
                    <strong>{asset.title}</strong>
                    <span className="simulation-pulse-label">trend: {state.growthTrend}</span>
                    {state.recentlyUpdated ? <StatusBadge tone="complete">Updated</StatusBadge> : null}
                    {state.recentlyLinked ? <StatusBadge tone="active">Linked</StatusBadge> : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="simulation-empty">No knowledge assets to simulate.</p>
          )}
        </article>
      </div>

      <div className="simulation-timeline">
        <h4>Executive Live Timeline</h4>
        {simulation.timeline.length ? (
          <div className="simulation-timeline-list">
            {simulation.timeline.map((event) => (
              <div key={event.id} className="simulation-timeline-item">
                <div className={`event-rail tone-${event.tone}`} />
                <div className="simulation-timeline-body">
                  <div className="simulation-timeline-header">
                    <strong>{event.label}</strong>
                    <span>{event.occurredAt}</span>
                  </div>
                  <p>{event.detail}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="simulation-empty">Waiting for the first simulated signal...</p>
        )}
      </div>
    </section>
  );
}
