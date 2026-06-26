import type {
  ApprovalCard,
  DecisionItem,
  EvidenceLink,
  FollowUpItem,
  RecommendationCard,
} from "./executiveAssistant";
import type { RouteSelection } from "./routing";
import type { ExecutiveSimulationState } from "./simulation";

export type EvidenceSourceKind = "recommendation" | "decision" | "followup" | "approval";

export type EvidenceRegistryItem = {
  id: string;
  sourceKind: EvidenceSourceKind;
  sourceLabel: string;
  evidence: EvidenceLink;
  confidence: number;
  occurredAt: string;
};

export type EvidenceHealth = "healthy" | "degraded" | "blocked" | "stable";

const SOURCE_LABEL: Record<EvidenceSourceKind, string> = {
  recommendation: "Recommendation Centre",
  decision: "Decision Queue",
  followup: "Pending Follow Ups",
  approval: "Approval Cards",
};

export function evidenceTargetKey(link: EvidenceLink | undefined): string | undefined {
  if (!link?.selection) {
    return undefined;
  }
  const { missionId, agentId, toolId, assetId, projectId, workspaceId, companyId, conversationId } = link.selection;
  if (missionId) return `mission:${missionId}`;
  if (agentId) return `agent:${agentId}`;
  if (toolId) return `tool:${toolId}`;
  if (assetId) return `knowledge:${assetId}`;
  if (projectId) return `project:${projectId}`;
  if (workspaceId) return `workspace:${workspaceId}`;
  if (companyId) return `company:${companyId}`;
  if (conversationId) return `conversation:${conversationId}`;
  return undefined;
}

function selectionTargetKey(selection: RouteSelection): string | undefined {
  return evidenceTargetKey({ label: "", page: "kernel", selection });
}

export function buildEvidenceRegistry(
  recommendations: RecommendationCard[],
  decisions: DecisionItem[],
  followUps: FollowUpItem[],
  approvals: ApprovalCard[],
): EvidenceRegistryItem[] {
  const items: EvidenceRegistryItem[] = [];

  recommendations.forEach((card, index) => {
    items.push({
      id: `evidence-recommendation-${card.id}`,
      sourceKind: "recommendation",
      sourceLabel: card.title,
      evidence: card.evidence,
      confidence: card.confidence,
      occurredAt: relativeTimeLabel(index),
    });
  });

  decisions.forEach((item, index) => {
    if (!item.evidence) return;
    items.push({
      id: `evidence-decision-${item.id}`,
      sourceKind: "decision",
      sourceLabel: item.title,
      evidence: item.evidence,
      confidence: item.status === "completed" ? 90 : item.status === "waiting" ? 70 : 50,
      occurredAt: item.occurredAt ?? relativeTimeLabel(index),
    });
  });

  followUps.forEach((item, index) => {
    if (!item.evidence) return;
    items.push({
      id: `evidence-followup-${item.id}`,
      sourceKind: "followup",
      sourceLabel: item.text,
      evidence: item.evidence,
      confidence: item.resolved ? 95 : 60,
      occurredAt: relativeTimeLabel(index),
    });
  });

  approvals.forEach((item, index) => {
    if (!item.evidence) return;
    items.push({
      id: `evidence-approval-${item.id}`,
      sourceKind: "approval",
      sourceLabel: item.title,
      evidence: item.evidence,
      confidence: item.status === "approved" ? 95 : item.status === "rejected" ? 40 : 65,
      occurredAt: item.requestedAt ?? relativeTimeLabel(index),
    });
  });

  return items;
}

export function evidenceForSelection(registry: EvidenceRegistryItem[], selection: RouteSelection): EvidenceRegistryItem[] {
  const key = selectionTargetKey(selection);
  if (!key) {
    return [];
  }
  return registry.filter((item) => evidenceTargetKey(item.evidence) === key);
}

export function resolveEvidenceHealth(link: EvidenceLink, simulation: ExecutiveSimulationState): EvidenceHealth {
  const selection = link.selection;
  if (!selection) {
    return "stable";
  }
  if (selection.missionId) {
    const state = simulation.missions[selection.missionId];
    if (state?.isBlocked) return "blocked";
    if (state?.isOverdue) return "degraded";
    return "healthy";
  }
  if (selection.agentId) {
    const activity = simulation.agents[selection.agentId]?.activity;
    if (activity === "offline" || activity === "blocked") return "blocked";
    if (activity === "idle") return "degraded";
    return "healthy";
  }
  if (selection.toolId) {
    const health = simulation.tools[selection.toolId]?.health;
    return health === "healthy" ? "healthy" : health ? "degraded" : "stable";
  }
  return "stable";
}

export function sourceKindLabel(kind: EvidenceSourceKind): string {
  return SOURCE_LABEL[kind];
}

function relativeTimeLabel(offset: number): string {
  const minutesAgo = offset * 13 + 6;
  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`;
  }
  const hoursAgo = Math.round(minutesAgo / 60);
  return `${hoursAgo}h ago`;
}
