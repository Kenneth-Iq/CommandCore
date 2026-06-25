import type { DataSource } from "../api/commandcoreApi";
import type { PageData } from "../data/mockKernel";
import { OperationsPage } from "./OperationsPage";

type ConversationDashboardProps = {
  page: PageData;
  source: DataSource;
  sourceMessage?: string;
};

export function ConversationDashboard(props: ConversationDashboardProps) {
  return <OperationsPage {...props} />;
}
