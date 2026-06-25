import type { TableRow } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type InfoPanelProps = {
  title: string;
  rows: TableRow[];
};

export function InfoPanel({ title, rows }: InfoPanelProps) {
  return (
    <section className="panel surface">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>{title}</h3>
        </div>
      </div>
      <div className="panel-rows">
        {rows.map((row) => (
          <div key={`${row.title}-${row.subtitle ?? ""}`} className="data-row">
            <div>
              <strong>{row.title}</strong>
              {row.subtitle ? <p>{row.subtitle}</p> : null}
            </div>
            <div className="row-meta">
              {row.badge && row.badgeTone ? (
                <StatusBadge tone={row.badgeTone}>{row.badge}</StatusBadge>
              ) : null}
              {row.meta ? <span>{row.meta}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
