import { useState } from "react";
import type { NavPage } from "../data/mockKernel";
import type { BriefingType, ExtendedBriefing } from "../executiveAssistant";
import type { RouteSelection } from "../routing";

type BriefingTypeExplorerProps = {
  briefings: ExtendedBriefing[];
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

const TYPE_LABEL: Record<BriefingType, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  weekly: "Weekly",
  monthly: "Monthly",
  mission: "Mission",
  project: "Project",
  workspace: "Workspace",
  company: "Company",
  planet: "Planet",
  emergency: "Emergency",
  infrastructure: "Infrastructure",
};

export function BriefingTypeExplorer({ briefings, onNavigate }: BriefingTypeExplorerProps) {
  const [activeType, setActiveType] = useState<BriefingType>(briefings[0]?.type ?? "morning");
  const active = briefings.find((briefing) => briefing.type === activeType) ?? briefings[0];

  return (
    <section className="panel surface briefing-type-explorer-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Briefing Types</h3>
          <span>Every briefing format Jarvis can compose from current simulated operational state.</span>
        </div>
      </div>

      <div className="briefing-type-tabs">
        {briefings.map((briefing) => (
          <button
            key={briefing.type}
            type="button"
            className={briefing.type === activeType ? "briefing-type-tab is-active" : "briefing-type-tab"}
            onClick={() => setActiveType(briefing.type)}
          >
            {TYPE_LABEL[briefing.type]}
          </button>
        ))}
      </div>

      {active ? (
        <article className="briefing-type-detail">
          <strong>{active.title}</strong>
          <p>{active.summary}</p>
          <ul className="briefing-type-highlights">
            {active.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
          {active.evidence ? (
            <button type="button" className="route-chip" onClick={() => onNavigate(active.evidence!.page, active.evidence!.selection)}>
              {active.evidence.label}
            </button>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
