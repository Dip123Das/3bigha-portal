import type { ProcurementMissionIntelligenceGrid } from "./procurement-mission-intelligence-grid";

export type MissionRecoveryCoordination = {
  recoveryMode:
    | "stable"
    | "guided"
    | "synchronized";
  coordinationScore: number;
  explanation: string;
};

export function coordinateMissionRecovery(
  grid: ProcurementMissionIntelligenceGrid
): MissionRecoveryCoordination {
  if (grid.gridMode === "synchronized_recovery") {
    return {
      recoveryMode: "synchronized",
      coordinationScore: grid.recoveryCoordinationIntegrity,
      explanation:
        "Recovery pacing is synchronized across procurement modules.",
    };
  }

  if (grid.recoveryCoordinationIntegrity < 72) {
    return {
      recoveryMode: "guided",
      coordinationScore: grid.recoveryCoordinationIntegrity,
      explanation:
        "Recovery coordination remains guided to preserve calm continuity.",
    };
  }

  return {
    recoveryMode: "stable",
    coordinationScore: grid.recoveryCoordinationIntegrity,
    explanation:
      "Recovery coordination remains stable.",
  };
}
