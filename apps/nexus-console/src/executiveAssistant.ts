import type { ExecutiveFocusState } from "./components/ExecutiveFocusPanel";
import type { NavPage } from "./data/mockKernel";
import type { RouteSelection } from "./routing";
import type { ExecutiveSimulationState } from "./simulation";
import { resolveContext, type WorldData } from "./worldModel";

export type EvidenceLink = {
  label: string;
  page: NavPage;
  selection?: RouteSelection;
};

export type BriefingPeriod = "morning" | "afternoon" | "evening";

export type Briefing = {
  period: BriefingPeriod;
  title: string;
  summary: string;
  highlights: string[];
};

export type RecommendationKind = "risk" | "opportunity" | "anomaly" | "efficiency" | "trend";

export type RecommendationCard = {
  id: string;
  kind: RecommendationKind;
  title: string;
  detail: string;
  reason: string;
  businessImpact: string;
  suggestedNextStep: string;
  confidence: number;
  affectedSystems: string[];
  evidence: EvidenceLink;
};

export type DecisionStatus = "waiting" | "deferred" | "completed" | "info";

export type DecisionItem = {
  id: string;
  title: string;
  detail: string;
  status: DecisionStatus;
  occurredAt: string;
  evidence?: EvidenceLink;
};

export type FollowUpKind = "question" | "waiting" | "postponed" | "review";

export type FollowUpItem = {
  id: string;
  kind: FollowUpKind;
  text: string;
  evidence?: EvidenceLink;
  resolved?: boolean;
};

export type TimelineEntryKind = "briefing" | "recommendation" | "decision" | "conversation";

export type TimelineEntry = {
  id: string;
  kind: TimelineEntryKind;
  label: string;
  detail: string;
  occurredAt: string;
};

export type ApprovalStatus = "awaiting" | "approved" | "deferred" | "rejected";

export type ApprovalCard = {
  id: string;
  title: string;
  detail: string;
  status: ApprovalStatus;
  requestedAt: string;
  evidence?: EvidenceLink;
};

export type ConversationGroup = {
  id: string;
  label: string;
  entries: TimelineEntry[];
};

export type ConversationMemory = {
  groups: ConversationGroup[];
  unresolvedTopics: FollowUpItem[];
  completedTopics: DecisionItem[];
};

export type EvidenceEntityKind = "mission" | "agent" | "tool" | "knowledge" | "workspace" | "project";

export type EvidenceCardDetail = {
  kind: EvidenceEntityKind;
  title: string;
  facts: string[];
  evidence: EvidenceLink;
};

export type ConversationContextState = {
  planet: string;
  company?: string;
  workspace?: string;
  project?: string;
  mission?: string;
  investigation?: string;
};

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function allMissionsOf(world: WorldData) {
  return [...world.missionCentre.active, ...world.missionCentre.completed, ...world.missionCentre.failed];
}

export function resolveGreeting(now: Date = new Date()): { period: BriefingPeriod; greeting: string } {
  const hour = now.getHours();
  if (hour < 12) {
    return { period: "morning", greeting: "Good morning." };
  }
  if (hour < 17) {
    return { period: "afternoon", greeting: "Good afternoon." };
  }
  return { period: "evening", greeting: "Good evening." };
}

