import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { emptyFocusState, type ExecutiveFocusState } from "./components/ExecutiveFocusPanel";
import type { NavPage } from "./data/mockKernel";
import {
  buildApprovalCards,
  buildDecisionQueue,
  buildFollowUps,
  buildRecommendations,
  type ApprovalCard,
  type DecisionItem,
  type FollowUpItem,
  type RecommendationCard,
} from "./executiveAssistant";
import { buildEvidenceRegistry, type EvidenceRegistryItem } from "./evidenceRegistry";
import type { RouteSelection } from "./routing";
import { useExecutiveSimulation, type ExecutiveSimulationState } from "./simulation";
import type { WorldData } from "./worldModel";

export type RuntimeContextValue = {
  world: WorldData;
  simulation: ExecutiveSimulationState;
  focus: ExecutiveFocusState;
  setFocus: (focus: ExecutiveFocusState) => void;
  recommendations: RecommendationCard[];
  decisionQueue: DecisionItem[];
  pendingFollowUps: FollowUpItem[];
  approvalCards: ApprovalCard[];
  evidenceRegistry: EvidenceRegistryItem[];
  activePage: NavPage;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
};

const RuntimeContext = createContext<RuntimeContextValue | undefined>(undefined);

type RuntimeProviderProps = {
  world: WorldData;
  activePage: NavPage;
  onNavigate: (page: NavPage, selection?: RouteSelection) => void;
  children: ReactNode;
};

export function RuntimeProvider({ world, activePage, onNavigate, children }: RuntimeProviderProps) {
  const simulation = useExecutiveSimulation(world);
  const [focus, setFocus] = useState<ExecutiveFocusState>(() => emptyFocusState());

  const recommendations = useMemo(() => buildRecommendations(world, simulation), [world, simulation]);
  const decisionQueue = useMemo(
    () => buildDecisionQueue(world, simulation, recommendations),
    [world, simulation, recommendations],
  );
  const pendingFollowUps = useMemo(() => buildFollowUps(world, simulation), [world, simulation]);
  const approvalCards = useMemo(() => buildApprovalCards(world, simulation), [world, simulation]);
  const evidenceRegistry = useMemo(
    () => buildEvidenceRegistry(recommendations, decisionQueue, pendingFollowUps, approvalCards),
    [recommendations, decisionQueue, pendingFollowUps, approvalCards],
  );

  const value = useMemo<RuntimeContextValue>(
    () => ({
      world,
      simulation,
      focus,
      setFocus,
      recommendations,
      decisionQueue,
      pendingFollowUps,
      approvalCards,
      evidenceRegistry,
      activePage,
      onNavigate,
    }),
    [world, simulation, focus, recommendations, decisionQueue, pendingFollowUps, approvalCards, evidenceRegistry, activePage, onNavigate],
  );

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useRuntimeContext(): RuntimeContextValue {
  const context = useContext(RuntimeContext);
  if (!context) {
    throw new Error("useRuntimeContext must be called within a RuntimeProvider");
  }
  return context;
}
