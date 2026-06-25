import type { DataSource } from "../api/commandcoreApi";
import type { PageData } from "../data/mockKernel";
import { OperationsPage } from "./OperationsPage";

type ExecutiveDashboardProps = {
  page: PageData;
  source: DataSource;
  sourceMessage?: string;
};

export function ExecutiveDashboard(props: ExecutiveDashboardProps) {
  return <OperationsPage {...props} />;
}