export function buildBriefings(world: WorldData, simulation: ExecutiveSimulationState): Briefing[] {
  const missions = allMissionsOf(world);
  const blocked = missions.filter((mission) => simulation.missions[mission.missionId]?.isBlocked).length;
  const overdue = missions.filter((mission) => simulation.missions[mission.missionId]?.isOverdue).length;
  const offlineAgents = world.agentCentre.profiles.filter((agent) => simulation.agents[agent.agentId]?.activity === "offline" || simulation.agents[agent.agentId]?.activity === "blocked").length;
  const degradedTools = world.toolCentre.tools.filter((tool) => simulation.tools[tool.toolId]?.health !== "healthy").length;
  const completed = world.missionCentre.counts.completed;

  return [
    {
      period: "morning",
      title: "Morning Briefing",
      summary: `${missions.length} missions in view this morning. ${blocked} need attention before the day gets going.`,
      highlights: [
        `${offlineAgents} agent(s) offline or blocked`,
        `${degradedTools} tool(s) reporting degraded health`,
        `${overdue} mission(s) running behind schedule`,
      ],
    },
    {
      period: "afternoon",
      title: "Afternoon Update",
      summary: `Progress continues across ${missions.length} missions. ${completed} have completed so far today.`,
      highlights: [
        `${blocked} mission(s) still blocked`,
        `${world.conversationCentre.counts.conversations} conversations active`,
        `${world.knowledgeCentre.assets.length} knowledge assets tracked`,
      ],
    },
    {
      period: "evening",
      title: "Evening Summary",
      summary: `Wrapping up the day: ${completed} missions completed, ${blocked} carrying over with follow-up needed tomorrow.`,
      highlights: [
        `${overdue} mission(s) ended the day overdue`,
        `${offlineAgents} agent(s) remain offline`,
        `${degradedTools} tool(s) still need a look`,
      ],
    },
  ];
}

export function buildRecommendations(world: WorldData, simulation: ExecutiveSimulationState): RecommendationCard[] {
  const missions = allMissionsOf(world);
  const cards: RecommendationCard[] = [];

  const blockedMissions = missions.filter((mission) => simulation.missions[mission.missionId]?.isBlocked);
  blockedMissions.slice(0, 1).forEach((mission) => {
    cards.push({
      id: `risk-mission-${mission.missionId}`,
      kind: "risk",
      title: `Mission risk: ${mission.title}`,
      detail: `This mission is currently blocked and may miss its expected completion window.`,
      reason: `${mission.title} has not advanced since it entered a blocked state, and ${mission.assignedAgentId ? `its assigned agent (${mission.assignedAgentId})` : "no agent"} has not cleared the blocker.`,
      businessImpact: `Downstream work scoped to this mission will slip if the block is not cleared soon.`,
      suggestedNextStep: `Reassign the mission to an available agent, or review the blocker directly in Mission Centre.`,
      confidence: 60 + (hashString(mission.missionId) % 30),
      affectedSystems: ["Mission Centre", ...(mission.assignedAgentId ? ["Agent Centre"] : [])],
      evidence: { label: "Open Mission", page: "missions", selection: { missionId: mission.missionId } },
    });
  });

  const unhealthyTools = world.toolCentre.tools.filter((tool) => simulation.tools[tool.toolId]?.health !== "healthy");
  unhealthyTools.slice(0, 1).forEach((tool) => {
    cards.push({
      id: `anomaly-tool-${tool.toolId}`,
      kind: "anomaly",
      title: `Tool anomaly: ${tool.name}`,
      detail: `${tool.name} is reporting ${simulation.tools[tool.toolId]?.health} health, outside its normal pattern.`,
      reason: `${tool.name}'s reported health diverged from its expected baseline, which is the same signal Risk Detection treats as a degraded-runtime-health pattern.`,
      businessImpact: `Any agent or mission depending on ${tool.name} may see slower or failed invocations until health recovers.`,
      suggestedNextStep: `Review ${tool.name} in Tool Centre and confirm whether it needs a permission, capability, or runtime fix.`,
      confidence: 55 + (hashString(tool.toolId) % 35),
      affectedSystems: ["Tool Centre", ...(tool.agentId ? ["Agent Centre"] : [])],
      evidence: { label: "Open Tool", page: "tools", selection: { toolId: tool.toolId } },
    });
  });

  const linkedKnowledge = world.knowledgeCentre.assets.filter((asset) => simulation.knowledge[asset.assetId]?.recentlyLinked);
  linkedKnowledge.slice(0, 1).forEach((asset) => {
    cards.push({
      id: `opportunity-knowledge-${asset.assetId}`,
      kind: "opportunity",
      title: `Opportunity: ${asset.title}`,
      detail: `A new relationship was formed around this asset — worth reviewing for follow-on value.`,
      reason: `"${asset.title}" gained a new relationship link, suggesting renewed relevance worth capitalizing on.`,
      businessImpact: `Acting on this now could surface reusable knowledge before the relationship context goes stale.`,
      suggestedNextStep: `Open the asset and review what it is now linked to, then decide whether to promote or cite it elsewhere.`,
      confidence: 50 + (hashString(asset.assetId) % 40),
      affectedSystems: ["Knowledge Centre"],
      evidence: { label: "Open Knowledge Asset", page: "knowledge", selection: { assetId: asset.assetId } },
    });
  });

  const idleAgents = world.agentCentre.profiles.filter((agent) => simulation.agents[agent.agentId]?.activity === "idle");
  if (idleAgents.length) {
    cards.push({
      id: "efficiency-idle-agents",
      kind: "efficiency",
      title: `Efficiency: ${idleAgents.length} agent(s) idle`,
      detail: `These agents currently have capacity and could be assigned to blocked or queued work.`,
      reason: `${idleAgents.length} agent(s) show no active assignment while other missions are blocked or queued, indicating a capacity mismatch.`,
      businessImpact: `Idle capacity sitting alongside blocked work is the fastest, lowest-cost fix available right now.`,
      suggestedNextStep: `Reassign one of the idle agents to a blocked or queued mission with a matching capability.`,
      confidence: 65,
      affectedSystems: ["Agent Centre", "Mission Centre"],
      evidence: { label: "Open Agent Centre", page: "agents", selection: { agentId: idleAgents[0].agentId } },
    });
  }

  const risingKnowledge = world.knowledgeCentre.assets.filter((asset) => simulation.knowledge[asset.assetId]?.growthTrend === "rising");
  if (risingKnowledge.length) {
    cards.push({
      id: "trend-knowledge-growth",
      kind: "trend",
      title: "Trend: knowledge relationships rising",
      detail: `${risingKnowledge.length} knowledge asset(s) show a rising relationship trend this period.`,
      reason: `${risingKnowledge.length} asset(s) are accumulating relationships faster than their historical baseline.`,
      businessImpact: `Assets trending this way often become reference hubs — worth tracking before the trend plateaus.`,
      suggestedNextStep: `Review the fastest-growing asset and consider whether it should be referenced in the next briefing.`,
      confidence: 58,
      affectedSystems: ["Knowledge Centre"],
      evidence: { label: "Open Knowledge Centre", page: "knowledge", selection: { assetId: risingKnowledge[0].assetId } },
    });
  }

  return cards;
}

