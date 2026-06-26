import { useRuntimeContext } from "../runtimeContext";

export function OperationalPulse() {
  const { simulation } = useRuntimeContext();

  return (
    <div className="operational-pulse" title={`Simulated operational tick ${simulation.tick} — health score ${simulation.healthScore}/100`}>
      <span className="operational-pulse-dot" />
      <span className="operational-pulse-label">Live Simulation · Tick {simulation.tick} · Health {simulation.healthScore}</span>
    </div>
  );
}
