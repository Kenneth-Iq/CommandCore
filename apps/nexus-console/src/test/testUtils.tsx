import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import {
  mockAgentCentre,
  mockConversationCentre,
  mockMissionCentre,
  mockToolCentre,
  type NavPage,
} from "../data/mockKernel";
import { mockKnowledgeCentre, mockPortfolioExplorer } from "../data/nexusCentres";
import type { RouteSelection } from "../routing";
import type { WorldData } from "../worldModel";

export function renderWithDefaults(element: ReactElement) {
  return render(element);
}

export function createMockOnNavigate() {
  return vi.fn<(page: NavPage, selection?: RouteSelection) => void>();
}

export function buildMockWorld(): WorldData {
  return {
    portfolioExplorer: mockPortfolioExplorer,
    missionCentre: mockMissionCentre,
    agentCentre: mockAgentCentre,
    toolCentre: mockToolCentre,
    conversationCentre: mockConversationCentre,
    knowledgeCentre: mockKnowledgeCentre,
  };
}