export function buildDecisionQueue(world: WorldData, simulation: ExecutiveSimulationState, recommendations: RecommendationCard[]): DecisionItem[] {
  const missions = allMissionsOf(world);
  const items: DecisionItem[] = [];

  const blockedMissions = missions.filter((mission) => simulation.missions[mission.missionId]?.isBlocked);
  blockedMissions.slice(0, 2).forEach((mission, index) => {
    items.push({
      id: `decision-waiting-${mission.missionId}`,
      title: `Review blocked mission: ${mission.title}`,
      detail: "Awaiting a decision on how to unblock or reassign this mission.",
      status: "waiting",
      occurredAt: relativeTimeLabel(index),
      evidence: { label: "Open Mission", page: "missions", selection: { missionId: mission.missionId } },
    });
  });

  recommendations.filter((card) => card.kind === "opportunity" || card.kind === "trend").slice(0, 1).forEach((card, index) => {
    items.push({
      id: `decision-deferred-${card.id}`,
      title: card.title,
      detail: "Deferred for later review — not urgent, but worth revisiting.",
      status: "deferred",
      occurredAt: relativeTimeLabel(index + 2),
      evidence: card.evidence,
    });
  });

  const completedMissions = world.missionCentre.completed.slice(0, 2);
  completedMissions.forEach((mission, index) => {
    items.push({
      id: `decision-completed-${mission.missionId}`,
      title: `Approved outcome: ${mission.title}`,
      detail: mission.resultSummary ?? "Mission completed and result accepted.",
      status: "completed",
      occurredAt: relativeTimeLabel(index + 4),
      evidence: { label: "Open Mission", page: "missions", selection: { missionId: mission.missionId } },
    });
  });

  items.push({
    id: "decision-info-readiness",
    title: "Platform readiness check",
    detail: "Informational only — no decision required. Readiness checks are passing.",
    status: "info",
    occurredAt: relativeTimeLabel(6),
    evidence: { label: "Open Health / Readiness", page: "health" },
  });

  return items;
}

