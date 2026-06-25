import type { DataSource } from "../api/commandcoreApi";
import type { PageData } from "../data/mockKernel";
import { OperationsPage } from "./OperationsPage";

type AgentDashboardProps = {
  page: PageData;
  source: DataSource;
  sourceMessage?: string;
};

export function AgentDashboard(props: AgentDashboardProps) {
  return <OperationsPage {...props} />;
}
