import type { ReactNode } from "react";
import type { StatusTone } from "../data/mockKernel";

type StatusBadgeProps = {
  tone: StatusTone;
  children: ReactNode;
};

export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return <span className={`status-badge tone-${tone}`}>{children}</span>;
}
