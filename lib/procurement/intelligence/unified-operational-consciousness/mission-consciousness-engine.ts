import type { UnifiedOperationalConsciousnessState } from "./unified-operational-consciousness";

export type MissionConsciousnessDirective = {
  directive:
    | "continue_normal_flow"
    | "protect_sequence"
    | "compress_interruptions"
    | "synchronize_recovery";
  label: string;
  explanation: string;
};

export function resolveMissionConsciousnessDirective(
  consciousness: UnifiedOperationalConsciousnessState
): MissionConsciousnessDirective {
  if (consciousness.consciousnessMode === "recovery_sync") {
    return {
      directive: "synchronize_recovery",
      label: "Recovery synchronized",
      explanation:
        "Recovery pacing should remain aligned before new operational expansion.",
    };
  }

  if (consciousness.consciousnessMode === "compressed") {
    return {
      directive: "compress_interruptions",
      label: "Interruption compression active",
      explanation:
        "Repeated low-value signals should stay grouped to preserve executive focus.",
    };
  }

  if (consciousness.consciousnessMode === "guided") {
    return {
      directive: "protect_sequence",
      label: "Guided sequencing active",
      explanation:
        "Continue with ordered workflow handling and avoid unrelated switching.",
    };
  }

  return {
    directive: "continue_normal_flow",
    label: "Conscious flow stable",
    explanation:
      "Procurement OS layers are synchronized for normal calm execution.",
  };
}
