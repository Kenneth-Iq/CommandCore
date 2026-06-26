type DependencyBadgeProps = {
  count: number;
  label?: string;
};

export function DependencyBadge({ count, label = "deps" }: DependencyBadgeProps) {
  if (!count) {
    return null;
  }
  return <span className="dependency-badge">{count} {label}</span>;
}
