import type { NavPage } from "../data/mockKernel";
import type { RouteSelection } from "../routing";
import type { RelationshipCardData } from "../worldModel";

type RelationshipExplorerProps = {
  centerLabel: string;
  data: RelationshipCardData;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

type ExplorerNode = {
  label: string;
  page: NavPage;
  selection: RouteSelection;
  group: "parent" | "belongsTo" | "related" | "dependency" | "child";
};

export function RelationshipExplorer({ centerLabel, data, onNavigate }: RelationshipExplorerProps) {
  const nodes: ExplorerNode[] = [
    ...(data.parent ? [{ ...data.parent, group: "parent" as const }] : []),
    ...data.belongsTo.map((link) => ({ ...link, group: "belongsTo" as const })),
    ...data.relatedItems.map((link) => ({ ...link, group: "related" as const })),
    ...data.dependencies.map((link) => ({ ...link, group: "dependency" as const })),
    ...data.children.map((link) => ({ ...link, group: "child" as const })),
  ];

  const width = 420;
  const height = 420;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 150;

  return (
    <section className="panel surface relationship-explorer-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Relationship Explorer</h3>
          <span>Visual neighborhood of the selected record across the enterprise world model.</span>
        </div>
      </div>

      {nodes.length ? (
        <div className="relationship-explorer-shell">
          <svg viewBox={`0 0 ${width} ${height}`} className="relationship-explorer-svg" role="img" aria-label="Relationship explorer">
            {nodes.map((node, index) => {
              const angle = (index / nodes.length) * Math.PI * 2 - Math.PI / 2;
              const x = centerX + radius * Math.cos(angle);
              const y = centerY + radius * Math.sin(angle);
              return (
                <g key={`${node.group}-${index}-${node.label}`}>
                  <line x1={centerX} y1={centerY} x2={x} y2={y} className={`relationship-explorer-line group-${node.group}`} />
                  <foreignObject x={x - 70} y={y - 22} width={140} height={44}>
                    <button
                      type="button"
                      className={`relationship-explorer-node group-${node.group}`}
                      onClick={() => onNavigate(node.page, node.selection)}
                    >
                      {node.label}
                    </button>
                  </foreignObject>
                </g>
              );
            })}
            <circle cx={centerX} cy={centerY} r="36" className="relationship-explorer-center-dot" />
            <foreignObject x={centerX - 85} y={centerY - 20} width={170} height={40}>
              <div className="relationship-explorer-center-label">{centerLabel}</div>
            </foreignObject>
          </svg>
        </div>
      ) : (
        <div className="empty-state">
          <strong>Nothing To Explore Yet</strong>
          <p>This record has no resolvable relationships to visualize in the current operating picture.</p>
        </div>
      )}
    </section>
  );
}
