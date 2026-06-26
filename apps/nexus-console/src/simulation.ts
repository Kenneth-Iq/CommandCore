import { useEffect, useMemo, useState } from "react";
import type { StatusTone } from "./data/mockKernel";
import type { WorldData } from "./worldModel";

export type AgentActivityState = "idle" | "working" | "waiting" | "blocked" | "offline";
export type HealthState = "healthy" | "degraded" | "down";
export type AvailabilityState = "available" | "busy" | "unavailable";
export type GrowthTrend = "rising" | "steady" | "falling";

export type MissionSimState = {
  missionId: string;
  progressPercent: number;
  etaMinutes: number;
  isBlocked: boolean;
  isOverdue: boolean;
};

export type AgentSimState = {
  agentId: string;
  activity: AgentActivityState;
};

export type ToolSimState = {
  toolId: string;
  lastExecutionDurationMs: number;
  health: HealthState;
  availability: AvailabilityState;
};

export type ConversationSimState = {
  conversationId: string;
  incomingActivityCount: number;
  threadGrowth: number;
  unreadCount: number;
};

export type KnowledgeSimState = {
  assetId: string;
  recentlyUpdated: boolean;
  growthTrend: GrowthTrend;
  recentlyLinked: boolean;
};

export type SimulatedTimelineEvent = {
  id: string;
  label: string;
  detail: string;
  tone: StatusTone;
  occurredAt: string;
};

export type ExecutiveSimulationState = {
  tick: number;
  missions: Record<string, MissionSimState>;
  agents: Record<string, AgentSimState>;
  tools: Record<string, ToolSimState>;
  conversations: Record<string, ConversationSimState>;
  knowledge: Record<string, KnowledgeSimState>;
  timeline: SimulatedTimelineEvent[];
  healthScore: number;
};

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function buildMissionState(missionId: string, status: string, tick: number): MissionSimState {
  const seed = hashString(missionId);
  const normalized = status.toLowerCase();

  if (normalized.includes("complete")) {
    return { missionId, progressPercent: 100, etaMinutes: 0, isBlocked: false, isOverdue: false };
  }
  if (normalized.includes("fail")) {
    const progressPercent = 25 + (seed % 35);
    return { missionId, progressPercent, etaMinutes: 0, isBlocked: true, isOverdue: true };
  }

  const increment = 2 + (seed % 4);
  const progressPercent = clamp(Math.min(96, (seed % 30) + tick * increment), 4, 96);
  const isBlocked = (tick + seed) % 7 === 0;
  const isOverdue = progressPercent < 45 && tick > 5;
  const etaMinutes = Math.max(1, Math.round((100 - progressPercent) * (1.5 + (seed % 5) * 0.6)));

  return { missionId, progressPercent, etaMinutes, isBlocked, isOverdue };
}

const AGENT_ACTIVITY_CYCLE: AgentActivityState[] = ["working", "working", "idle", "idle", "waiting", "blocked", "offline"];

function buildAgentState(agentId: string, runtimeStatus: string, tick: number): AgentSimState {
  if (runtimeStatus === "offline") {
    return { agentId, activity: "offline" };
  }
  const seed = hashString(agentId);
  const index = (tick + seed) % AGENT_ACTIVITY_CYCLE.length;
  return { agentId, activity: AGENT_ACTIVITY_CYCLE[index] };
}

const TOOL_HEALTH_CYCLE: HealthState[] = ["healthy", "healthy", "healthy", "healthy", "degraded", "healthy", "down"];
const TOOL_AVAILABILITY_CYCLE: AvailabilityState[] = ["available", "available", "busy", "available", "busy", "unavailable"];

function buildToolState(toolId: string, tick: number): ToolSimState {
  const seed = hashString(toolId);
  const lastExecutionDurationMs = 180 + ((seed + tick * 37) % 2600);
  const health = TOOL_HEALTH_CYCLE[(tick + seed) % TOOL_HEALTH_CYCLE.length];
  const availability = TOOL_AVAILABILITY_CYCLE[(tick + seed) % TOOL_AVAILABILITY_CYCLE.length];
  return { toolId, lastExecutionDurationMs, health, availability };
}

