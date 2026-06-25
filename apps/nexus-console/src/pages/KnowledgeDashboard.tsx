import type { DataSource } from "../api/commandcoreApi";
import type { PageData } from "../data/mockKernel";
import { OperationsPage } from "./OperationsPage";

type KnowledgeDashboardProps = {
  page: PageData;
  source: DataSource;
  sourceMessage?: string;
};

export function KnowledgeDashboard(props: KnowledgeDashboardProps) {
  return <OperationsPage {...props} />;
}
