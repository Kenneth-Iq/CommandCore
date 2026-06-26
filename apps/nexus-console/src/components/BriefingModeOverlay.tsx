import type { Briefing } from "../executiveAssistant";

type BriefingModeOverlayProps = {
  briefing: Briefing;
  greeting: string;
  onClose: () => void;
};

export function BriefingModeOverlay({ briefing, greeting, onClose }: BriefingModeOverlayProps) {
  return (
    <div className="briefing-mode-overlay" role="dialog" aria-modal="true" aria-label="Briefing mode">
      <div className="briefing-mode-card">
        <p className="briefing-mode-greeting">{greeting}</p>
        <h2>{briefing.title}</h2>
        <p className="briefing-mode-summary">{briefing.summary}</p>
        <ul className="briefing-mode-highlight-list">
          {briefing.highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
        <button type="button" className="route-chip briefing-mode-exit" onClick={onClose}>
          Exit Briefing Mode
        </button>
      </div>
    </div>
  );
}
