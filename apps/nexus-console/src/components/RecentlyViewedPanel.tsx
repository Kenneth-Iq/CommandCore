import type { NavPage } from "../data/mockKernel";
import type { RouteSelection } from "../routing";
import type { RecentlyViewedEntry } from "../operatorPrefs";

type RecentlyViewedPanelProps = {
  items: RecentlyViewedEntry[];
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function RecentlyViewedPanel({ items, onNavigate }: RecentlyViewedPanelProps) {
  return (
    <section className="panel surface recently-viewed-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Recently Viewed</h3>
          <span>{items.length ? `${items.length} recently opened records` : "No records viewed yet this session"}</span>
        </div>
      </div>

      {items.length ? (
        <div className="route-chip-row">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="route-chip"
              onClick={() => onNavigate(item.page, item.selection)}
              title={new Date(item.viewedAt).toLocaleString()}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state compact-empty">
          <strong>Nothing Viewed Yet</strong>
          <p>Selected records will appear here as you navigate the console.</p>
        </div>
      )}
    </section>
  );
}
