import type { RouteSelection } from "../routing";

type SelectedContextBarProps = {
  label: string;
  selection: RouteSelection;
};

export function SelectedContextBar({ label, selection }: SelectedContextBarProps) {
  const entries = Object.entries(selection).filter(([, value]) => Boolean(value));
  if (!entries.length) {
    return null;
  }

  return (
    <div className="surface selected-context-bar">
      <strong>{label}</strong>
      <div className="selected-context-chips">
        {entries.map(([key, value]) => (
          <span key={key} className="scope-badge">
            <strong>{formatKey(key)}</strong>
            <span>{value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function formatKey(key: string): string {
  return key.replace(/Id$/, "");
}
