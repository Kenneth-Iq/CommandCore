import type { ReactNode } from "react";
import type { WidgetSize } from "../operatorPrefs";

type BoardroomWidgetProps = {
  title: string;
  subtitle?: string;
  size: WidgetSize;
  onSetSize: (size: WidgetSize) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onHide: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  children: ReactNode;
};

const sizeOptions: WidgetSize[] = ["compact", "standard", "expanded"];

export function BoardroomWidget({
  title,
  subtitle,
  size,
  onSetSize,
  onMoveUp,
  onMoveDown,
  onHide,
  canMoveUp,
  canMoveDown,
  children,
}: BoardroomWidgetProps) {
  return (
    <section className={`panel surface boardroom-widget boardroom-widget-${size}`}>
      <div className="panel-header boardroom-widget-header">
        <div className="panel-title-stack">
          <h3>{title}</h3>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
        <div className="boardroom-widget-controls">
          <div className="boardroom-size-toggle">
            {sizeOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`boardroom-size-button ${size === option ? "is-active" : ""}`}
                onClick={() => onSetSize(option)}
              >
                {option.charAt(0).toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" className="route-chip" disabled={!canMoveUp} onClick={onMoveUp}>
            Move Up
          </button>
          <button type="button" className="route-chip" disabled={!canMoveDown} onClick={onMoveDown}>
            Move Down
          </button>
          <button type="button" className="route-chip" onClick={onHide}>
            Hide
          </button>
        </div>
      </div>
      <div className="boardroom-widget-body">{children}</div>
    </section>
  );
}
