import type { EvidenceLink } from "./executiveAssistant";
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
