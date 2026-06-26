import { useMemo, useState } from "react";
import type { DataSource } from "../api/commandcoreApi";
import { EventFeed } from "../components/EventFeed";
import { FilterBar } from "../components/FilterBar";
import { FilterEmptyState } from "../components/FilterEmptyState";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { ImpactAnalysisCard } from "../components/ImpactAnalysisCard";
import { RelationshipCard } from "../components/RelationshipCard";
import { RelationshipExplorer } from "../components/RelationshipExplorer";
import { PortfolioExplorer } from "../components/PortfolioExplorer";
import { RecordDetailPanel } from "../components/RecordDetailPanel";
import { SelectedContextBar } from "../components/SelectedContextBar";
import { SourceStrip } from "../components/SourceStrip";
import type { NavPage, PageData } from "../data/mockKernel";
import type { CompanyRecord, KnowledgeCentreData, PortfolioExplorerData, ProjectRecord, WorkspaceRecord } from "../data/nexusCentres";
import { pinSelected, textMatches, uniqueOptions } from "../filtering";
import type { RouteSelection } from "../routing";
import { buildImpactAnalysis, buildRelationshipCard, type WorldData } from "../worldModel";

type WorkspacesDashboardProps = {
  page: PageData;
  source: DataSource;
  sourceMessage?: string;
  portfolioExplorer: PortfolioExplorerData;
  knowledgeCentre: KnowledgeCentreData;
  world: WorldData;
  selection: RouteSelection;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

type PortfolioFilterState = {
  status: string;
  companyId: string;
  capabilityId: string;
};

const emptyFilters: PortfolioFilterState = {
  status: "",
  companyId: "",
  capabilityId: "",
};

export function WorkspacesDashboard({ page, source, sourceMessage, portfolioExplorer, knowledgeCentre, world, selection, onNavigate }: WorkspacesDashboardProps) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<PortfolioFilterState>(emptyFilters);

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
  const relationshipData = selection.workspaceId
    ? buildRelationshipCard("workspace", selection.workspaceId, world)
    : selection.companyId
      ? buildRelationshipCard("company", selection.companyId, world)
      : selection.projectId
        ? buildRelationshipCard("project", selection.projectId, world)
        : undefined;

  const statusOptions = useMemo(() => uniqueOptions([
    ...portfolioExplorer.workspaces.map((workspace) => workspace.status),
    ...portfolioExplorer.companies.map((company) => company.status),
    ...portfolioExplorer.projects.map((project) => project.status),
  ]), [portfolioExplorer]);
  const companyOptions = useMemo(() => portfolioExplorer.companies.map((company) => ({ value: company.companyId, label: company.name })), [portfolioExplorer.companies]);
  const capabilityOptions = useMemo(() => uniqueOptions(portfolioExplorer.capabilities.map((capability) => capability.capabilityId)), [portfolioExplorer.capabilities]);

  function matchesWorkspace(workspace: WorkspaceRecord): boolean {
    if (!textMatches([workspace.name, workspace.workspaceId], search)) {
      return false;
    }
    if (filters.status && workspace.status !== filters.status) {
      return false;
    }
    if (filters.companyId && !workspace.companyIds.includes(filters.companyId)) {
      return false;
    }
    if (filters.capabilityId && !workspace.capabilityIds.includes(filters.capabilityId)) {
      return false;
    }
    return true;
  }

  function matchesCompany(company: CompanyRecord): boolean {
    if (!textMatches([company.name, company.companyId, company.mission], search)) {
      return false;
    }
    if (filters.status && company.status !== filters.status) {
      return false;
    }
    if (filters.companyId && company.companyId !== filters.companyId) {
      return false;
    }
    if (filters.capabilityId && !company.capabilityIds.includes(filters.capabilityId)) {
      return false;
    }
    return true;
  }

  function matchesProject(project: ProjectRecord): boolean {
    if (!textMatches([project.name, project.projectId, project.mission], search)) {
      return false;
    }
    if (filters.status && project.status !== filters.status) {
      return false;
    }
    if (filters.companyId && project.companyId !== filters.companyId) {
      return false;
    }
    if (filters.capabilityId && !project.capabilityIds.includes(filters.capabilityId)) {
      return false;
    }
    return true;
  }

  const visibleWorkspaces = pinSelected(portfolioExplorer.workspaces.filter(matchesWorkspace), selectedWorkspace, (workspace) => workspace.workspaceId);
  const visibleCompanies = pinSelected(portfolioExplorer.companies.filter(matchesCompany), selectedCompany, (company) => company.companyId);
  const visibleProjects = pinSelected(portfolioExplorer.projects.filter(matchesProject), selectedProject, (project) => project.projectId);

  const totalCount = portfolioExplorer.workspaces.length + portfolioExplorer.companies.length + portfolioExplorer.projects.length;
  const visibleCount = visibleWorkspaces.length + visibleCompanies.length + visibleProjects.length;
  const hasNoFilterMatches = totalCount > 0 && visibleCount === 0;

  const filteredPortfolioExplorer: PortfolioExplorerData = {
    ...portfolioExplorer,
    workspaces: visibleWorkspaces,
    companies: visibleCompanies,
    projects: visibleProjects,
  };

  function clearFilters() {
    setSearch("");
    setFilters(emptyFilters);
  }

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

      {relationshipData ? (
        <>
          <RelationshipCard data={relationshipData} onNavigate={onNavigate} />
          <ImpactAnalysisCard analysis={buildImpactAnalysis(relationshipData)} onNavigate={onNavigate} />
          <RelationshipExplorer
            centerLabel={selectedWorkspace?.name ?? selectedCompany?.name ?? selectedProject?.name ?? "Selected Portfolio Record"}
            data={relationshipData}
            onNavigate={onNavigate}
          />
        </>
      ) : null}

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search workspaces, companies, or projects"
        fields={[
          { id: "status", label: "Status", value: filters.status, options: statusOptions.map((value) => ({ value, label: value })), onChange: (value) => setFilters((prev) => ({ ...prev, status: value })) },
          { id: "companyId", label: "Company", value: filters.companyId, options: companyOptions, onChange: (value) => setFilters((prev) => ({ ...prev, companyId: value })) },
          { id: "capabilityId", label: "Capability", value: filters.capabilityId, options: capabilityOptions.map((value) => ({ value, label: value })), onChange: (value) => setFilters((prev) => ({ ...prev, capabilityId: value })) },
        ]}
        visibleCount={visibleCount}
        totalCount={totalCount}
        onClear={clearFilters}
      />

      {hasNoFilterMatches ? (
        <FilterEmptyState message="No workspaces, companies, or projects match the current filters." onClear={clearFilters} />
      ) : (
        <PortfolioExplorer
          portfolioExplorer={filteredPortfolioExplorer}
          knowledgeCentre={knowledgeCentre}
          selectedWorkspaceId={selection.workspaceId}
          selectedCompanyId={selection.companyId}
          selectedProjectId={selection.projectId}
          onNavigate={onNavigate}
        />
      )}

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
