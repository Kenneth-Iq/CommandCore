import type { PageData } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type ExecutiveCommandCentreProps = {
  page: PageData;
};

export function ExecutiveCommandCentre({ page }: ExecutiveCommandCentreProps) {
  const keyMetrics = page.metrics.slice(0, 4);
  const commandRows = [...page.primaryPanel.rows, ...page.secondaryPanel.rows].slice(0, 5);

  return (
    <section className="panel surface command-centre-panel">
      <div className="panel-header">
        <h3>Executive Command Centre</h3>
      </div>
      <div className="command-centre-band">
        {keyMetrics.map((metric) => (
          <article key={metric.label} className="command-centre-metric">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            {metric.hint ? <p>{metric.hint}</p> : null}
          </article>
        ))}
      </div>
      <div className="command-centre-rows">
        {commandRows.map((row) => (
          <article key={`${row.title}-${row.subtitle ?? ""}`} className="command-centre-row">
            <div>
              <strong>{row.title}</strong>
              <p>{row.subtitle ?? row.meta ?? "Governance signal visible."}</p>
            </div>
            {row.badge ? (
              <StatusBadge tone={row.badgeTone ?? "idle"}>{row.badge}</StatusBadge>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
