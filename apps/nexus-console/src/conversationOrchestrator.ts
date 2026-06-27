import type { EvidenceLink } from "./executiveAssistant";
import type { ConversationBadgeKind } from "./operatorPrefs";
import type { ExecutiveSimulationState } from "./simulation";
import type { WorldData } from "./worldModel";

export type JarvisPresenceState = "idle" | "listening" | "thinking" | "speaking" | "alert";

export type ConversationIntentKind = "mission" | "agent" | "tool" | "knowledge" | "conversation" | "attention" | "unknown";

export type IntentClassification = {
  kind: ConversationIntentKind;
  confidence: number;
  matchedKeywords: string[];
  impliesAction: boolean;
};

export type ApprovalPlaceholderStatus = "not_required" | "would_require_approval";

export type ApprovalPlaceholder = {
  status: ApprovalPlaceholderStatus;
  note: string;
};

export type ConversationTurnResult = {
  message: string;
  intent: IntentClassification;
  evidence: EvidenceLink[];
  suggestedResponse: string;
  routeSuggestion?: EvidenceLink;
  approval: ApprovalPlaceholder;
};

const INTENT_KEYWORDS: Record<Exclude<ConversationIntentKind, "unknown">, string[]> = {
  mission: ["mission", "missions"],
  agent: ["agent", "agents"],
  tool: ["tool", "tools"],
  knowledge: ["knowledge", "asset", "assets"],
  conversation: ["conversation", "conversations", "thread"],
  attention: ["attention", "today", "urgent", "important"],
};

const ACTION_KEYWORDS = ["reassign", "restart", "approve", "cancel", "escalate", "decommission", "retry", "rerun", "deploy"];

function allMissionsOf(world: WorldData) {
  return [...world.missionCentre.active, ...world.missionCentre.completed, ...world.missionCentre.failed];
}

export function classifyIntent(message: string): IntentClassification {
  const normalized = message.toLowerCase();
  const impliesAction = ACTION_KEYWORDS.some((keyword) => normalized.includes(keyword));

  let best: { kind: ConversationIntentKind; matchedKeywords: string[] } = { kind: "unknown", matchedKeywords: [] };

  for (const kind of Object.keys(INTENT_KEYWORDS) as Array<Exclude<ConversationIntentKind, "unknown">>) {
    const matched = INTENT_KEYWORDS[kind].filter((keyword) => normalized.includes(keyword));
    if (matched.length > best.matchedKeywords.length) {
      best = { kind, matchedKeywords: matched };
    }
  }

  const confidence = best.matchedKeywords.length > 0 ? Math.min(95, 55 + best.matchedKeywords.length * 20) : 20;

  return {
    kind: best.kind,
    confidence,
    matchedKeywords: best.matchedKeywords,
    impliesAction,
  };
}

export function lookupEvidence(intent: IntentClassification, world: WorldData, simulation: ExecutiveSimulationState): EvidenceLink[] {
  const missions = allMissionsOf(world);

  if (intent.kind === "mission") {
    const blocked = missions.filter((mission) => simulation.missions[mission.missionId]?.isBlocked);
    return (blocked.length ? blocked : missions.slice(0, 1)).slice(0, 3).map((mission) => ({
      label: mission.title,
      page: "missions",
      selection: { missionId: mission.missionId },
    }));
  }

  if (intent.kind === "agent") {
    const offline = world.agentCentre.profiles.filter((agent) => simulation.agents[agent.agentId]?.activity === "offline" || simulation.agents[agent.agentId]?.activity === "blocked");
    const pool = offline.length ? offline : world.agentCentre.profiles.slice(0, 1);
    return pool.slice(0, 3).map((agent) => ({ label: agent.name, page: "agents", selection: { agentId: agent.agentId } }));
  }

  if (intent.kind === "tool") {
    const unhealthy = world.toolCentre.tools.filter((tool) => simulation.tools[tool.toolId]?.health !== "healthy");
    const pool = unhealthy.length ? unhealthy : world.toolCentre.tools.slice(0, 1);
    return pool.slice(0, 3).map((tool) => ({ label: tool.name, page: "tools", selection: { toolId: tool.toolId } }));
  }

  if (intent.kind === "knowledge") {
    const recent = world.knowledgeCentre.assets.filter((asset) => simulation.knowledge[asset.assetId]?.recentlyLinked);
    const pool = recent.length ? recent : world.knowledgeCentre.assets.slice(0, 1);
    return pool.slice(0, 3).map((asset) => ({ label: asset.title, page: "knowledge", selection: { assetId: asset.assetId } }));
  }

  if (intent.kind === "conversation") {
    return world.conversationCentre.conversations.slice(0, 3).map((conversation) => ({
      label: conversation.conversationId,
      page: "conversations",
      selection: { conversationId: conversation.conversationId },
    }));
  }

  if (intent.kind === "attention") {
    const blocked = missions.filter((mission) => simulation.missions[mission.missionId]?.isBlocked);
    if (blocked.length) {
      return [{ label: blocked[0].title, page: "missions", selection: { missionId: blocked[0].missionId } }];
    }
    return [{ label: "Open Executive Health Board", page: "kernel" }];
  }

  return [];
}

