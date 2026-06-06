import type { SupervisedOperationalAssistanceState } from "./autonomous-operational-assistance";

export type ContinuitySafeAction = {
  priority:
    | "normal"
    | "guided"
    | "protect_context"
    | "recovery_first";
  recommendation: string;
  explanation: string;
};

export function generateContinuitySafeAction(
  assistance: SupervisedOperationalAssistanceState
): ContinuitySafeAction {
  if (assistance.supervisedExecutionReadiness < 55) {
    return {
      priority: "protect_context",
      recommendation:
        "Do not expand operational scope. Preserve current workflow context first.",
      explanation:
        "Execution readiness is not strong enough for wider operational expansion.",
    };
  }

  if (assistance.assistanceMode === "prepare_recovery") {
    return {
      priority: "recovery_first",
      recommendation:
        "Handle recovery sequencing before normal procurement updates.",
      explanation:
        "Recovery-first handling protects continuity during pressure.",
    };
  }

  if (assistance.assistanceMode === "suggest_sequence") {
    return {
      priority: "guided",
      recommendation:
        "Proceed with the recommended sequence and keep related workflow items together.",
      explanation:
        "Guided sequencing reduces context switching.",
    };
  }

  return {
    priority: "normal",
    recommendation:
      "Continue normal supervised procurement flow.",
    explanation:
      "Continuity-safe assistance is stable.",
  };
}
