import { navGroups, type NavPage } from "../data/mockKernel";
import type { RouteSelection } from "../routing";
import { StatusBadge } from "./StatusBadge";

type FavouriteDashboardsPanelProps = {
  favouritePages: Set<NavPage>;
  onToggle: (page: NavPage) => void;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function FavouriteDashboardsPanel({ favouritePages, onToggle, onNavigate }: FavouriteDashboardsPanelProps) {
  const allPages = navGroups.flatMap((group) => group.items);
  const favourites = allPages.filter((page) => favouritePages.has(page.id));

  return (
    <section className="panel surface favourite-dashboards-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Favourite Dashboards</h3>
          <span>{favourites.length ? `${favourites.length} quick-launch dashboards` : "Mark dashboards as favourites for quick access"}</span>
        </div>
      </div>

      {favourites.length ? (
        <div className="route-chip-row favourite-dashboards-launch-row">
          {favourites.map((page) => (
            <button key={page.id} type="button" className="route-chip" onClick={() => onNavigate(page.id)}>
              {page.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state compact-empty">
          <strong>No Favourites Yet</strong>
          <p>Star a dashboard below to pin it for quick launch.</p>
        </div>
      )}

      <div className="favourite-dashboards-grid">
        {allPages.map((page) => (
          <button
            key={page.id}
            type="button"
            className={`favourite-dashboard-toggle ${favouritePages.has(page.id) ? "is-active" : ""}`}
            onClick={() => onToggle(page.id)}
          >
            <StatusBadge tone={favouritePages.has(page.id) ? "ready" : "idle"}>{favouritePages.has(page.id) ? "★" : "☆"}</StatusBadge>
            <span>{page.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
