import type { DataSource } from "../api/commandcoreApi";
import type { PageData } from "../data/mockKernel";
import { OperationsPage } from "./OperationsPage";

type ToolDashboardProps = {
  page: PageData;
  source: DataSource;
  sourceMessage?: string;
};

export function ToolDashboard(props: ToolDashboardProps) {
  return <OperationsPage {...props} />;
}
