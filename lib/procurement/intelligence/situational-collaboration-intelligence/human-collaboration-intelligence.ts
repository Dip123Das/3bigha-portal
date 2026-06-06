import type { SituationalCollaborationIntelligence } from "./situational-collaboration-intelligence";

export function resolveHumanCollaborationGuidance(
  state: SituationalCollaborationIntelligence
) {
  const needsClarification =
    state.humanCoordinationClarity < 65 ||
    state.collaborationMode === "clarify_human_context";

  return {
    collaborationReadiness: state.sharedOperationalContextHealth,
    needsClarification,
    guidance: needsClarification
      ? "Ask for one clear next owner before continuing the workflow."
      : state.collaborationMode === "coordinate_recovery"
        ? "Keep communication focused on the recovery path and avoid scattered follow-ups."
        : "Human collaboration can continue under current procurement rhythm.",
  };
}