export function buildFollowUps(world: WorldData, simulation: ExecutiveSimulationState): FollowUpItem[] {
  const missions = allMissionsOf(world);
  const items: FollowUpItem[] = [];

  const blockedMissions = missions.filter((mission) => simulation.missions[mission.missionId]?.isBlocked);
  if (blockedMissions.length) {
    items.push({
      id: "followup-question-mission",
      kind: "question",
      text: `Should I reassign ${blockedMissions[0].title} to a different agent, or keep waiting?`,
      evidence: { label: "Open Mission", page: "missions", selection: { missionId: blockedMissions[0].missionId } },
      resolved: false,
    });
  }

  const offlineAgents = world.agentCentre.profiles.filter((agent) => simulation.agents[agent.agentId]?.activity === "offline");
  if (offlineAgents.length) {
    items.push({
      id: "followup-waiting-agent",
      kind: "waiting",
      text: `Waiting on a decision about ${offlineAgents[0].name}, currently offline.`,
      evidence: { label: "Open Agent", page: "agents", selection: { agentId: offlineAgents[0].agentId } },
      resolved: false,
    });
  }

  if (world.toolCentre.tools.length) {
    const tool = world.toolCentre.tools[0];
    items.push({
      id: "followup-postponed-tool",
      kind: "postponed",
      text: `Postponed reviewing ${tool.name}'s permission tier until next cycle.`,
      evidence: { label: "Open Tool", page: "tools", selection: { toolId: tool.toolId } },
      resolved: false,
    });
  }

  if (world.knowledgeCentre.assets.length) {
    const asset = world.knowledgeCentre.assets[0];
    items.push({
      id: "followup-review-knowledge",
      kind: "review",
      text: `"${asset.title}" is flagged for your review before it's referenced further.`,
      evidence: { label: "Open Knowledge Asset", page: "knowledge", selection: { assetId: asset.assetId } },
      resolved: false,
    });
  }

  return items;
}

export function buildApprovalCards(world: WorldData, simulation: ExecutiveSimulationState): ApprovalCard[] {
  const missions = allMissionsOf(world);
  const cards: ApprovalCard[] = [];

  const blockedMissions = missions.filter((mission) => simulation.missions[mission.missionId]?.isBlocked);
  blockedMissions.slice(0, 1).forEach((mission, index) => {
    cards.push({
      id: `approval-awaiting-${mission.missionId}`,
      title: `Reassign ${mission.title}`,
      detail: "Simulated approval — no command has been issued. Write operations are disabled in this build.",
      status: "awaiting",
      requestedAt: relativeTimeLabel(index),
      evidence: { label: "Open Mission", page: "missions", selection: { missionId: mission.missionId } },
    });
  });

  const completedMissions = world.missionCentre.completed.slice(0, 1);
  completedMissions.forEach((mission, index) => {
    cards.push({
      id: `approval-approved-${mission.missionId}`,
      title: `Accept outcome: ${mission.title}`,
      detail: "Simulated approval — recorded as approved for rehearsal purposes only.",
      status: "approved",
      requestedAt: relativeTimeLabel(index + 2),
      evidence: { label: "Open Mission", page: "missions", selection: { missionId: mission.missionId } },
    });
  });

  const unhealthyTools = world.toolCentre.tools.filter((tool) => simulation.tools[tool.toolId]?.health !== "healthy");
  unhealthyTools.slice(0, 1).forEach((tool, index) => {
    cards.push({
      id: `approval-deferred-${tool.toolId}`,
      title: `Restart ${tool.name}`,
      detail: "Simulated approval — deferred pending a maintenance window.",
      status: "deferred",
      requestedAt: relativeTimeLabel(index + 3),
      evidence: { label: "Open Tool", page: "tools", selection: { toolId: tool.toolId } },
    });
  });

  const idleAgents = world.agentCentre.profiles.filter((agent) => simulation.agents[agent.agentId]?.activity === "idle");
  if (idleAgents.length) {
    cards.push({
      id: "approval-rejected-idle-agent",
      title: `Decommission idle capacity review`,
      detail: "Simulated approval — rejected; idle agents will be reassigned instead of decommissioned.",
      status: "rejected",
      requestedAt: relativeTimeLabel(5),
      evidence: { label: "Open Agent Centre", page: "agents", selection: { agentId: idleAgents[0].agentId } },
    });
  }

  return cards;
}

