import type { NavPage } from "../data/mockKernel";
import type { DecisionItem, DecisionStatus } from "../executiveAssistant";
import type { RouteSelection } from "../routing";
import type { WorldData } from "../worldModel";
import { EvidenceCard } from "./EvidenceCard";
import { StatusBadge } from "./StatusBadge";

type DecisionQueuePanelProps = {
  decisions: DecisionItem[];
  world: WorldData;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
  onInvestigate?: (label: string) => void;
};

const statusLabel: Record<DecisionStatus, string> = {
  waiting: "Waiting Decisions",
  deferred: "Deferred Decisions",
  completed: "Completed Decisions",
  info: "Informational Only",
};

const statusTone: Record<DecisionStatus, "warning" | "idle" | "complete" | "active"> = {
  waiting: "warning",
  deferred: "idle",
  completed: "complete",
  info: "active",
};

export function DecisionQueuePanel({ decisions, world, onNavigate, onInvestigate }: DecisionQueuePanelProps) {
  const statuses: DecisionStatus[] = ["waiting", "deferred", "completed", "info"];

  return (
    <section className="panel surface decision-queue-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Decision Queue</h3>
          <span>Everything Jarvis is tracking on your behalf, simulated for Beta-1.</span>
        </div>
      </div>

      <div className="decision-queue-grid">
        {statuses.map((status) => {
          const items = decisions.filter((decision) => decision.status === status);
          return (
            <div key={status} className="decision-queue-column">
              <div className="decision-queue-column-header">
                <strong>{statusLabel[status]}</strong>
                <StatusBadge tone={statusTone[status]}>{items.length}</StatusBadge>
              </div>
              {items.length ? (
                <div className="decision-queue-list">
                  {items.map((item) => (
                    <article key={item.id} className="decision-queue-item">
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                      <div className="decision-queue-item-footer">
                        <span>{item.occurredAt}</span>
                      </div>
                      {item.evidence ? (
                        <EvidenceCard evidence={item.evidence} world={world} onNavigate={onNavigate} onInvestigate={onInvestigate} />
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="simulation-empty">Nothing here right now.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
