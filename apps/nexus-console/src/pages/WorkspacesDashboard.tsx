import type { DataSource } from "../api/commandcoreApi";
import { EventFeed } from "../components/EventFeed";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { PortfolioExplorer } from "../components/PortfolioExplorer";
import { RecordDetailPanel } from "../components/RecordDetailPanel";
import { SelectedContextBar } from "../components/SelectedContextBar";
import { SourceStrip } from "../components/SourceStrip";
import type { NavPage, PageData } from "../data/mockKernel";
import type { KnowledgeCentreData, PortfolioExplorerData } from "../data/nexusCentres";
import type { RouteSelection } from "../routing";

type WorkspacesDashboardProps = {
  page: PageData;
  source: DataSource;
  sourceMessage?: string;
  portfolioExplorer: PortfolioExplorerData;
  knowledgeCentre: KnowledgeCentreData;
  selection: RouteSelection;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function WorkspacesDashboard({ page, source, sourceMessage, portfolioExplorer, knowledgeCentre, selection, onNavigate }: WorkspacesDashboardProps) {
  const selectedWorkspace = selection.workspaceId
    ? portfolioExplorer.workspaces.find((workspace) => workspace.workspaceId === selection.workspaceId)
    : undefined;
  const selectedCompany = selection.companyId
    ? portfolioExplorer.companies.find((company) => company.companyId === selection.companyId)
    : undefined;
  const selectedProject = selection.projectId
    ? portfolioExplorer.projects.find((project) => project.projectId === selection.projectId)
    : undefined;
  const hasSelection = Boolean(selection.workspaceId || selection.companyId || selection.projectId);
  const selectionKey = selection.workspaceId ? `workspaceId=${selection.workspaceId}` : selection.companyId ? `companyId=${selection.companyId}` : selection.projectId ? `projectId=${selection.projectId}` : undefined;

  return (
    <div className="page-shell">
      <PageHeader page={page} />
      <SourceStrip source={source} sourceMessage={sourceMessage} status={page.status} />
      <SelectedContextBar label="Selected Portfolio Context" selection={selection} />

      <section className="metrics-grid">
        {page.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      {hasSelection ? selectedWorkspace ? (
        <RecordDetailPanel
          title={selectedWorkspace.name}
          eyebrow={selectedWorkspace.workspaceId}
          statusLabel={selectedWorkspace.status}
          statusTone="active"
          summary={selectedWorkspace.knowledgeBoundarySummary ?? "Workspace detail available."}
          meta={[
            `${selectedWorkspace.assetCount} assets`,
            `${selectedWorkspace.relationshipCount} relationships`,
            `${selectedWorkspace.projectIds.length} projects`,
          ]}
          relatedLinks={[
            { label: "Open Workspace Assets", page: "knowledge" as NavPage, selection: workspaceAsset(knowledgeCentre, selectedWorkspace.workspaceId) },
            { label: "Open Workspace Missions", page: "missions" as NavPage },
          ]}
          onNavigate={onNavigate}
        />
      ) : selectedCompany ? (
        <RecordDetailPanel
          title={selectedCompany.name}
          eyebrow={selectedCompany.companyId}
          statusLabel={selectedCompany.lifecycleState}
          statusTone="ready"
          summary={selectedCompany.mission}
          meta={[
            `${selectedCompany.projectIds.length} projects`,
            `${selectedCompany.capabilityIds.length} capabilities`,
            `${selectedCompany.agentIds.length} agents`,
          ]}
          relatedLinks={[
            { label: "Open Company Assets", page: "knowledge" as NavPage, selection: companyAsset(knowledgeCentre, selectedCompany.companyId) },
            { label: "Open Company Missions", page: "missions" as NavPage },
          ]}
          onNavigate={onNavigate}
        />
      ) : selectedProject ? (
        <RecordDetailPanel
          title={selectedProject.name}
          eyebrow={selectedProject.projectId}
          statusLabel={selectedProject.lifecycleState}
          statusTone="active"
          summary={selectedProject.nextActionSummary ?? selectedProject.mission ?? "Project detail available."}
          meta={[
            `${selectedProject.capabilityIds.length} capabilities`,
            `${selectedProject.agentIds.length} agents`,
            selectedProject.companyId ?? "no company link",
          ]}
          relatedLinks={[
            { label: "Open Project Assets", page: "knowledge" as NavPage, selection: projectAsset(knowledgeCentre, selectedProject.projectId) },
            { label: "Open Project Missions", page: "missions" as NavPage },
          ]}
          onNavigate={onNavigate}
        />
      ) : (
        <div className="empty-state detail-empty-state">
          <strong>Portfolio Record Not Found</strong>
          <p>No portfolio record matched `{selectionKey}` in the current live or seeded data.</p>
        </div>
      ) : null}

      <PortfolioExplorer
        portfolioExplorer={portfolioExplorer}
        knowledgeCentre={knowledgeCentre}
        selectedWorkspaceId={selection.workspaceId}
        selectedCompanyId={selection.companyId}
        selectedProjectId={selection.projectId}
        onNavigate={onNavigate}
      />

      <EventFeed title={page.activityTitle} items={page.activity} emptyMessage={page.emptyState} />
    </div>
  );
}

function workspaceAsset(knowledgeCentre: KnowledgeCentreData, workspaceId: string): RouteSelection {
  const asset = knowledgeCentre.assets.find((candidate) => candidate.scopes.some((scope) => scope.kind === "workspace" && scope.value === workspaceId));
  return asset ? { assetId: asset.assetId } : {};
}

function companyAsset(knowledgeCentre: KnowledgeCentreData, companyId: string): RouteSelection {
  const asset = knowledgeCentre.assets.find((candidate) => candidate.scopes.some((scope) => scope.kind === "company" && scope.value === companyId));
  return asset ? { assetId: asset.assetId } : {};
}

function projectAsset(knowledgeCentre: KnowledgeCentreData, projectId: string): RouteSelection {
  const asset = knowledgeCentre.assets.find((candidate) => candidate.scopes.some((scope) => scope.kind === "project" && scope.value === projectId));
  return asset ? { assetId: asset.assetId } : {};
}