export function buildTimeline(
  briefings: Briefing[],
  recommendations: RecommendationCard[],
  decisions: DecisionItem[],
  world: WorldData,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  briefings.forEach((briefing, index) => {
    entries.push({
      id: `timeline-briefing-${briefing.period}`,
      kind: "briefing",
      label: briefing.title,
      detail: briefing.summary,
      occurredAt: relativeTimeLabel(index),
    });
  });

  recommendations.forEach((card, index) => {
    entries.push({
      id: `timeline-recommendation-${card.id}`,
      kind: "recommendation",
      label: card.title,
      detail: card.detail,
      occurredAt: relativeTimeLabel(index + briefings.length),
    });
  });

  decisions.forEach((decision, index) => {
    entries.push({
      id: `timeline-decision-${decision.id}`,
      kind: "decision",
      label: decision.title,
      detail: decision.detail,
      occurredAt: relativeTimeLabel(index + briefings.length + recommendations.length),
    });
  });

  const conversationNotes = [
    "Jarvis greeted you with the current operating picture.",
    world.missionCentre.counts.total
      ? `You asked about missions; ${world.missionCentre.counts.active} are currently active.`
      : "You asked about missions; none are currently tracked.",
    world.agentCentre.profiles.length
      ? `You asked about agents; ${world.agentCentre.profiles.length} are registered.`
      : "You asked about agents; none are currently registered.",
  ];
  conversationNotes.forEach((note, index) => {
    entries.push({
      id: `timeline-conversation-${index}`,
      kind: "conversation",
      label: index === 0 ? "Jarvis" : "You",
      detail: note,
      occurredAt: relativeTimeLabel(index + briefings.length + recommendations.length + decisions.length),
    });
  });

  return entries;
}

const CONVERSATION_GROUP_LABELS: Record<TimelineEntryKind, string> = {
  briefing: "Briefings",
  recommendation: "Recommendations Discussed",
  decision: "Decisions Discussed",
  conversation: "Direct Conversation",
};

export function buildConversationMemory(
  timeline: TimelineEntry[],
  followUps: FollowUpItem[],
  decisions: DecisionItem[],
): ConversationMemory {
  const groupOrder: TimelineEntryKind[] = ["conversation", "briefing", "recommendation", "decision"];
  const groups: ConversationGroup[] = groupOrder
    .map((kind) => ({
      id: `conversation-group-${kind}`,
      label: CONVERSATION_GROUP_LABELS[kind],
      entries: timeline.filter((entry) => entry.kind === kind),
    }))
    .filter((group) => group.entries.length > 0);

  const unresolvedTopics = followUps.filter((item) => !item.resolved);
  const completedTopics = decisions.filter((item) => item.status === "completed");

  return { groups, unresolvedTopics, completedTopics };
}

function entityKindFromSelection(selection: RouteSelection | undefined): EvidenceEntityKind | undefined {
  if (!selection) {
    return undefined;
  }
  if (selection.missionId) return "mission";
  if (selection.agentId) return "agent";
  if (selection.toolId) return "tool";
  if (selection.assetId) return "knowledge";
  if (selection.projectId) return "project";
  if (selection.workspaceId) return "workspace";
  return undefined;
}

