import type { NavPage } from "../data/mockKernel";
import type { RouteSelection } from "../routing";
import type { WorldNode, WorldSummaryCounts } from "../worldModel";
import { StatusBadge } from "./StatusBadge";

type StatusLike = { label: string; tone: "ready" | "warning" | "blocked" | "active" | "idle" | "complete" };

type EnterpriseExplorerProps = {
  tree: WorldNode;
  summary: WorldSummaryCounts;
  healthStatus: StatusLike;
  readinessStatus: StatusLike;
  selection: RouteSelection;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

const kindTag: Record<WorldNode["kind"], string> = {
  portfolio: "WRLD",
  company: "CO",
  workspace: "WS",
  project: "PRJ",
  mission: "MSN",
  conversation: "CONV",
  knowledge: "KNOW",
  agent: "AGT",
  tool: "TL",
};

function isNodeActive(node: WorldNode, selection: RouteSelection): boolean {
  const keys = Object.keys(node.selection) as Array<keyof RouteSelection>;
  if (!keys.length) {
    return false;
  }
  return keys.every((key) => selection[key] === node.selection[key]);
}

type WorldTreeNodeProps = {
  node: WorldNode;
  depth: number;
  selection: RouteSelection;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

function WorldTreeNode({ node, depth, selection, expanded, onToggle, onNavigate }: WorldTreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const active = isNodeActive(node, selection);

  return (
    <li className="world-tree-node">
      <div className={`world-tree-row ${active ? "is-selected" : ""}`} style={{ paddingLeft: `${depth * 1.1}rem` }}>
        {hasChildren ? (
          <button
            type="button"
            className={`world-tree-caret ${isOpen ? "is-open" : ""}`}
            onClick={() => onToggle(node.id)}
            aria-label={isOpen ? `Collapse ${node.label}` : `Expand ${node.label}`}
          >
            ▸
          </button>
        ) : (
          <span className="world-tree-caret-spacer" />
        )}
        <span className={`world-node-tag world-node-tag-${node.kind}`}>{kindTag[node.kind]}</span>
        <button type="button" className="world-tree-label" onClick={() => onNavigate(node.page, node.selection)}>
          {node.label}
        </button>
      </div>
      {hasChildren && isOpen ? (
        <ul className="world-tree-children">
          {node.children.map((child) => (
            <WorldTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selection={selection}
              expanded={expanded}
              onToggle={onToggle}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function EnterpriseExplorer({
  tree,
  summary,
  healthStatus,
  readinessStatus,
  selection,
  expanded,
  onToggle,
  onNavigate,
}: EnterpriseExplorerProps) {
  const summaryItems: Array<{ label: string; value: number | string; tone?: StatusLike["tone"] }> = [
    { label: "Companies", value: summary.companies },
    { label: "Workspaces", value: summary.workspaces },
    { label: "Projects", value: summary.projects },
    { label: "Missions", value: summary.missions },
    { label: "Agents", value: summary.agents },
    { label: "Knowledge Assets", value: summary.knowledgeAssets },
    { label: "Tools", value: summary.tools },
    { label: "Conversations", value: summary.conversations },
  ];

  return (
    <section className="panel surface enterprise-explorer-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Enterprise World Model</h3>
          <span>Unified portfolio, company, workspace, project, and runtime navigation tree.</span>
        </div>
      </div>

      <div className="world-summary-band">
        {summaryItems.map((item) => (
          <div key={item.label} className="world-summary-chip">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
        <div className="world-summary-chip">
          <StatusBadge tone={healthStatus.tone}>{healthStatus.label}</StatusBadge>
          <span>Health</span>
        </div>
        <div className="world-summary-chip">
          <StatusBadge tone={readinessStatus.tone}>{readinessStatus.label}</StatusBadge>
          <span>Readiness</span>
        </div>
      </div>

      <ul className="world-tree-root">
        <WorldTreeNode node={tree} depth={0} selection={selection} expanded={expanded} onToggle={onToggle} onNavigate={onNavigate} />
      </ul>
    </section>
  );
}
