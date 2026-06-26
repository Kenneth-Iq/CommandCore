import type { ScopeBadgeRecord } from "../data/nexusCentres";

const scopeLabels: Record<ScopeBadgeRecord["kind"], string> = {
  workspace: "Workspace",
  company: "Company",
  project: "Project",
  mission: "Mission",
};

type ScopeBadgeProps = {
  scope: ScopeBadgeRecord;
};

export function ScopeBadge({ scope }: ScopeBadgeProps) {
  return (
    <span className={`scope-badge scope-${scope.kind}`}>
      <strong>{scopeLabels[scope.kind]}</strong>
      <span>{scope.value}</span>
    </span>
  );
}