export function resolveEvidenceDetail(link: EvidenceLink, world: WorldData): EvidenceCardDetail | undefined {
  const kind = entityKindFromSelection(link.selection);
  if (!kind || !link.selection) {
    return undefined;
  }

  if (kind === "mission") {
    const mission = allMissionsOf(world).find((candidate) => candidate.missionId === link.selection!.missionId);
    if (!mission) return undefined;
    return {
      kind,
      title: mission.title,
      facts: [
        `Status: ${mission.status}`,
        mission.assignedAgentId ? `Assigned agent: ${mission.assignedAgentId}` : "No assigned agent",
        `${mission.capabilityIds.length} capabilities`,
      ],
      evidence: link,
    };
  }

  if (kind === "agent") {
    const agent = world.agentCentre.profiles.find((candidate) => candidate.agentId === link.selection!.agentId);
    if (!agent) return undefined;
    return {
      kind,
      title: agent.name,
      facts: [
        `Role: ${agent.role}`,
        `Runtime status: ${agent.runtimeStatus}`,
        `${agent.missionQueue.length} queued missions`,
      ],
      evidence: link,
    };
  }

  if (kind === "tool") {
    const tool = world.toolCentre.tools.find((candidate) => candidate.toolId === link.selection!.toolId);
    if (!tool) return undefined;
    return {
      kind,
      title: tool.name,
      facts: [
        `Permission level: ${tool.permissionLevel}`,
        `Status: ${tool.status}`,
        tool.agentId ? `Linked agent: ${tool.agentId}` : "No linked agent",
      ],
      evidence: link,
    };
  }

  if (kind === "knowledge") {
    const asset = world.knowledgeCentre.assets.find((candidate) => candidate.assetId === link.selection!.assetId);
    if (!asset) return undefined;
    return {
      kind,
      title: asset.title,
      facts: [
        `Type: ${asset.assetType}`,
        `${asset.relationshipCount} linked assets`,
        `${asset.tags.length} tags`,
      ],
      evidence: link,
    };
  }

  if (kind === "project") {
    const project = world.portfolioExplorer.projects.find((candidate) => candidate.projectId === link.selection!.projectId);
    if (!project) return undefined;
    return {
      kind,
      title: project.name,
      facts: [
        `Lifecycle: ${project.lifecycleState}`,
        `${project.capabilityIds.length} capabilities`,
        `${project.agentIds.length} agents`,
      ],
      evidence: link,
    };
  }

  if (kind === "workspace") {
    const workspace = world.portfolioExplorer.workspaces.find((candidate) => candidate.workspaceId === link.selection!.workspaceId);
    if (!workspace) return undefined;
    return {
      kind,
      title: workspace.name,
      facts: [
        `Status: ${workspace.status}`,
        `${workspace.assetCount} assets`,
        `${workspace.projectIds.length} projects`,
      ],
      evidence: link,
    };
  }

  return undefined;
}

export function buildConversationContext(
  focus: ExecutiveFocusState,
  world: WorldData,
  investigation?: string,
): ConversationContextState {
  const selection: RouteSelection = {
    ...(focus.missionId ? { missionId: focus.missionId } : {}),
    ...(focus.projectId ? { projectId: focus.projectId } : {}),
    ...(focus.workspaceId ? { workspaceId: focus.workspaceId } : {}),
    ...(focus.companyId ? { companyId: focus.companyId } : {}),
  };
  const resolved = resolveContext(selection, world);

  return {
    planet: "Enterprise (single-planet deployment)",
    company: resolved.company?.name,
    workspace: resolved.workspace?.name,
    project: resolved.project?.name,
    mission: resolved.mission?.title,
    investigation,
  };
}

