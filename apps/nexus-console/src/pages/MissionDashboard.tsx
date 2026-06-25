import type { DataSource } from "../api/commandcoreApi";
import type { PageData } from "../data/mockKernel";
import { OperationsPage } from "./OperationsPage";

type MissionDashboardProps = {
  page: PageData;
  source: DataSource;
  sourceMessage?: string;
};

export function MissionDashboard(props: MissionDashboardProps) {
  return <OperationsPage {...props} />;
}
