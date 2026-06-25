import type { DataSource } from "../api/commandcoreApi";
import type { PageData } from "../data/mockKernel";
import { OperationsPage } from "./OperationsPage";

type HealthReadinessProps = {
  page: PageData;
  source: DataSource;
  sourceMessage?: string;
};

export function HealthReadiness(props: HealthReadinessProps) {
  return <OperationsPage {...props} />;
}
