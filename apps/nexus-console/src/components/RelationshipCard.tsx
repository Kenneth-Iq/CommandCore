import type { NavPage } from "../data/mockKernel";
import type { RouteSelection } from "../routing";
import type { RelationshipCardData, RelationshipLink } from "../worldModel";

type RelationshipCardProps = {
  data: RelationshipCardData;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

export function RelationshipCard({ data, onNavigate }: RelationshipCardProps) {
  const sections: Array<{ key: string; title: string; links: RelationshipLink[] }> = [
    { key: "parent", title: "Parent", links: data.parent ? [data.parent] : [] },
    { key: "belongsTo", title: "Belongs To", links: data.belongsTo },
    { key: "relatedItems", title: "Related Items", links: data.relatedItems },
    { key: "dependencies", title: "Dependencies", links: data.dependencies },
    { key: "children", title: "Children", links: data.children },
  ];
  const hasAny = sections.some((section) => section.links.length);

  return (
    <section className="panel surface relationship-card-panel">
      <div className="panel-header">
        <div className="panel-title-stack">
          <h3>Relationships</h3>
          <span>Hierarchy and cross-links for the selected record.</span>
        </div>
      </div>

      {hasAny ? (
        <div className="relationship-grid">
          {sections.map((section) => (
            <div key={section.key} className="relationship-group">
              <span className="relationship-group-label">{section.title}</span>
              {section.links.length ? (
                <div className="route-chip-row">
                  {section.links.map((relationshipLink, index) => (
                    <button
                      key={`${section.key}-${index}-${relationshipLink.label}`}
                      type="button"
                      className="route-chip"
                      onClick={() => onNavigate(relationshipLink.page, relationshipLink.selection)}
                    >
                      {relationshipLink.label}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="relationship-group-empty">None</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No Relationships Mapped</strong>
          <p>Hierarchy and cross-links will appear here once this record has resolvable context.</p>
        </div>
      )}
    </section>
  );
}