function buildConversationState(conversationId: string, tick: number): ConversationSimState {
  const seed = hashString(conversationId);
  const incomingActivityCount = (tick + seed) % 6;
  const threadGrowth = Math.floor((tick + seed) / 5) % 4;
  const unreadCount = (seed + tick * 3) % 9;
  return { conversationId, incomingActivityCount, threadGrowth, unreadCount };
}

const GROWTH_TREND_CYCLE: GrowthTrend[] = ["rising", "rising", "steady", "steady", "falling"];

function buildKnowledgeState(assetId: string, tick: number): KnowledgeSimState {
  const seed = hashString(assetId);
  const recentlyUpdated = (tick + seed) % 5 === 0;
  const growthTrend = GROWTH_TREND_CYCLE[(tick + seed) % GROWTH_TREND_CYCLE.length];
  const recentlyLinked = (tick + seed) % 4 === 0;
  return { assetId, recentlyUpdated, growthTrend, recentlyLinked };
}

function buildSnapshot(world: WorldData, tick: number): Omit<ExecutiveSimulationState, "timeline"> {
  const allMissions = [...world.missionCentre.active, ...world.missionCentre.completed, ...world.missionCentre.failed];
  const missions: Record<string, MissionSimState> = {};
  allMissions.forEach((mission) => {
    missions[mission.missionId] = buildMissionState(mission.missionId, mission.status, tick);
  });

  const agents: Record<string, AgentSimState> = {};
  world.agentCentre.profiles.forEach((agent) => {
    agents[agent.agentId] = buildAgentState(agent.agentId, agent.runtimeStatus, tick);
  });

  const tools: Record<string, ToolSimState> = {};
  world.toolCentre.tools.forEach((tool) => {
    tools[tool.toolId] = buildToolState(tool.toolId, tick);
  });

  const conversations: Record<string, ConversationSimState> = {};
  world.conversationCentre.conversations.forEach((conversation) => {
    conversations[conversation.conversationId] = buildConversationState(conversation.conversationId, tick);
  });

  const knowledge: Record<string, KnowledgeSimState> = {};
  world.knowledgeCentre.assets.forEach((asset) => {
    knowledge[asset.assetId] = buildKnowledgeState(asset.assetId, tick);
  });

  const activeMissionStates = Object.values(missions).filter((state) => state.progressPercent < 100 && !world.missionCentre.failed.some((mission) => mission.missionId === state.missionId));
  const blockedCount = activeMissionStates.filter((state) => state.isBlocked).length;
  const overdueCount = activeMissionStates.filter((state) => state.isOverdue).length;
  const missionHealth = activeMissionStates.length
    ? clamp(100 - (blockedCount / activeMissionStates.length) * 55 - (overdueCount / activeMissionStates.length) * 25, 5, 100)
    : 90;

  const agentStates = Object.values(agents);
  const healthyAgentCount = agentStates.filter((state) => state.activity === "working" || state.activity === "idle").length;
  const agentHealth = agentStates.length ? clamp((healthyAgentCount / agentStates.length) * 100, 5, 100) : 90;

  const toolStates = Object.values(tools);
  const healthyToolCount = toolStates.filter((state) => state.health === "healthy").length;
  const toolHealth = toolStates.length ? clamp((healthyToolCount / toolStates.length) * 100, 5, 100) : 90;

  const healthScore = clamp((missionHealth + agentHealth + toolHealth) / 3, 8, 99);

  return { tick, missions, agents, tools, conversations, knowledge, healthScore };
}

