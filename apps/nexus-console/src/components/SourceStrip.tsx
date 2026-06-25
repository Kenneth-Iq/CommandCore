import type { ReactNode } from "react";
import type { DataSource } from "../api/commandcoreApi";
import { StatusBadge } from "./StatusBadge";

type SourceStripProps = {
  source: DataSource;
  sourceMessage?: string;
  title?: string;
  label?: string;
  status?: {
    label: string;
    tone: "ready" | "warning" | "blocked" | "active" | "idle" | "complete";
  };
  children?: ReactNode;
};

export function SourceStrip({
  source,
  sourceMessage,
  title,
  label = "Data Mode",
  status,
  children,
}: SourceStripProps) {
  return (
    <div className="surface source-strip">
      <div>
        <p className="page-eyebrow">{label}</p>
        <strong>
          {title ??
            (source === "live"
              ? "Connected to CommandCore API"
              : "Using Mock Kernel Snapshot")}
        </strong>
        {sourceMessage ? <p className="source-note">{sourceMessage}</p> : null}
      </div>
      <div className="source-strip-actions">
        {children}
        <StatusBadge tone={source === "live" ? "ready" : "idle"}>
          {source === "live" ? "Live API" : "Mock Data"}
        </StatusBadge>
        {status ? <StatusBadge tone={status.tone}>{status.label}</StatusBadge> : null}
      </div>
    </div>
  );
}
