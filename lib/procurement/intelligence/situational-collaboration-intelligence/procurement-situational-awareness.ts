import type { SituationalCollaborationIntelligence } from "./situational-collaboration-intelligence";

export function resolveProcurementSituationalAwareness(
  state: SituationalCollaborationIntelligence
) {
  if (state.collaborationMode === "coordinate_recovery") {
    return {
      mode: "recovery_context" as const,
      label: "Recovery context",
      message:
        "Keep buyer, vendor and recovery follow-ups in one clear operational context.",
    };
  }

  if (state.collaborationMode === "clarify_human_context") {
    return {
      mode: "clarify_context" as const,
      label: "Clarify context",
      message:
        "Clarify who needs to act next before opening wider coordination.",
    };
  }

  if (state.collaborationMode === "guided") {
    return {
      mode: "guided" as const,
      label: "Guided awareness",
      message:
        "Maintain guided situational awareness across active procurement work.",
    };
  }

  return {
    mode: "stable" as const,
    label: "Awareness stable",
    message:
      "Procurement situational awareness is stable.",
  };
}
