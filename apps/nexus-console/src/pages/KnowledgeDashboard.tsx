import type { DataSource } from "../api/commandcoreApi";
import { EventFeed } from "../components/EventFeed";
import { KnowledgeCentre } from "../components/KnowledgeCentre";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { RecordDetailPanel } from "../components/RecordDetailPanel";
import { SelectedContextBar } from "../components/SelectedContextBar";
import { SourceStrip } from "../components/SourceStrip";
import type { NavPage, PageData } from "../data/mockKernel";
import type { KnowledgeCentreData } from "../data/nexusCentres";
import type { RouteSelection } from "../routing";

type KnowledgeDashboardProps = {
  page: PageData;
  source: DataSource;
  sourceMessage?: string;
  knowledgeCentre: KnowledgeCentreData;
  selection: RouteSelection;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function KnowledgeDashboard({ page, source, sourceMessage, knowledgeCentre, selection, onNavigate }: KnowledgeDashboardProps) {
  const selectedAsset = selection.assetId
    ? knowledgeCentre.assets.find((asset) => asset.assetId === selection.assetId)
    : undefined;

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

      <KnowledgeCentre knowledgeCentre={knowledgeCentre} selectedAssetId={selection.assetId} onNavigate={onNavigate} />

      <EventFeed title={page.activityTitle} items={page.activity} emptyMessage={page.emptyState} />
    </div>
  );
}
