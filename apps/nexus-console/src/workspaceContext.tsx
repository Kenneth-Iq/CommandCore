import { createContext, useContext, type ReactNode } from "react";
import { useExecutiveWorkspace } from "./operatorPrefs";

type WorkspaceContextValue = ReturnType<typeof useExecutiveWorkspace>;

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const workspace = useExecutiveWorkspace();
  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be called within a WorkspaceProvider");
  }
  return context;
}
