import type { ApprovalCard, ApprovalStatus } from "../executiveAssistant";
import type { NavPage } from "../data/mockKernel";
import type { RouteSelection } from "../routing";
import type { WorldData } from "../worldModel";
import { EvidenceCard } from "./EvidenceCard";
import { StatusBadge } from "./StatusBadge";

type ApprovalCardsPanelProps = {
  approvals: ApprovalCard[];
  world: WorldData;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
  onInvestigate?: (label: string) => void;
};

const statusLabel: Record<ApprovalStatus, string> = {
  awaiting: "Awaiting Approval",
  approved: "Approved",
  deferred: "Deferred",
  rejected: "Rejected",
};

const statusTone: Record<ApprovalStatus, "warning" | "complete" | "idle" | "blocked"> = {
  awaiting: "warning",
  approved: "complete",
  deferred: "idle",
  rejected: "blocked",
};

export function ApprovalCardsPanel({ approvals, world, onNavigate, onInvestigate }: ApprovalCardsPanelProps) {
  const statuses: ApprovalStatus[] = ["awaiting", "approved", "deferred", "rejected"];

  return (
    <section className="panel surface approval-cards-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Approval Cards</h3>
          <span>Simulated approval rehearsal — no commands have been issued. Write operations remain disabled.</span>
        </div>
      </div>

      <div className="approval-cards-grid">
        {statuses.map((status) => {
          const items = approvals.filter((approval) => approval.status === status);
          return (
            <div key={status} className="approval-cards-column">
              <div className="approval-cards-column-header">
                <strong>{statusLabel[status]}</strong>
                <StatusBadge tone={statusTone[status]}>{items.length}</StatusBadge>
              </div>
              {items.length ? (
                <div className="approval-cards-list">
                  {items.map((item) => (
                    <article key={item.id} className="approval-card-item">
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                      <span className="approval-card-meta">{item.requestedAt}</span>
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
