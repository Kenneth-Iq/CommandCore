import type { PageData } from "../data/mockKernel";
import { StatusBadge } from "./StatusBadge";

type PageHeaderProps = {
  page: PageData;
};

export function PageHeader({ page }: PageHeaderProps) {
  return (
    <header className="page-header surface">
      <div>
        <p className="page-eyebrow">{page.eyebrow}</p>
        <h2>{page.title}</h2>
        <p className="page-description">{page.description}</p>
      </div>
      <div className="page-status">
        <span>Surface Status</span>
        <StatusBadge tone={page.status.tone}>{page.status.label}</StatusBadge>
      </div>
    </header>
  );
}
