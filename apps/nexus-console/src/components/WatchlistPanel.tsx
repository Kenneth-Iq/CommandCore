import type { NavPage } from "../data/mockKernel";
import type { WatchlistEntry } from "../operatorPrefs";
import type { RouteSelection } from "../routing";

type WatchlistPanelProps = {
  entries: WatchlistEntry[];
  onRemove: (id: string) => void;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function WatchlistPanel({ entries, onRemove, onNavigate }: WatchlistPanelProps) {
  return (
    <section className="panel surface watchlist-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Watchlist</h3>
          <span>{entries.length ? `${entries.length} pinned record${entries.length === 1 ? "" : "s"}` : "Nothing pinned yet"}</span>
        </div>
      </div>

      {entries.length ? (
        <div className="panel-rows">
          {entries.map((entry) => (
            <div key={entry.id} className="data-row">
              <div>
                <strong>{entry.label}</strong>
                <p>Pinned {new Date(entry.addedAt).toLocaleString()}</p>
              </div>
              <div className="row-meta">
                <button type="button" className="route-chip" onClick={() => onNavigate(entry.page, entry.selection)}>
                  Open
                </button>
                <button type="button" className="route-chip" onClick={() => onRemove(entry.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Watched Records</strong>
          <p>Pin a mission, agent, tool, conversation, or knowledge asset from its detail view to track it here.</p>
        </div>
      )}
    </section>
  );
}
