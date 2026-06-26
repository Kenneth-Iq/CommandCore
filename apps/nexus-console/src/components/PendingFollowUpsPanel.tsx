import { useState } from "react";
import type { NavPage } from "../data/mockKernel";
import type { FollowUpItem, FollowUpKind } from "../executiveAssistant";
import type { RouteSelection } from "../routing";
import type { WorldData } from "../worldModel";
import { EvidenceCard } from "./EvidenceCard";
import { StatusBadge } from "./StatusBadge";

type PendingFollowUpsPanelProps = {
  followUps: FollowUpItem[];
  world: WorldData;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
  onInvestigate?: (label: string) => void;
};

const kindLabel: Record<FollowUpKind, string> = {
  question: "Things Promised",
  waiting: "Things Waiting",
  postponed: "Things Postponed",
  review: "Requiring Review",
};

const kindTone: Record<FollowUpKind, "active" | "warning" | "idle" | "blocked"> = {
  question: "active",
  waiting: "warning",
  postponed: "idle",
  review: "blocked",
};

export function PendingFollowUpsPanel({ followUps, world, onNavigate, onInvestigate }: PendingFollowUpsPanelProps) {
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  function toggleResolved(id: string) {
    setResolvedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <section className="panel surface pending-followups-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Pending Follow Ups</h3>
          <span>{followUps.length ? `${followUps.length} open threads with you` : "Nothing pending right now"}</span>
        </div>
      </div>

      {followUps.length ? (
        <div className="panel-rows">
          {followUps.map((item) => {
            const resolved = resolvedIds.has(item.id);
            return (
              <div key={item.id} className={resolved ? "data-row data-row-resolved" : "data-row"}>
                <div>
                  <strong>{kindLabel[item.kind]}</strong>
                  <p>{item.text}</p>
                  {item.evidence ? (
                    <EvidenceCard evidence={item.evidence} world={world} onNavigate={onNavigate} onInvestigate={onInvestigate} />
                  ) : null}
                </div>
                <div className="row-meta">
                  <StatusBadge tone={kindTone[item.kind]}>{item.kind}</StatusBadge>
                  <button type="button" className="followup-resolve-toggle" onClick={() => toggleResolved(item.id)}>
                    {resolved ? "Reopen" : "Mark Resolved"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <strong>All Caught Up</strong>
          <p>No outstanding questions, waits, postponements, or review items right now.</p>
        </div>
      )}
    </section>
  );
}
