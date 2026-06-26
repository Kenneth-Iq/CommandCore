import { useState } from "react";
import type { NavPage } from "../data/mockKernel";
import type { RouteSelection } from "../routing";
import type { WorldNode } from "../worldModel";
import { WorldTreeNode } from "./EnterpriseExplorer";
import { StatusBadge } from "./StatusBadge";

type GalaxyNavigatorProps = {
  tree: WorldNode;
  selection: RouteSelection;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function GalaxyNavigator({ tree, selection, onNavigate }: GalaxyNavigatorProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([tree.id, ...tree.children.map((child) => child.id)]));

  function toggle(id: string) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <section className="panel surface galaxy-navigator-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Planetary Navigation Preview</h3>
          <span>Galaxy → Planet → Company → Workspace → Project → Mission, derived from existing portfolio data.</span>
        </div>
        <StatusBadge tone="idle">Single-Planet Preview</StatusBadge>
      </div>

      <p className="galaxy-navigator-note">
        This preview wraps the existing Enterprise World Model in a Galaxy and Planet layer. Only one galaxy and one planet exist
        today — see the Planetary Operating Model documentation for what a multi-planet deployment would add.
      </p>

      <ul className="world-tree-root">
        <WorldTreeNode node={tree} depth={0} selection={selection} expanded={expanded} onToggle={toggle} onNavigate={onNavigate} />
      </ul>
    </section>
  );
}
