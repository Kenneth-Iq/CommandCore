import { useMemo, useState } from "react";
import type { DataSource } from "../api/commandcoreApi";
import { EventFeed } from "../components/EventFeed";
import { FilterBar } from "../components/FilterBar";
import { FilterEmptyState } from "../components/FilterEmptyState";
import { KnowledgeCentre } from "../components/KnowledgeCentre";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { ImpactAnalysisCard } from "../components/ImpactAnalysisCard";
import { RelationshipCard } from "../components/RelationshipCard";
import { RelationshipExplorer } from "../components/RelationshipExplorer";
import { RecordDetailPanel } from "../components/RecordDetailPanel";
import { SelectedContextBar } from "../components/SelectedContextBar";
import { SourceStrip } from "../components/SourceStrip";
import type { NavPage, PageData } from "../data/mockKernel";
import type { KnowledgeAssetRecord, KnowledgeCentreData } from "../data/nexusCentres";
import { pinSelected, textMatches, uniqueOptions } from "../filtering";
import type { RouteSelection } from "../routing";
import { buildImpactAnalysis, buildRelationshipCard, type WorldData } from "../worldModel";

type KnowledgeDashboardProps = {
  page: PageData;
  source: DataSource;
  sourceMessage?: string;
  knowledgeCentre: KnowledgeCentreData;
  world: WorldData;
  selection: RouteSelection;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

type KnowledgeFilterState = {
  status: string;
  workspaceId: string;
  companyId: string;
  projectId: string;
  missionId: string;
};

const emptyFilters: KnowledgeFilterState = {
  status: "",
  workspaceId: "",
  companyId: "",
  projectId: "",
  missionId: "",
};

export function KnowledgeDashboard({ page, source, sourceMessage, knowledgeCentre, world, selection, onNavigate }: KnowledgeDashboardProps) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<KnowledgeFilterState>(emptyFilters);

  const selectedAsset = selection.assetId
    ? knowledgeCentre.assets.find((asset) => asset.assetId === selection.assetId)
    : undefined;
  const relationshipData = selection.assetId ? buildRelationshipCard("knowledge", selection.assetId, world) : undefined;

  const scopesOf = (kind: string) => uniqueOptions(
    knowledgeCentre.assets.flatMap((asset) => asset.scopes.filter((scope) => scope.kind === kind).map((scope) => scope.value)),
  );
  const workspaceOptions = useMemo(() => scopesOf("workspace"), [knowledgeCentre.assets]);
  const companyOptions = useMemo(() => scopesOf("company"), [knowledgeCentre.assets]);
  const projectOptions = useMemo(() => scopesOf("project"), [knowledgeCentre.assets]);
  const missionOptions = useMemo(() => scopesOf("mission"), [knowledgeCentre.assets]);

  function matchesFilters(asset: KnowledgeAssetRecord): boolean {
    if (!textMatches([asset.title, asset.summary, ...asset.tags], search)) {
      return false;
    }
    if (filters.status) {
      const isSafe = filters.status === "safe";
      if (asset.safeToQuery !== isSafe) {
        return false;
      }
    }
    if (filters.workspaceId && !asset.scopes.some((scope) => scope.kind === "workspace" && scope.value === filters.workspaceId)) {
      return false;
    }
    if (filters.companyId && !asset.scopes.some((scope) => scope.kind === "company" && scope.value === filters.companyId)) {
      return false;
    }
    if (filters.projectId && !asset.scopes.some((scope) => scope.kind === "project" && scope.value === filters.projectId)) {
      return false;
    }
    if (filters.missionId && !asset.scopes.some((scope) => scope.kind === "mission" && scope.value === filters.missionId)) {
      return false;
    }
    return true;
  }

  const visibleAssets = pinSelected(knowledgeCentre.assets.filter(matchesFilters), selectedAsset, (asset) => asset.assetId);
  const hasNoFilterMatches = knowledgeCentre.assets.length > 0 && visibleAssets.length === 0;
  const filteredKnowledgeCentre: KnowledgeCentreData = { assets: visibleAssets };

  function clearFilters() {
    setSearch("");
    setFilters(emptyFilters);
  }

  return (
    <div className="page-shell">
      <PageHeader page={page} />
      <SourceStrip source={source} sourceMessage={sourceMessage} status={page.status} />
      <SelectedContextBar label="Selected Knowledge Context" selection={selection} />

      <section className="metrics-grid">
        {page.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      {selection.assetId ? selectedAsset ? (
        <RecordDetailPanel
          title={selectedAsset.title}
          eyebrow={selectedAsset.assetId}
          statusLabel={selectedAsset.safeToQuery ? "query safe" : "restricted"}
          statusTone={selectedAsset.safeToQuery ? "ready" : "warning"}
          summary={selectedAsset.summary}
          meta={[
            selectedAsset.assetType,
            `${selectedAsset.relationshipCount} linked assets`,
            `${selectedAsset.tags.length} tags`,
          ]}
          relatedLinks={selectedAsset.scopes.map((scope) => {
            if (scope.kind === "mission") {
              return { label: "Open Related Mission", page: "missions" as NavPage, selection: { missionId: scope.value } };
            }
            if (scope.kind === "workspace") {
              return { label: "Open Related Workspace", page: "workspaces" as NavPage, selection: { workspaceId: scope.value } };
            }
            if (scope.kind === "company") {
              return { label: "Open Related Company", page: "workspaces" as NavPage, selection: { companyId: scope.value } };
            }
            return { label: "Open Related Project", page: "workspaces" as NavPage, selection: { projectId: scope.value } };
          })}
          onNavigate={onNavigate}
        />
      ) : (
        <div className="empty-state detail-empty-state">
          <strong>Knowledge Asset Not Found</strong>
          <p>No knowledge asset matched `assetId={selection.assetId}` in the current live or seeded data.</p>
        </div>
      ) : null}

      {relationshipData ? (
        <>
          <RelationshipCard data={relationshipData} onNavigate={onNavigate} />
          <ImpactAnalysisCard analysis={buildImpactAnalysis(relationshipData)} onNavigate={onNavigate} />
          <RelationshipExplorer centerLabel={selectedAsset?.title ?? "Selected Knowledge Asset"} data={relationshipData} onNavigate={onNavigate} />
        </>
      ) : null}

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search knowledge by title, summary, or tag"
        fields={[
          { id: "status", label: "Status", value: filters.status, options: [{ value: "safe", label: "Query Safe" }, { value: "restricted", label: "Restricted" }], onChange: (value) => setFilters((prev) => ({ ...prev, status: value })) },
          { id: "workspaceId", label: "Workspace", value: filters.workspaceId, options: workspaceOptions.map((value) => ({ value, label: value })), onChange: (value) => setFilters((prev) => ({ ...prev, workspaceId: value })) },
          { id: "companyId", label: "Company", value: filters.companyId, options: companyOptions.map((value) => ({ value, label: value })), onChange: (value) => setFilters((prev) => ({ ...prev, companyId: value })) },
          { id: "projectId", label: "Project", value: filters.projectId, options: projectOptions.map((value) => ({ value, label: value })), onChange: (value) => setFilters((prev) => ({ ...prev, projectId: value })) },
          { id: "missionId", label: "Mission", value: filters.missionId, options: missionOptions.map((value) => ({ value, label: value })), onChange: (value) => setFilters((prev) => ({ ...prev, missionId: value })) },
        ]}
        visibleCount={visibleAssets.length}
        totalCount={knowledgeCentre.assets.length}
        onClear={clearFilters}
      />

      {hasNoFilterMatches ? (
        <FilterEmptyState message="No knowledge assets match the current filters." onClear={clearFilters} />
      ) : (
        <KnowledgeCentre knowledgeCentre={filteredKnowledgeCentre} selectedAssetId={selection.assetId} onNavigate={onNavigate} />
      )}

      <EventFeed title={page.activityTitle} items={page.activity} emptyMessage={page.emptyState} />
    </div>
  );
}