function relativeTimeLabel(offset: number): string {
  const minutesAgo = offset * 17 + 4;
  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`;
  }
  const hoursAgo = Math.round(minutesAgo / 60);
  return `${hoursAgo}h ago`;
}

export type BriefingType =
  | "morning"
  | "afternoon"
  | "evening"
  | "weekly"
  | "monthly"
  | "mission"
  | "project"
  | "workspace"
  | "company"
  | "planet"
  | "emergency"
  | "infrastructure";

export type ExtendedBriefing = {
  type: BriefingType;
  title: string;
  summary: string;
  highlights: string[];
  evidence?: EvidenceLink;
};

const HISTORY_CAVEAT = "Beta-1 has no historical trend data yet, so this reflects current operating state only.";

export function buildExtendedBriefings(
  world: WorldData,
  simulation: ExecutiveSimulationState,
  focus: ExecutiveFocusState,
): ExtendedBriefing[] {
  const missions = allMissionsOf(world);
  const blocked = missions.filter((mission) => simulation.missions[mission.missionId]?.isBlocked);
  const overdue = missions.filter((mission) => simulation.missions[mission.missionId]?.isOverdue);
  const offlineAgents = world.agentCentre.profiles.filter((agent) => simulation.agents[agent.agentId]?.activity === "offline" || simulation.agents[agent.agentId]?.activity === "blocked");
  const degradedTools = world.toolCentre.tools.filter((tool) => simulation.tools[tool.toolId]?.health !== "healthy");
  const completed = world.missionCentre.counts.completed;

  const briefings: ExtendedBriefing[] = [];

  const periodBriefings = buildBriefings(world, simulation);
  periodBriefings.forEach((briefing) => {
    briefings.push({ type: briefing.period, title: briefing.title, summary: briefing.summary, highlights: briefing.highlights });
  });

  briefings.push({
    type: "weekly",
    title: "Weekly Briefing",
    summary: `Across the period in view: ${completed} mission(s) completed, ${blocked.length} blocked, ${degradedTools.length} tool(s) degraded. ${HISTORY_CAVEAT}`,
    highlights: [
      `${missions.length} missions tracked overall`,
      `${world.knowledgeCentre.assets.length} knowledge assets in the portfolio`,
      `${world.agentCentre.profiles.length} agents registered`,
    ],
  });

  briefings.push({
    type: "monthly",
    title: "Monthly Briefing",
    summary: `Portfolio-wide snapshot: ${world.portfolioExplorer.companies.length} companies, ${world.portfolioExplorer.workspaces.length} workspaces, ${world.portfolioExplorer.projects.length} projects in view. ${HISTORY_CAVEAT}`,
    highlights: [
      `${completed} mission(s) completed to date`,
      `${blocked.length} mission(s) currently blocked`,
      `${world.conversationCentre.counts.conversations} conversations tracked`,
    ],
  });

  const focusedMission = focus.missionId ? missions.find((mission) => mission.missionId === focus.missionId) : missions[0];
  briefings.push({
    type: "mission",
    title: "Mission Briefing",
    summary: focusedMission
      ? `${focusedMission.title} is currently ${focusedMission.status}${simulation.missions[focusedMission.missionId]?.isBlocked ? ", and blocked" : ""}.`
      : "No mission currently in focus.",
    highlights: focusedMission
      ? [
          focusedMission.assignedAgentId ? `Assigned to ${focusedMission.assignedAgentId}` : "No assigned agent",
          `${focusedMission.capabilityIds.length} capabilities required`,
          simulation.missions[focusedMission.missionId]?.isOverdue ? "Running behind schedule" : "On schedule",
        ]
      : ["Select a mission to focus this briefing."],
    evidence: focusedMission ? { label: "Open Mission", page: "missions", selection: { missionId: focusedMission.missionId } } : undefined,
  });

  const focusedProject = focus.projectId
    ? world.portfolioExplorer.projects.find((project) => project.projectId === focus.projectId)
    : world.portfolioExplorer.projects[0];
  briefings.push({
    type: "project",
    title: "Project Briefing",
    summary: focusedProject
      ? `${focusedProject.name} is ${focusedProject.lifecycleState}, with ${focusedProject.agentIds.length} agent(s) and ${focusedProject.capabilityIds.length} capabilities engaged.`
      : "No project currently in focus.",
    highlights: focusedProject
      ? [
          focusedProject.nextActionSummary ?? "No next action recorded.",
          focusedProject.companyId ? `Part of ${focusedProject.companyId}` : "No parent company linked.",
        ]
      : ["Select a project to focus this briefing."],
    evidence: focusedProject ? { label: "Open Project", page: "workspaces", selection: { projectId: focusedProject.projectId } } : undefined,
  });

  const focusedWorkspace = focus.workspaceId
    ? world.portfolioExplorer.workspaces.find((workspace) => workspace.workspaceId === focus.workspaceId)
    : world.portfolioExplorer.workspaces[0];
  briefings.push({
    type: "workspace",
    title: "Workspace Briefing",
    summary: focusedWorkspace
      ? `${focusedWorkspace.name} is ${focusedWorkspace.status}, with ${focusedWorkspace.assetCount} assets and ${focusedWorkspace.projectIds.length} projects.`
      : "No workspace currently in focus.",
    highlights: focusedWorkspace
      ? [
          focusedWorkspace.knowledgeBoundarySummary ?? "No knowledge boundary summary recorded.",
          `${focusedWorkspace.relationshipCount} relationships tracked`,
        ]
      : ["Select a workspace to focus this briefing."],
    evidence: focusedWorkspace ? { label: "Open Workspace", page: "workspaces", selection: { workspaceId: focusedWorkspace.workspaceId } } : undefined,
  });

  const focusedCompany = focus.companyId
    ? world.portfolioExplorer.companies.find((company) => company.companyId === focus.companyId)
    : world.portfolioExplorer.companies[0];
  briefings.push({
    type: "company",
    title: "Company Briefing",
    summary: focusedCompany
      ? `${focusedCompany.name} is ${focusedCompany.lifecycleState}, spanning ${focusedCompany.projectIds.length} projects and ${focusedCompany.agentIds.length} agents.`
      : "No company currently in focus.",
    highlights: focusedCompany
      ? [focusedCompany.mission, `${focusedCompany.capabilityIds.length} capabilities in scope`]
      : ["Select a company to focus this briefing."],
    evidence: focusedCompany ? { label: "Open Company", page: "workspaces", selection: { companyId: focusedCompany.companyId } } : undefined,
  });

  briefings.push({
    type: "planet",
    title: "Planet Briefing",
    summary: `Enterprise (single-planet deployment): ${world.portfolioExplorer.companies.length} companies, ${missions.length} missions, ${world.agentCentre.profiles.length} agents in view.`,
    highlights: [
      `${world.toolCentre.tools.length} tools registered`,
      `${world.knowledgeCentre.assets.length} knowledge assets tracked`,
      "Galaxy and additional planets are not yet implemented — see Planetary-Operating-Model.md.",
    ],
  });

  const emergencyConditions = blocked.length + degradedTools.length + offlineAgents.length;
  briefings.push({
    type: "emergency",
    title: "Emergency Briefing",
    summary: emergencyConditions >= 3
      ? `${emergencyConditions} concurrent issue(s) detected across missions, tools, and agents — this warrants immediate review.`
      : "No emergency conditions detected right now.",
    highlights: emergencyConditions >= 3
      ? [
          `${blocked.length} mission(s) blocked`,
          `${degradedTools.length} tool(s) degraded`,
          `${offlineAgents.length} agent(s) offline or blocked`,
        ]
      : ["All systems are within normal operating parameters."],
  });

  briefings.push({
    type: "infrastructure",
    title: "Infrastructure Briefing",
    summary: `Live simulated health score: ${simulation.healthScore}/100. ${degradedTools.length} tool(s) and ${offlineAgents.length} agent(s) need attention.`,
    highlights: [
      `${world.toolCentre.tools.length} tools registered, ${degradedTools.length} degraded`,
      `${world.agentCentre.profiles.length} agents registered, ${offlineAgents.length} offline or blocked`,
      `${overdue.length} mission(s) running behind schedule`,
    ],
    evidence: { label: "Open Health / Readiness", page: "health" },
  });

  return briefings;
}
