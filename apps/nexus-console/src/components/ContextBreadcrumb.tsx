import type { NavPage } from "../data/mockKernel";
import type { RouteSelection } from "../routing";
import type { BreadcrumbSegment } from "../worldModel";

type ContextBreadcrumbProps = {
  segments: BreadcrumbSegment[];
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function ContextBreadcrumb({ segments, onNavigate }: ContextBreadcrumbProps) {
  return (
    <nav className="surface context-breadcrumb" aria-label="Enterprise context breadcrumb">
      {segments.map((segment, index) => (
        <span key={`${segment.page}-${index}-${segment.label}`} className="context-breadcrumb-item">
          {index > 0 ? <span className="context-breadcrumb-separator">›</span> : null}
          {segment.isCurrent ? (
            <strong className="context-breadcrumb-current">{segment.label}</strong>
          ) : (
            <button type="button" className="context-breadcrumb-link" onClick={() => onNavigate(segment.page, segment.selection)}>
              {segment.label}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}
