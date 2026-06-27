import { useRuntimeContext } from "../runtimeContext";
import type { StatusTone } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type Pulse = {
  id: string;
  label: string;
  value: string;
  tone: StatusTone;
};

export function OperationalHealthRibbon() {
  const { world, simulation } = useRuntimeContext();

  const missions = [...world.missionCentre.active, ...world.missionCentre.completed, ...world.missionCentre.failed];
  const blockedMissions = missions.filter((mission) => simulation.missions[mission.missionId]?.isBlocked).length;
  const offlineAgents = world.agentCentre.profiles.filter(
    (agent) => simulation.agents[agent.agentId]?.activity === "offline" || simulation.agents[agent.agentId]?.activity === "blocked",
  ).length;
  const unhealthyTools = world.toolCentre.tools.filter((tool) => simulation.tools[tool.toolId]?.health !== "healthy").length;
  const activeKnowledge = world.knowledgeCentre.assets.filter(
    (asset) => simulation.knowledge[asset.assetId]?.recentlyLinked || simulation.knowledge[asset.assetId]?.growthTrend === "rising",
  ).length;
  const unreadConversations = world.conversationCentre.conversations.filter(
    (conversation) => (simulation.conversations[conversation.conversationId]?.unreadCount ?? 0) > 0,
  ).length;

  const pulses: Pulse[] = [
    {
      id: "mission",
      label: "Mission Pulse",
      value: `${missions.length - blockedMissions}/${missions.length} clear`,
      tone: blockedMissions ? "warning" : "ready",
    },
    {
      id: "agent",
      label: "Agent Pulse",
      value: `${world.agentCentre.profiles.length - offlineAgents}/${world.agentCentre.profiles.length} available`,
      tone: offlineAgents ? "warning" : "ready",
    },
    {
      id: "tool",
      label: "Tool Pulse",
      value: `${world.toolCentre.tools.length - unhealthyTools}/${world.toolCentre.tools.length} healthy`,
      tone: unhealthyTools ? "blocked" : "ready",
    },
    {
      id: "knowledge",
      label: "Knowledge Pulse",
      value: `${activeKnowledge} active`,
      tone: activeKnowledge ? "complete" : "idle",
    },
    {
      id: "conversation",
      label: "Conversation Pulse",
      value: `${unreadConversations} unread`,
      tone: unreadConversations ? "active" : "idle",
    },
  ];

  return (
    <div className="operational-health-ribbon" role="status" aria-label="Global operational health ribbon">
      <div className="operational-health-ribbon-score">
        <StatusBadge tone={simulation.healthScore >= 70 ? "ready" : simulation.healthScore >= 40 ? "warning" : "blocked"}>
          {simulation.healthScore}
        </StatusBadge>
        <span>Live Health Score</span>
      </div>
      <div className="operational-health-ribbon-pulses">
        {pulses.map((pulse) => (
          <div key={pulse.id} className="operational-pulse-chip">
            <span className={`operational-pulse-chip-dot tone-${pulse.tone}`} />
            <span className="operational-pulse-chip-label">{pulse.label}</span>
            <span className="operational-pulse-chip-value">{pulse.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
