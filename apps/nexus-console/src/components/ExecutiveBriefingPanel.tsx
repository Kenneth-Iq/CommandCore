import type { Briefing, BriefingPeriod } from "../executiveAssistant";
import { StatusBadge } from "./StatusBadge";

type ExecutiveBriefingPanelProps = {
  greeting: string;
  activePeriod: BriefingPeriod;
  briefings: Briefing[];
};

const periodLabel: Record<BriefingPeriod, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export function ExecutiveBriefingPanel({ greeting, activePeriod, briefings }: ExecutiveBriefingPanelProps) {
  return (
    <section className="panel surface executive-briefing-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>{greeting} Here's your executive briefing.</h3>
          <span>Morning, afternoon, and evening briefings update automatically through the day.</span>
        </div>
      </div>

      <div className="briefing-period-grid">
        {briefings.map((briefing) => (
          <article
            key={briefing.period}
            className={`briefing-period-card ${briefing.period === activePeriod ? "is-active-period" : ""}`}
          >
            <div className="briefing-period-header">
              <strong>{briefing.title}</strong>
              {briefing.period === activePeriod ? <StatusBadge tone="active">{periodLabel[briefing.period]} / Now</StatusBadge> : <StatusBadge tone="idle">{periodLabel[briefing.period]}</StatusBadge>}
            </div>
            <p>{briefing.summary}</p>
            <ul className="briefing-highlight-list">
              {briefing.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
