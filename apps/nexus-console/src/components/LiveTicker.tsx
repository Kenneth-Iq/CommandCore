import { useRuntimeContext } from "../runtimeContext";

export function LiveTicker() {
  const { simulation } = useRuntimeContext();
  const entries = simulation.timeline.slice(-12);

  if (!entries.length) {
    return null;
  }

  return (
    <div className="live-ticker" role="status" aria-label="Live simulated operational events">
      <div className="live-ticker-track">
        {entries.map((event) => (
          <span key={event.id} className={`live-ticker-item tone-${event.tone}`}>
            {event.label} — {event.detail}
          </span>
        ))}
      </div>
    </div>
  );
}
