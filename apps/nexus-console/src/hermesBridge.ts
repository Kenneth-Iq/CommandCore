import type { ApprovalCard, EvidenceLink } from "./executiveAssistant";
import type { ExecutiveSimulationState } from "./simulation";
import type { WorldData } from "./worldModel";

export type HermesHandoffField = {
  field: string;
  value: string;
};

export type HermesActionPreview = {
  id: string;
  toolId: string;
  toolName: string;
  actionLabel: string;
  description: string;
  permissionLevel: string;
  policyWarning?: string;
  handoffPreview: HermesHandoffField[];
  evidence: EvidenceLink;
};

export function buildHermesActionPreviews(world: WorldData, simulation: ExecutiveSimulationState): HermesActionPreview[] {
  return world.toolCentre.tools.map((tool) => {
    const health = simulation.tools[tool.toolId]?.health;
    const warnings: string[] = [];

    if (health && health !== "healthy") {
      warnings.push(`${tool.name} is reporting ${health} health — a handoff would likely fail or degrade.`);
    }
    if (tool.permissionLevel.toLowerCase() === "privileged" || tool.permissionLevel.toLowerCase() === "restricted") {
      warnings.push(`${tool.permissionLevel} tools require an approved command before Hermes could ever execute this.`);
    }

    return {
      id: `hermes-preview-${tool.toolId}`,
      toolId: tool.toolId,
      toolName: tool.name,
      actionLabel: `Invoke ${tool.name}`,
      description: tool.description,
      permissionLevel: tool.permissionLevel,
      policyWarning: warnings.length ? warnings.join(" ") : undefined,
      handoffPreview: [
        { field: "toolId", value: tool.toolId },
        { field: "agentId", value: tool.agentId ?? "unassigned" },
        { field: "permissionLevel", value: tool.permissionLevel },
        { field: "status", value: tool.status },
      ],
      evidence: { label: "Open Tool", page: "tools", selection: { toolId: tool.toolId } },
    };
  });
}

export type HermesQueueKind = "mission" | "execution" | "tool" | "policy" | "approval";

export type HermesQueueItem = {
  id: string;
  kind: HermesQueueKind;
  title: string;
  detail: string;
  status: string;
  evidence: EvidenceLink;
};

export function buildHermesQueues(
  world: WorldData,
  hermesActions: HermesActionPreview[],
  approvalCards: ApprovalCard[],
): Record<HermesQueueKind, HermesQueueItem[]> {
  const missionQueue: HermesQueueItem[] = world.missionCentre.active.map((mission) => ({
    id: `hermes-mission-${mission.missionId}`,
    kind: "mission",
    title: mission.title,
    detail: `Status: ${mission.status}. Would be the originating mission for any Hermes-executed tool call.`,
    status: "queued",
    evidence: { label: "Open Mission", page: "missions", selection: { missionId: mission.missionId } },
  }));

  const executionQueue: HermesQueueItem[] = hermesActions
    .filter((action) => !action.policyWarning)
    .map((action) => ({
      id: `hermes-execution-${action.toolId}`,
      kind: "execution",
      title: action.actionLabel,
      detail: "Would execute next if Hermes execution were enabled.",
      status: "would-execute",
      evidence: action.evidence,
    }));

  const toolQueue: HermesQueueItem[] = hermesActions.map((action) => ({
    id: `hermes-tool-${action.toolId}`,
    kind: "tool",
    title: action.toolName,
    detail: action.description,
    status: action.permissionLevel,
    evidence: action.evidence,
  }));

  const policyQueue: HermesQueueItem[] = hermesActions
    .filter((action) => action.policyWarning)
    .map((action) => ({
      id: `hermes-policy-${action.toolId}`,
      kind: "policy",
      title: action.actionLabel,
      detail: action.policyWarning ?? "",
      status: "blocked",
      evidence: action.evidence,
    }));

  const approvalQueue: HermesQueueItem[] = approvalCards.map((card) => ({
    id: `hermes-approval-${card.id}`,
    kind: "approval",
    title: card.title,
    detail: card.detail,
    status: card.status,
    evidence: card.evidence ?? { label: "Open Executive Health Board", page: "kernel" },
  }));

  return {
    mission: missionQueue,
    execution: executionQueue,
    tool: toolQueue,
    policy: policyQueue,
    approval: approvalQueue,
  };
}
