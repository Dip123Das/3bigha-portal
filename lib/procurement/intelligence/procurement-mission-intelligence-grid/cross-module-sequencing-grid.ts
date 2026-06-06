import type { ProcurementMissionIntelligenceGrid } from "./procurement-mission-intelligence-grid";

export type CrossModuleSequencingState = {
  sequencingMode:
    | "normal"
    | "guided"
    | "protected";
  sequencingIntegrity: number;
  explanation: string;
};

export function evaluateCrossModuleSequencing(
  grid: ProcurementMissionIntelligenceGrid
): CrossModuleSequencingState {
  if (grid.continuityAlignment < 55) {
    return {
      sequencingMode: "protected",
      sequencingIntegrity: grid.continuityAlignment,
      explanation:
        "Cross-module sequencing protection increased because continuity alignment weakened.",
    };
  }

  if (grid.crossModuleSynchronization < 72) {
    return {
      sequencingMode: "guided",
      sequencingIntegrity: grid.crossModuleSynchronization,
      explanation:
        "Cross-module sequencing remains guided for calmer workflow handling.",
    };
  }

  return {
    sequencingMode: "normal",
    sequencingIntegrity: grid.crossModuleSynchronization,
    explanation:
      "Cross-module sequencing remains stable.",
  };
}
