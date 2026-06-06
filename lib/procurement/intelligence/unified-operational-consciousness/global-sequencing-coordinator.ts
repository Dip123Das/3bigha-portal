import type { UnifiedOperationalConsciousnessState } from "./unified-operational-consciousness";

export type GlobalSequencingCoordination = {
  sequencingCoordinationIntegrity: number;
  coordinationMode:
    | "normal"
    | "narrow_sequence"
    | "stabilize_before_expansion";
  explanation: string;
};

export function coordinateGlobalSequencing(
  consciousness: UnifiedOperationalConsciousnessState
): GlobalSequencingCoordination {
  if (consciousness.sequencingCoordinationIntegrity < 55) {
    return {
      sequencingCoordinationIntegrity: consciousness.sequencingCoordinationIntegrity,
      coordinationMode: "stabilize_before_expansion",
      explanation:
        "Sequencing integrity is weak; stabilize existing workflow order before opening more items.",
    };
  }

  if (consciousness.sequencingCoordinationIntegrity < 75) {
    return {
      sequencingCoordinationIntegrity: consciousness.sequencingCoordinationIntegrity,
      coordinationMode: "narrow_sequence",
      explanation:
        "A narrower operating sequence will help preserve continuity.",
    };
  }

  return {
    sequencingCoordinationIntegrity: consciousness.sequencingCoordinationIntegrity,
    coordinationMode: "normal",
    explanation:
      "Global sequencing is stable for normal operational handling.",
  };
}
