import type { SharedExecutiveFocusState } from "./shared-focus-state";

export type CalmExecutionNetworkState = {
  calmState:
    | "normal"
    | "guided_sequence"
    | "compression_active"
    | "recovery_focus";
  instruction: string;
  visibleLabel: string;
};

export function resolveCalmExecutionNetwork(
  focusState: SharedExecutiveFocusState
): CalmExecutionNetworkState {
  if (focusState.focusMode === "recovery") {
    return {
      calmState: "recovery_focus",
      visibleLabel: "Recovery focus",
      instruction:
        "Handle only the most important procurement signals first. Keep other updates grouped.",
    };
  }

  if (focusState.focusMode === "compressed") {
    return {
      calmState: "compression_active",
      visibleLabel: "Compression active",
      instruction:
        "Low-value operational updates are grouped to reduce attention switching.",
    };
  }

  if (focusState.focusMode === "guided") {
    return {
      calmState: "guided_sequence",
      visibleLabel: "Guided sequence",
      instruction:
        "Continue procurement work in a calm sequence without jumping between unrelated items.",
    };
  }

  return {
    calmState: "normal",
    visibleLabel: "Stable flow",
    instruction:
      "Procurement attention is stable. Continue normal monitoring.",
  };
}
