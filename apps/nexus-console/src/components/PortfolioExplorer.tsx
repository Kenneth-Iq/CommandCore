import type { NavPage } from "../data/mockKernel";
import type { KnowledgeCentreData, PortfolioExplorerData } from "../data/nexusCentres";
import type { RouteSelection } from "../routing";
import { StatusBadge } from "./StatusBadge";

const routeMap: Array<{ label: string; page: NavPage }> = [
  { label: "Missions", page: "missions" },
  { label: "Agents", page: "agents" },
  { label: "Tools", page: "tools" },
  { label: "Knowledge", page: "knowledge" },
];

type PortfolioExplorerProps = {
  portfolioExplorer: PortfolioExplorerData;
  knowledgeCentre: KnowledgeCentreData;
  selectedWorkspaceId?: string;
  selectedCompanyId?: string;
  selectedProjectId?: string;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function PortfolioExplorer({
  portfolioExplorer,
  knowledgeCentre,
  selectedWorkspaceId,
  selectedCompanyId,
  selectedProjectId,
  onNavigate,
}: PortfolioExplorerProps) {
  const leadWorkspace = portfolioExplorer.workspaces.find((workspace) => workspace.workspaceId === selectedWorkspaceId) ?? portfolioExplorer.workspaces[0];
  const leadCompany = portfolioExplorer.companies.find((company) => company.companyId === selectedCompanyId) ?? portfolioExplorer.companies[0];

  return (
    <section className="portfolio-grid">
      <article className="surface panel portfolio-summary-panel">
        <div className="panel-header panel-title-stack">
          <h3>Portfolio Summary</h3>
          <span>Workspace, company, project, and capability coverage in one read-only surface.</span>
        </div>
        <div className="portfolio-summary-band">
          <div className="portfolio-metric-card">
            <span>Workspaces</span>
            <strong>{portfolioExplorer.workspaces.length}</strong>
          </div>
          <div className="portfolio-metric-card">
            <span>Companies</span>
            <strong>{portfolioExplorer.companies.length}</strong>
          </div>
          <div className="portfolio-metric-card">
            <span>Projects</span>
            <strong>{portfolioExplorer.projects.length}</strong>
          </div>
          <div className="portfolio-metric-card">
            <span>Capabilities</span>
            <strong>{portfolioExplorer.capabilities.length}</strong>
          </div>
        </div>
        {leadWorkspace || leadCompany ? (
          <div className="portfolio-focus-grid">
            {leadWorkspace ? (
              <button type="button" className={`portfolio-focus-card selectable-card ${selectedWorkspaceId === leadWorkspace.workspaceId ? "is-selected" : ""}`} onClick={() => onNavigate("workspaces", { workspaceId: leadWorkspace.workspaceId })}>
                <div className="knowledge-card-header">
                  <strong>{leadWorkspace.name}</strong>
                  <StatusBadge tone="active">{leadWorkspace.status}</StatusBadge>
                </div>
                <p>{leadWorkspace.knowledgeBoundarySummary ?? "Knowledge boundary summary not published."}</p>
                <div className="portfolio-tag-row">
                  <span>{leadWorkspace.assetCount} assets</span>
                  <span>{leadWorkspace.relationshipCount} relationships</span>
                  <span>{leadWorkspace.capabilityIds.length} capabilities</span>
                </div>
                <div className="route-chip-row mission-route-row">
                  <button type="button" className="route-chip" onClick={(event) => { event.stopPropagation(); onNavigate("missions"); }}>
                    Workspace → Missions
                  </button>
                  <button type="button" className="route-chip" onClick={(event) => { event.stopPropagation(); onNavigate("knowledge", workspaceKnowledgeSelection(knowledgeCentre, leadWorkspace.workspaceId)); }}>
                    Workspace → Assets
                  </button>
                </div>
              </button>
            ) : null}
            {leadCompany ? (
              <button type="button" className={`portfolio-focus-card selectable-card ${selectedCompanyId === leadCompany.companyId ? "is-selected" : ""}`} onClick={() => onNavigate("workspaces", { companyId: leadCompany.companyId })}>
                <div className="knowledge-card-header">
                  <strong>{leadCompany.name}</strong>
                  <StatusBadge tone="ready">{leadCompany.lifecycleState}</StatusBadge>
                </div>
                <p>{leadCompany.mission}</p>
                <div className="portfolio-tag-row">
                  <span>{leadCompany.projectIds.length} projects</span>
                  <span>{leadCompany.agentIds.length} agents</span>
                  <span>{leadCompany.capabilityIds.length} capabilities</span>
                </div>
                <div className="route-chip-row mission-route-row">
                  <button type="button" className="route-chip" onClick={(event) => { event.stopPropagation(); onNavigate("missions"); }}>
                    Company → Missions
                  </button>
                  <button type="button" className="route-chip" onClick={(event) => { event.stopPropagation(); onNavigate("knowledge", companyKnowledgeSelection(knowledgeCentre, leadCompany.companyId)); }}>
                    Company → Assets
                  </button>
                </div>
              </button>
            ) : null}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No Portfolio Records Yet</strong>
            <p>Portfolio summaries will appear here when workspace and company records are present.</p>
          </div>
        )}
      </article>

      <article className="surface panel portfolio-company-panel">
        <div className="panel-header panel-title-stack">
          <h3>Company + Project Cards</h3>
          <span>Operational units that can route back into other centres.</span>
        </div>
        {portfolioExplorer.companies.length || portfolioExplorer.projects.length ? (
          <div className="portfolio-card-list">
            {portfolioExplorer.companies.map((company) => (
              <button key={company.companyId} type="button" className={`portfolio-card-row selectable-card ${selectedCompanyId === company.companyId ? "is-selected" : ""}`} onClick={() => onNavigate("workspaces", { companyId: company.companyId })}>
                <div>
                  <div className="knowledge-card-header">
                    <strong>{company.name}</strong>
                    <span className="knowledge-asset-id">{company.companyId}</span>
                  </div>
                  <p>{company.mission}</p>
                  <div className="portfolio-tag-row">
                    <span>{company.projectIds.length} projects</span>
                    <span>{company.capabilityIds.length} capabilities</span>
                    <span>{company.agentIds.length} agents</span>
                  </div>
                </div>
                <div className="route-chip-row">
                  <button type="button" className="route-chip" onClick={(event) => { event.stopPropagation(); onNavigate("missions"); }}>Open Missions</button>
                  <button type="button" className="route-chip" onClick={(event) => { event.stopPropagation(); onNavigate("agents"); }}>Open Agents</button>
                  <button type="button" className="route-chip" onClick={(event) => { event.stopPropagation(); onNavigate("knowledge", companyKnowledgeSelection(knowledgeCentre, company.companyId)); }}>Open Assets</button>
                </div>
              </button>
            ))}
            {portfolioExplorer.projects.map((project) => (
              <button key={project.projectId} type="button" className={`portfolio-card-row selectable-card ${selectedProjectId === project.projectId ? "is-selected" : ""}`} onClick={() => onNavigate("workspaces", { projectId: project.projectId })}>
                <div>
                  <div className="knowledge-card-header">
                    <strong>{project.name}</strong>
                    <span className="knowledge-asset-id">{project.projectId}</span>
                  </div>
                  <p>{project.nextActionSummary ?? project.mission ?? "Project context available."}</p>
                  <div className="portfolio-tag-row">
                    <span>{project.capabilityIds.length} capabilities</span>
                    <span>{project.agentIds.length} agents</span>
                    <span>{project.lifecycleState}</span>
                  </div>
                </div>
                <div className="route-chip-row">
                  <button type="button" className="route-chip" onClick={(event) => { event.stopPropagation(); onNavigate("missions"); }}>Project → Missions</button>
                  <button type="button" className="route-chip" onClick={(event) => { event.stopPropagation(); onNavigate("tools"); }}>Project → Tools</button>
                  <button type="button" className="route-chip" onClick={(event) => { event.stopPropagation(); onNavigate("knowledge", projectKnowledgeSelection(knowledgeCentre, project.projectId)); }}>Project → Assets</button>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No Companies Or Projects</strong>
            <p>The current source has not published portfolio records yet.</p>
          </div>
        )}
      </article>

      <article className="surface panel portfolio-capability-panel">
        <div className="panel-header panel-title-stack">
          <h3>Capability List</h3>
          <span>Reusable operating skills with route links into runtime surfaces.</span>
        </div>
        {portfolioExplorer.capabilities.length ? (
          <div className="capability-list">
            {portfolioExplorer.capabilities.map((capability) => (
              <article key={capability.capabilityId} className="capability-row">
                <div>
                  <div className="knowledge-card-header">
                    <strong>{capability.name}</strong>
                    <span className="knowledge-asset-id">{capability.capabilityId}</span>
                  </div>
                  <p>{capability.description}</p>
                  <div className="portfolio-tag-row">
                    <span>{capability.permissionLevel}</span>
                    <span>{capability.certificationStatus}</span>
                    <span>{capability.marketplaceReady ? "marketplace ready" : "internal only"}</span>
                  </div>
                </div>
                <div className="knowledge-row-meta">
                  <StatusBadge tone={capability.marketplaceReady ? "ready" : "idle"}>
                    {capability.marketplaceReady ? "Ready" : "Internal"}
                  </StatusBadge>
                  <span>{capability.consumerCount} consumers</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No Capabilities Visible</strong>
            <p>Capability records will appear here when the portfolio surface is populated.</p>
          </div>
        )}
        <div className="route-chip-row">
          {routeMap.map((route) => (
            <button key={route.page} type="button" className="route-chip" onClick={() => onNavigate(route.page)}>
              Open {route.label}
            </button>
          ))}
        </div>
      </article>
    </section>
  );
}

function workspaceKnowledgeSelection(knowledgeCentre: KnowledgeCentreData, workspaceId: string): RouteSelection {
  const asset = knowledgeCentre.assets.find((candidate) => candidate.scopes.some((scope) => scope.kind === "workspace" && scope.value === workspaceId));
  return asset ? { assetId: asset.assetId } : {};
}

function companyKnowledgeSelection(knowledgeCentre: KnowledgeCentreData, companyId: string): RouteSelection {
  const asset = knowledgeCentre.assets.find((candidate) => candidate.scopes.some((scope) => scope.kind === "company" && scope.value === companyId));
  return asset ? { assetId: asset.assetId } : {};
}

function projectKnowledgeSelection(knowledgeCentre: KnowledgeCentreData, projectId: string): RouteSelection {
  const asset = knowledgeCentre.assets.find((candidate) => candidate.scopes.some((scope) => scope.kind === "project" && scope.value === projectId));
  return asset ? { assetId: asset.assetId } : {};
}