const TIMELINE_TEMPLATES: Array<(world: WorldData, tick: number) => SimulatedTimelineEvent | undefined> = [
  (world, tick) => {
    const missions = [...world.missionCentre.active];
    if (!missions.length) {
      return undefined;
    }
    const mission = missions[tick % missions.length];
    const state = buildMissionState(mission.missionId, mission.status, tick);
    if (state.isBlocked) {
      return {
        id: `sim-mission-blocked-${mission.missionId}-${tick}`,
        label: "MissionProgressBlocked",
        detail: `${mission.title} is temporarily blocked at ${state.progressPercent}% progress.`,
        tone: "warning",
        occurredAt: formatTickTime(tick),
      };
    }
    return {
      id: `sim-mission-progress-${mission.missionId}-${tick}`,
      label: "MissionProgressUpdated",
      detail: `${mission.title} advanced to ${state.progressPercent}% (ETA ${state.etaMinutes}m).`,
      tone: "active",
      occurredAt: formatTickTime(tick),
    };
  },
  (world, tick) => {
    const agents = world.agentCentre.profiles;
    if (!agents.length) {
      return undefined;
    }
    const agent = agents[tick % agents.length];
    const state = buildAgentState(agent.agentId, agent.runtimeStatus, tick);
    return {
      id: `sim-agent-${agent.agentId}-${tick}`,
      label: "AgentActivityChanged",
      detail: `${agent.name} is now ${state.activity}.`,
      tone: state.activity === "blocked" ? "warning" : state.activity === "offline" ? "idle" : "active",
      occurredAt: formatTickTime(tick),
    };
  },
  (world, tick) => {
    const tools = world.toolCentre.tools;
    if (!tools.length) {
      return undefined;
    }
    const tool = tools[tick % tools.length];
    const state = buildToolState(tool.toolId, tick);
    if (state.health !== "healthy") {
      return {
        id: `sim-tool-${tool.toolId}-${tick}`,
        label: "ToolHealthDegraded",
        detail: `${tool.name} reported ${state.health} health (${state.lastExecutionDurationMs}ms last execution).`,
        tone: state.health === "down" ? "blocked" : "warning",
        occurredAt: formatTickTime(tick),
      };
    }
    return undefined;
  },
  (world, tick) => {
    const conversations = world.conversationCentre.conversations;
    if (!conversations.length) {
      return undefined;
    }
    const conversation = conversations[tick % conversations.length];
    const state = buildConversationState(conversation.conversationId, tick);
    if (state.incomingActivityCount === 0) {
      return undefined;
    }
    return {
      id: `sim-conversation-${conversation.conversationId}-${tick}`,
      label: "ConversationActivityObserved",
      detail: `${conversation.conversationId} received ${state.incomingActivityCount} new signal(s); ${state.unreadCount} unread.`,
      tone: "idle",
      occurredAt: formatTickTime(tick),
    };
  },
  (world, tick) => {
    const assets = world.knowledgeCentre.assets;
    if (!assets.length) {
      return undefined;
    }
    const asset = assets[tick % assets.length];
    const state = buildKnowledgeState(asset.assetId, tick);
    if (!state.recentlyUpdated && !state.recentlyLinked) {
      return undefined;
    }
    return {
      id: `sim-knowledge-${asset.assetId}-${tick}`,
      label: state.recentlyLinked ? "KnowledgeAssetLinked" : "KnowledgeAssetUpdated",
      detail: `${asset.title} ${state.recentlyLinked ? "gained a new relationship" : "was refreshed"} (trend: ${state.growthTrend}).`,
      tone: "complete",
      occurredAt: formatTickTime(tick),
    };
  },
];

function formatTickTime(tick: number): string {
  const date = new Date();
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + ` (tick ${tick})`;
}

function buildTickEvents(world: WorldData, tick: number): SimulatedTimelineEvent[] {
  const template = TIMELINE_TEMPLATES[tick % TIMELINE_TEMPLATES.length];
  const event = template(world, tick);
  return event ? [event] : [];
}

export function useExecutiveSimulation(world: WorldData, intervalMs = 4000): ExecutiveSimulationState {
  const [tick, setTick] = useState(0);
  const [timeline, setTimeline] = useState<SimulatedTimelineEvent[]>([]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTick((previousTick) => {
        const nextTick = previousTick + 1;
        const newEvents = buildTickEvents(world, nextTick);
        if (newEvents.length) {
          setTimeline((previousTimeline) => [...newEvents, ...previousTimeline].slice(0, 20));
        }
        return nextTick;
      });
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [intervalMs, world]);

  const snapshot = useMemo(() => buildSnapshot(world, tick), [world, tick]);

  return { ...snapshot, timeline };
}