export function buildSuggestedResponse(
  intent: IntentClassification,
  evidence: EvidenceLink[],
  world: WorldData,
  simulation: ExecutiveSimulationState,
): string {
  const missions = allMissionsOf(world);

  if (intent.kind === "mission") {
    const blocked = missions.filter((mission) => simulation.missions[mission.missionId]?.isBlocked);
    const overdue = missions.filter((mission) => simulation.missions[mission.missionId]?.isOverdue);
    return `There are ${missions.length} missions in view, ${blocked.length} blocked and ${overdue.length} running behind.`;
  }

  if (intent.kind === "agent") {
    const offline = world.agentCentre.profiles.filter((agent) => simulation.agents[agent.agentId]?.activity === "offline" || simulation.agents[agent.agentId]?.activity === "blocked");
    return `${world.agentCentre.profiles.length} agents are registered; ${offline.length} are offline or blocked right now.`;
  }

  if (intent.kind === "tool") {
    const unhealthy = world.toolCentre.tools.filter((tool) => simulation.tools[tool.toolId]?.health !== "healthy");
    return `${world.toolCentre.tools.length} tools are registered; ${unhealthy.length} are reporting degraded or down health.`;
  }

  if (intent.kind === "knowledge") {
    const recent = world.knowledgeCentre.assets.filter((asset) => simulation.knowledge[asset.assetId]?.recentlyLinked);
    return `${world.knowledgeCentre.assets.length} knowledge assets are tracked; ${recent.length} were recently linked.`;
  }

  if (intent.kind === "conversation") {
    return `${world.conversationCentre.conversations.length} conversations are active across the portfolio.`;
  }

  if (intent.kind === "attention") {
    return evidence.length
      ? `${evidence[0].label} needs attention right now.`
      : "Everything is operating normally right now.";
  }

  return "Conversational intelligence is simulated in this build — AI calls are disabled. Try asking about missions, agents, tools, knowledge, or conversations.";
}

export function buildApprovalPlaceholder(intent: IntentClassification): ApprovalPlaceholder {
  if (intent.impliesAction) {
    return {
      status: "would_require_approval",
      note: "This would require an approved command in a future build. No command has been issued — write operations remain disabled.",
    };
  }
  return {
    status: "not_required",
    note: "This is a read-only question — no approval is needed to answer it.",
  };
}

export function processConversationTurn(message: string, world: WorldData, simulation: ExecutiveSimulationState): ConversationTurnResult {
  const intent = classifyIntent(message);
  const evidence = lookupEvidence(intent, world, simulation);
  const suggestedResponse = buildSuggestedResponse(intent, evidence, world, simulation);
  const routeSuggestion = evidence[0];
  const approval = buildApprovalPlaceholder(intent);

  return {
    message,
    intent,
    evidence,
    suggestedResponse,
    routeSuggestion,
    approval,
  };
}

export function classifyBadge(turn: ConversationTurnResult): ConversationBadgeKind {
  if (turn.approval.status === "would_require_approval") {
    return "approval";
  }
  if (turn.intent.kind === "attention" || turn.intent.kind === "mission" || turn.intent.kind === "agent" || turn.intent.kind === "tool") {
    return turn.evidence.length ? "warning" : "information";
  }
  return "information";
}
