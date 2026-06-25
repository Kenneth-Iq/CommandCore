import type { DataSource } from "../api/commandcoreApi";
import type { PageData } from "../data/mockKernel";
import { OperationsPage } from "./OperationsPage";

type WorkspacesDashboardProps = {
  page: PageData;
  source: DataSource;
  sourceMessage?: string;
};

export function WorkspacesDashboard(props: WorkspacesDashboardProps) {
  return <OperationsPage {...props} />;
}
