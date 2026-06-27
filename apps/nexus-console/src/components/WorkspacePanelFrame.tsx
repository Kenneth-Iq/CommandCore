import type { ReactNode } from "react";
import type { WorkspacePanelId } from "../operatorPrefs";
import { useWorkspace } from "../workspaceContext";

type WorkspacePanelFrameProps = {
  panelId: WorkspacePanelId;
  title: string;
  children: ReactNode;
};

export function WorkspacePanelFrame({ panelId, title, children }: WorkspacePanelFrameProps) {
  const { isPanelVisible, panelSize, setPanelSize, enterFullscreen, exitFullscreen, fullscreenPanelId } = useWorkspace();

  if (!isPanelVisible(panelId)) {
    return null;
  }

  const isFullscreen = fullscreenPanelId === panelId;
  const size = panelSize(panelId);

  return (
    <div className={`workspace-panel-frame workspace-panel-size-${size} ${isFullscreen ? "is-fullscreen" : ""}`}>
      <div className="workspace-panel-frame-controls">
        <div className="workspace-size-toggle">
          {(["compact", "standard", "expanded"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={size === option ? "workspace-size-button is-active" : "workspace-size-button"}
              aria-label={`Set ${title} to ${option} size`}
              onClick={() => setPanelSize(panelId, option)}
            >
              {option[0].toUpperCase()}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="workspace-fullscreen-toggle"
          aria-label={isFullscreen ? `Exit fullscreen for ${title}` : `Open ${title} fullscreen`}
          onClick={() => (isFullscreen ? exitFullscreen() : enterFullscreen(panelId))}
        >
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>
      </div>
      {children}
    </div>
  );
}
