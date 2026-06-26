import type { NavPage } from "../data/mockKernel";
import type { KnowledgeCentreData } from "../data/nexusCentres";
import { ScopeBadge } from "./ScopeBadge";
import { StatusBadge } from "./StatusBadge";

const routeLinks: Array<{ label: string; page: NavPage }> = [
  { label: "Missions", page: "missions" },
  { label: "Agents", page: "agents" },
  { label: "Tools", page: "tools" },
  { label: "Conversations", page: "conversations" },
];

type KnowledgeCentreProps = {
  knowledgeCentre: KnowledgeCentreData;
  onNavigate: (page: NavPage) => void;
};

export function KnowledgeCentre({ knowledgeCentre, onNavigate }: KnowledgeCentreProps) {
  const assets = knowledgeCentre.assets;
  const focusAsset = assets[0];

  return (
    <section className="knowledge-centre-grid">
      <article className="surface panel knowledge-summary-panel">
        <div className="panel-header panel-title-stack">
          <h3>Asset Summary</h3>
          <span>Search stays local for now. Live indexing remains read-only.</span>
        </div>
        <div className="knowledge-search-placeholder">
          <div>
            <strong>Search Placeholder</strong>
            <p>Knowledge search UI is staged for local routing only in this wave.</p>
          </div>
          <span>Ctrl K routes pages</span>
        </div>
        {assets.length ? (
          <div className="knowledge-summary-cards">
            {assets.slice(0, 3).map((asset) => (
              <article key={asset.assetId} className="knowledge-summary-card">
                <div className="knowledge-card-header">
                  <strong>{asset.title}</strong>
                  <StatusBadge tone={asset.safeToQuery ? "ready" : "warning"}>
                    {asset.safeToQuery ? "Query Safe" : "Restricted"}
                  </StatusBadge>
                </div>
                <p>{asset.summary}</p>
                <div className="knowledge-card-meta">
                  <span>{asset.assetType}</span>
                  <span>{asset.relationshipCount} links</span>
                </div>
                <div className="scope-badge-row">
                  {asset.scopes.map((scope) => (
                    <ScopeBadge key={`${asset.assetId}-${scope.kind}-${scope.value}`} scope={scope} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No Knowledge Assets Yet</strong>
            <p>Knowledge assets will appear here when the dashboard exposes stored records.</p>
          </div>
        )}
      </article>

      <article className="surface panel knowledge-assets-panel">
        <div className="panel-header panel-title-stack">
          <h3>Knowledge Asset List</h3>
          <span>Readable memory objects with scope and relationship coverage.</span>
        </div>
        {assets.length ? (
          <div className="knowledge-asset-list">
            {assets.map((asset) => (
              <article key={asset.assetId} className="knowledge-asset-row">
                <div>
                  <div className="knowledge-card-header">
                    <strong>{asset.title}</strong>
                    <span className="knowledge-asset-id">{asset.assetId}</span>
                  </div>
                  <p>{asset.summary}</p>
                  <div className="scope-badge-row">
                    {asset.scopes.map((scope) => (
                      <ScopeBadge key={`${asset.assetId}-${scope.kind}-${scope.value}`} scope={scope} />
                    ))}
                  </div>
                </div>
                <div className="knowledge-row-meta">
                  <StatusBadge tone={asset.relationshipCount ? "complete" : "idle"}>
                    {asset.relationshipCount} Linked
                  </StatusBadge>
                  <span>{asset.assetType}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No Assets Visible</strong>
            <p>The current source has not published individual knowledge assets yet.</p>
          </div>
        )}
      </article>

      <article className="surface panel knowledge-linked-panel">
        <div className="panel-header panel-title-stack">
          <h3>Linked Knowledge Panel</h3>
          <span>Cross-links and route handoffs from the current focus asset.</span>
        </div>
        {focusAsset ? (
          <div className="knowledge-linked-body">
            <div className="knowledge-focus-card">
              <div className="knowledge-card-header">
                <strong>{focusAsset.title}</strong>
                <StatusBadge tone={focusAsset.safeToQuery ? "ready" : "warning"}>
                  {focusAsset.safeToQuery ? "Indexed" : "Guarded"}
                </StatusBadge>
              </div>
              <p>{focusAsset.summary}</p>
              <div className="scope-badge-row">
                {focusAsset.scopes.map((scope) => (
                  <ScopeBadge key={`${focusAsset.assetId}-${scope.kind}-${scope.value}`} scope={scope} />
                ))}
              </div>
            </div>
            <div className="linked-asset-list">
              {focusAsset.linkedAssetIds.length ? focusAsset.linkedAssetIds.map((assetId) => (
                <div key={assetId} className="linked-asset-chip">{assetId}</div>
              )) : (
                <div className="empty-state compact-empty">
                  <strong>No Linked Assets</strong>
                  <p>Cross-links will appear here as relationship density grows.</p>
                </div>
              )}
            </div>
            <div className="route-chip-row">
              {routeLinks.map((link) => (
                <button key={link.page} type="button" className="route-chip" onClick={() => onNavigate(link.page)}>
                  Open {link.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <strong>No Linked Knowledge Selected</strong>
            <p>As soon as knowledge assets arrive, this panel will surface relationships and route links.</p>
          </div>
        )}
      </article>
    </section>
  );
}
