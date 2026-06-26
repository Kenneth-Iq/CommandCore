import { EventFeed } from "../components/EventFeed";
import { AgentWall } from "../components/AgentWall";
import { BoardroomWidget } from "../components/BoardroomWidget";
import { FavouriteDashboardsPanel } from "../components/FavouriteDashboardsPanel";
import { HealthWall } from "../components/HealthWall";
import { MetricCard } from "../components/MetricCard";
import { MissionWall } from "../components/MissionWall";
import { PageHeader } from "../components/PageHeader";
import { SourceStrip } from "../components/SourceStrip";
import { StatusWall } from "../components/StatusWall";
import { WatchlistPanel } from "../components/WatchlistPanel";
import type { DataSource } from "../api/commandcoreApi";
import type { NavPage, PageData } from "../data/mockKernel";
import { useBoardroomLayout, useFavouriteDashboards, useWatchlist, type BoardroomWidgetId } from "../operatorPrefs";
import type { RouteSelection } from "../routing";
import { useExecutiveSimulation } from "../simulation";
import type { WorldData } from "../worldModel";

type ExecutiveBoardroomProps = {
  page: PageData;
  pages: Record<NavPage, PageData>;
  world: WorldData;
  source: DataSource;
  sourceMessage?: string;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

const widgetTitles: Record<BoardroomWidgetId, string> = {
  status: "Status Wall",
  mission: "Mission Wall",
  agent: "Agent Wall",
  health: "Health Wall",
};

const widgetSubtitles: Record<BoardroomWidgetId, string> = {
  status: "Portfolio-wide entity counts and platform status.",
  mission: "Mission throughput and the missions closest to needing attention.",
  agent: "Agent availability and current simulated activity.",
  health: "Health, readiness, and the live simulated operational score.",
};

export function ExecutiveBoardroom({ page, pages, world, source, sourceMessage, onNavigate }: ExecutiveBoardroomProps) {
  const simulation = useExecutiveSimulation(world);
  const { layout, setSize, toggleVisible, move, reset } = useBoardroomLayout();
  const { entries: watchlistEntries, remove: removeFromWatchlist } = useWatchlist();
  const { favouritePages, toggle: toggleFavouritePage } = useFavouriteDashboards();

  const visibleLayout = layout.filter((widget) => widget.visible);
  const hiddenLayout = layout.filter((widget) => !widget.visible);

  function renderWidgetContent(id: BoardroomWidgetId) {
    if (id === "status") {
      return <StatusWall world={world} healthStatus={pages.health.status} readinessStatus={pages.kernel.status} />;
    }
    if (id === "mission") {
      return <MissionWall world={world} onNavigate={onNavigate} />;
    }
    if (id === "agent") {
      return <AgentWall world={world} simulation={simulation} onNavigate={onNavigate} />;
    }
    return <HealthWall healthStatus={pages.health.status} readinessStatus={pages.kernel.status} simulation={simulation} />;
  }

  return (
    <div className="page-shell">
      <PageHeader page={page} />
      <SourceStrip source={source} sourceMessage={sourceMessage} status={page.status} label="Boardroom Link" />

      <section className="metrics-grid">
        {page.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <FavouriteDashboardsPanel favouritePages={favouritePages} onToggle={toggleFavouritePage} onNavigate={onNavigate} />

      <WatchlistPanel entries={watchlistEntries} onRemove={removeFromWatchlist} onNavigate={onNavigate} />

      <div className="boardroom-layout-controls">
        <span>{hiddenLayout.length ? `${hiddenLayout.length} wall(s) hidden` : "All walls visible"}</span>
        <div className="route-chip-row">
          {hiddenLayout.map((widget) => (
            <button key={widget.id} type="button" className="route-chip" onClick={() => toggleVisible(widget.id)}>
              Show {widgetTitles[widget.id]}
            </button>
          ))}
          <button type="button" className="route-chip" onClick={reset}>
            Reset Layout
          </button>
        </div>
      </div>

      <div className="boardroom-wall-grid">
        {visibleLayout.map((widget, index) => (
          <BoardroomWidget
            key={widget.id}
            title={widgetTitles[widget.id]}
            subtitle={widgetSubtitles[widget.id]}
            size={widget.size}
            onSetSize={(size) => setSize(widget.id, size)}
            onMoveUp={() => move(widget.id, "up")}
            onMoveDown={() => move(widget.id, "down")}
            onHide={() => toggleVisible(widget.id)}
            canMoveUp={index > 0}
            canMoveDown={index < visibleLayout.length - 1}
          >
            {renderWidgetContent(widget.id)}
          </BoardroomWidget>
        ))}
      </div>

      <EventFeed title={page.activityTitle} items={page.activity} emptyMessage={page.emptyState} />
    </div>
  );
}
