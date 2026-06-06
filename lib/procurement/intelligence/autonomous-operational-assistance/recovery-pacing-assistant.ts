import type { SupervisedOperationalAssistanceState } from "./autonomous-operational-assistance";

export function recommendRecoveryPacing(
  assistance: SupervisedOperationalAssistanceState
) {
  if (assistance.assistanceMode === "prepare_recovery") {
    return {
      pacing: "slow_sequential",
      message:
        "Use slow sequential recovery: resolve the top blocking workflow, then review related follow-ups.",
    };
  }

  if (assistance.assistanceMode === "reduce_workload") {
    return {
      pacing: "summarize_then_act",
      message:
        "Summarize repeated pressure once before taking supervised action.",
    };
  }

  return {
    pacing: "normal",
    message:
      "Recovery pacing can remain normal.",
  };
}
