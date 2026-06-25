import type { MissionRecord, StatusTone } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type MissionOutcomesPanelProps = {
  completed: MissionRecord[];
  failed: MissionRecord[];
};

type OutcomeRow = {
  mission: MissionRecord;
  detail: string;
  tone: StatusTone;
  label: string;
};

export function MissionOutcomesPanel({ completed, failed }: MissionOutcomesPanelProps) {
  const outcomes: OutcomeRow[] = [
    ...completed
      .filter((mission) => mission.resultSummary)
      .map((mission) => ({
        mission,
        detail: mission.resultSummary as string,
        tone: "complete" as StatusTone,
        label: "Result",
      })),
    ...failed
      .filter((mission) => mission.failureReason)
      .map((mission) => ({
        mission,
        detail: mission.failureReason as string,
        tone: "warning" as StatusTone,
        label: "Failure",
      })),
  ];

  return (
    <section className="panel surface mission-outcomes-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Mission Outcomes</h3>
          <span>{outcomes.length ? `${outcomes.length} recorded outcomes` : "No outcomes recorded yet"}</span>
        </div>
      </div>

      {outcomes.length ? (
        <div className="mission-outcome-list">
          {outcomes.map(({ mission, detail, tone, label }) => (
            <article key={mission.missionId} className="mission-outcome-item">
              <div className="mission-outcome-header">
                <strong>{mission.title}</strong>
                <StatusBadge tone={tone}>{label}</StatusBadge>
              </div>
              <p>{detail}</p>
              <span className="event-source">{mission.missionId}</span>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Outcomes Yet</strong>
          <p>Result summaries and failure reasons will appear here once missions reach a terminal state.</p>
        </div>
      )}
    </section>
  );
}
