import { buildWorldSummary, type WorldData } from "../worldModel";
import { StatusBadge } from "./StatusBadge";
import type { PageData } from "../data/mockKernel";

type StatusWallProps = {
  world: WorldData;
  healthStatus: PageData["status"];
  readinessStatus: PageData["status"];
};

export function StatusWall({ world, healthStatus, readinessStatus }: StatusWallProps) {
  const summary = buildWorldSummary(world);
  const items: Array<{ label: string; value: number | string }> = [
    { label: "Companies", value: summary.companies },
    { label: "Workspaces", value: summary.workspaces },
    { label: "Projects", value: summary.projects },
    { label: "Missions", value: summary.missions },
    { label: "Agents", value: summary.agents },
    { label: "Tools", value: summary.tools },
    { label: "Knowledge Assets", value: summary.knowledgeAssets },
    { label: "Conversations", value: summary.conversations },
  ];

  return (
    <div className="status-wall">
      <div className="status-wall-badges">
        <StatusBadge tone={healthStatus.tone}>Health: {healthStatus.label}</StatusBadge>
        <StatusBadge tone={readinessStatus.tone}>Readiness: {readinessStatus.label}</StatusBadge>
      </div>
      <div className="status-wall-grid">
        {items.map((item) => (
          <div key={item.label} className="status-wall-chip">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
