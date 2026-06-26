import type { NavPage } from "../data/mockKernel";
import { FavouriteToggle } from "./FavouriteToggle";
import { StatusBadge } from "./StatusBadge";

type DetailLink = {
  label: string;
  page: NavPage;
  selection?: {
    missionId?: string;
    agentId?: string;
    toolId?: string;
    conversationId?: string;
    assetId?: string;
    workspaceId?: string;
    companyId?: string;
    projectId?: string;
  };
};

type RecordDetailPanelProps = {
  title: string;
  eyebrow: string;
  statusLabel: string;
  statusTone: "ready" | "warning" | "blocked" | "active" | "idle" | "complete";
  summary: string;
  meta: string[];
  relatedLinks: DetailLink[];
  onNavigate: (page: NavPage, selection?: DetailLink["selection"]) => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
};

export function RecordDetailPanel({
  title,
  eyebrow,
  statusLabel,
  statusTone,
  summary,
  meta,
  relatedLinks,
  onNavigate,
  isPinned,
  onTogglePin,
}: RecordDetailPanelProps) {
  return (
    <section className="panel surface record-detail-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>
            {onTogglePin ? (
              <FavouriteToggle active={isPinned ?? false} onToggle={onTogglePin} label="watchlist record" />
            ) : null}
            {" "}
            {title}
          </h3>
          <span>{eyebrow}</span>
        </div>
        <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
      </div>
      <p className="record-detail-summary">{summary}</p>
      {meta.length ? (
        <div className="portfolio-tag-row">
          {meta.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}
      <div className="route-chip-row mission-route-row">
        {relatedLinks.map((link) => (
          <button key={`${link.label}-${link.page}`} type="button" className="route-chip" onClick={() => onNavigate(link.page, link.selection)}>
            {link.label}
          </button>
        ))}
      </div>
    </section>
  );
}
