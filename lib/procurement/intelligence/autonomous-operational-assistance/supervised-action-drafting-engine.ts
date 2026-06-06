import type { SupervisedOperationalAssistanceState } from "./autonomous-operational-assistance";

export type SupervisedActionDraft = {
  title: string;
  actionType:
    | "observe"
    | "sequence"
    | "recovery"
    | "compression"
    | "workload_reduction";
  draft: string;
  requiresHumanApproval: true;
  explanation: string;
};

export function draftSupervisedOperationalAction(
  assistance: SupervisedOperationalAssistanceState
): SupervisedActionDraft {
  if (assistance.assistanceMode === "prepare_recovery") {
    return {
      title: "Prepare recovery sequence",
      actionType: "recovery",
      draft:
        "Review the highest-pressure workflow first, keep related actions together, and delay low-value updates until recovery pressure reduces.",
      requiresHumanApproval: true,
      explanation:
        "Recovery assistance is suggested because operational consciousness indicates synchronized recovery pressure.",
    };
  }

  if (assistance.assistanceMode === "compress_interruptions") {
    return {
      title: "Group low-value interruptions",
      actionType: "compression",
      draft:
        "Keep critical and actionable items visible, but group passive and repeated updates into a lower-priority review batch.",
      requiresHumanApproval: true,
      explanation:
        "Interruption compression is suggested because repeated signals may fragment executive focus.",
    };
  }

  if (assistance.assistanceMode === "suggest_sequence") {
    return {
      title: "Protect workflow sequence",
      actionType: "sequence",
      draft:
        "Continue the current unfinished workflow before opening unrelated procurement work.",
      requiresHumanApproval: true,
      explanation:
        "Sequencing assistance is suggested to preserve continuity-safe execution.",
    };
  }

  if (assistance.assistanceMode === "reduce_workload") {
    return {
      title: "Reduce executive re-analysis",
      actionType: "workload_reduction",
      draft:
        "Summarize repeated signals once, preserve the current context, and avoid asking the executive to re-evaluate the same workflow repeatedly.",
      requiresHumanApproval: true,
      explanation:
        "Workload reduction is suggested because repeated review pressure is reducing calm execution quality.",
    };
  }

  return {
    title: "Continue supervised observation",
    actionType: "observe",
    draft:
      "No execution draft is required. Continue monitoring with calm sequencing.",
    requiresHumanApproval: true,
    explanation:
      "Assistance remains passive because operational conditions are stable.",
  };
}
