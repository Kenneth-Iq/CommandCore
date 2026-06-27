import { useMemo } from "react";
import { EventFeed } from "../components/EventFeed";
import { HermesQueueBoard } from "../components/HermesQueueBoard";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { SourceStrip } from "../components/SourceStrip";
import type { DataSource } from "../api/commandcoreApi";
import type { NavPage, PageData } from "../data/mockKernel";
import { buildHermesActionPreviews, buildHermesQueues } from "../hermesBridge";
import type { RouteSelection } from "../routing";
import { useRuntimeContext } from "../runtimeContext";
import type { WorldData } from "../worldModel";

type HermesPreviewProps = {
  page: PageData;
  world: WorldData;
  source: DataSource;
  sourceMessage?: string;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function HermesPreview({ page, world, source, sourceMessage, onNavigate }: HermesPreviewProps) {
  const { simulation, approvalCards } = useRuntimeContext();
  const hermesActions = useMemo(() => buildHermesActionPreviews(world, simulation), [world, simulation]);
  const queues = useMemo(() => buildHermesQueues(world, hermesActions, approvalCards), [world, hermesActions, approvalCards]);

  return (
    <div className="page-shell">
      <PageHeader page={page} />
      <SourceStrip source={source} sourceMessage={sourceMessage} status={page.status} label="Hermes Preview Link" />

      <section className="metrics-grid">
        {page.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <HermesQueueBoard queues={queues} onNavigate={onNavigate} />

      <EventFeed title={page.activityTitle} items={page.activity} emptyMessage={page.emptyState} />
    </div>
  );
}
