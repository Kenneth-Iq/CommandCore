import type { ChangeEvent } from "react";

type FocusOption = {
  value: string;
  label: string;
};

export type ExecutiveFocusState = {
  companyId: string;
  workspaceId: string;
  projectId: string;
  missionId: string;
  agentId: string;
};

type ExecutiveFocusPanelProps = {
  focus: ExecutiveFocusState;
  companyOptions: FocusOption[];
  workspaceOptions: FocusOption[];
  projectOptions: FocusOption[];
  missionOptions: FocusOption[];
  agentOptions: FocusOption[];
  onChange: (focus: ExecutiveFocusState) => void;
};

export function ExecutiveFocusPanel({
  focus,
  companyOptions,
  workspaceOptions,
  projectOptions,
  missionOptions,
  agentOptions,
  onChange,
}: ExecutiveFocusPanelProps) {
  function update(key: keyof ExecutiveFocusState) {
    return (event: ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...focus, [key]: event.target.value });
    };
  }

  const hasActiveFocus = Object.values(focus).some(Boolean);

  return (
    <section className="panel surface executive-focus-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Executive Focus Mode</h3>
          <span>{hasActiveFocus ? "Filtering the operating picture to the selected scope." : "Viewing the full operating picture."}</span>
        </div>
        <button type="button" className="route-chip" onClick={() => onChange(emptyFocusState())}>
          Clear Focus
        </button>
      </div>

      <div className="focus-filter-grid">
        <label className="focus-filter-field">
          <span>Company</span>
          <select value={focus.companyId} onChange={update("companyId")}>
            <option value="">All Companies</option>
            {companyOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="focus-filter-field">
          <span>Workspace</span>
          <select value={focus.workspaceId} onChange={update("workspaceId")}>
            <option value="">All Workspaces</option>
            {workspaceOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="focus-filter-field">
          <span>Project</span>
          <select value={focus.projectId} onChange={update("projectId")}>
            <option value="">All Projects</option>
            {projectOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="focus-filter-field">
          <span>Mission</span>
          <select value={focus.missionId} onChange={update("missionId")}>
            <option value="">All Missions</option>
            {missionOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="focus-filter-field">
          <span>Agent</span>
          <select value={focus.agentId} onChange={update("agentId")}>
            <option value="">All Agents</option>
            {agentOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

export function emptyFocusState(): ExecutiveFocusState {
  return {
    companyId: "",
    workspaceId: "",
    projectId: "",
    missionId: "",
    agentId: "",
  };
}
