import type { ProcurementMissionIntelligenceGrid } from "./procurement-mission-intelligence-grid";

export type UnifiedMissionState = {
  state:
    | "stable"
    | "guided"
    | "recovery"
    | "protected";
  summary: string;
  explanation: string;
};

export function resolveUnifiedMissionState(
  grid: ProcurementMissionIntelligenceGrid
): UnifiedMissionState {
  if (grid.gridMode === "synchronized_recovery") {
    return {
      state: "recovery",
      summary: "Recovery synchronization active",
      explanation:
        "Procurement modules are coordinating recovery pacing together.",
    };
  }

  if (grid.gridMode === "continuity_protection") {
    return {
      state: "protected",
      summary: "Continuity protection active",
      explanation:
        "Cross-module continuity protection increased to preserve workflow stability.",
    };
  }

  if (grid.gridMode === "guided") {
    return {
      state: "guided",
      summary: "Guided mission coordination active",
      explanation:
        "Mission-wide sequencing guidance is synchronized.",
    };
  }

  return {
    state: "stable",
    summary: "Mission grid stable",
    explanation:
      "Procurement mission coordination remains stable.",
  };
}
