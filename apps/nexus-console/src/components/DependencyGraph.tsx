import type { NavPage } from "../data/mockKernel";
import type { RouteSelection } from "../routing";

type DependencyNode = {
  label: string;
  value: string;
  page: NavPage;
  selection?: RouteSelection;
};

type DependencyGraphProps = {
  nodes: DependencyNode[];
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function DependencyGraph({ nodes, onNavigate }: DependencyGraphProps) {
  const width = 320;
  const height = 540;
  const startX = width / 2;
  const startY = 56;
  const gap = 68;

  return (
    <section className="panel surface dependency-graph-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Dependency Graph</h3>
          <span>Mission-to-company relationship chain for the current executive focus.</span>
        </div>
      </div>
      <div className="dependency-graph-shell">
        <svg viewBox={`0 0 ${width} ${height}`} className="dependency-graph-svg" role="img" aria-label="Executive dependency graph">
          {nodes.map((node, index) => {
            const y = startY + index * gap;
            const nextY = startY + (index + 1) * gap;
            return (
              <g key={node.label}>
                {index < nodes.length - 1 ? (
                  <line x1={startX} y1={y + 20} x2={startX} y2={nextY - 20} className="dependency-line" />
                ) : null}
                <circle cx={startX} cy={y} r="12" className="dependency-node-dot" />
                <foreignObject x={40} y={y - 24} width={240} height={48}>
                  <button type="button" className="dependency-node-card" onClick={() => onNavigate(node.page, node.selection)}>
                    <strong>{node.label}</strong>
                    <span>{node.value}</span>
                  </button>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
