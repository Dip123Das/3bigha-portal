import { notifyUser } from "./notifyUser";

export type SelfHealingState =
  | "healthy"
  | "watch"
  | "repair_needed"
  | "reroute_needed"
  | "critical_repair";

export function calculateSelfHealingProcurement(input: {
  stalledWorkflows?: number;
  failedNegotiations?: number;
  unavailableVendors?: number;
  supplierCollapseSignals?: number;
  missedDeadlines?: number;
  recoveryAttempts?: number;
  successfulRecoveries?: number;
  urgentProcurements?: number;
}) {
  const stalled = Number(input.stalledWorkflows || 0);
  const failedNegotiations = Number(input.failedNegotiations || 0);
  const unavailableVendors = Number(input.unavailableVendors || 0);
  const supplierCollapse = Number(input.supplierCollapseSignals || 0);
  const missedDeadlines = Number(input.missedDeadlines || 0);
  const recoveryAttempts = Number(input.recoveryAttempts || 0);
  const successfulRecoveries = Number(input.successfulRecoveries || 0);
  const urgent = Number(input.urgentProcurements || 0);

  let score = 0;

  score += stalled * 12;
  score += failedNegotiations * 15;
  score += unavailableVendors * 14;
  score += supplierCollapse * 22;
  score += missedDeadlines * 18;
  score += urgent * 12;

  if (recoveryAttempts >= 2 && successfulRecoveries === 0) {
    score += 20;
  }

  if (recoveryAttempts >= 4 && successfulRecoveries === 0) {
    score += 25;
  }

  const state: SelfHealingState =
    score >= 120
      ? "critical_repair"
      : score >= 85
      ? "reroute_needed"
      : score >= 55
      ? "repair_needed"
      : score >= 25
      ? "watch"
      : "healthy";

  return {
    score,
    state,

    shouldHeal:
      state === "repair_needed" ||
      state === "reroute_needed" ||
      state === "critical_repair",
  };
}

export function buildSelfHealingDirective(
  state: SelfHealingState
) {
  switch (state) {
    case "critical_repair":
      return {
        title: "Critical procurement repair needed",

        body:
          "Multiple procurement chains may fail without immediate recovery action.",

        directive:
          "Open recovery center, reroute vendors, and restart stalled negotiations.",
      };

    case "reroute_needed":
      return {
        title: "Procurement rerouting recommended",

        body:
          "Some procurement workflows may need alternate vendors or recovery actions.",

        directive:
          "Review supplier alternatives and reroute stalled procurements.",
      };

    case "repair_needed":
      return {
        title: "Procurement workflow repair needed",

        body:
          "One or more procurement workflows are showing repairable failure signals.",

        directive:
          "Resume stalled workflows and send recovery follow-ups.",
      };

    case "watch":
      return {
        title: "Procurement recovery watch",

        body:
          "Some workflows need monitoring before failure risk increases.",

        directive:
          "Watch stalled RFQs and vendor response delays.",
      };

    default:
      return {
        title: "Procurement systems healthy",

        body:
          "No major procurement recovery action needed.",

        directive:
          "Continue standard monitoring.",
      };
  }
}

export async function notifySelfHealingProcurement(input: {
  userId: string;

  url: string;

  state: SelfHealingState;

  score: number;
}) {
  if (!input.userId) return;

  const directive =
    buildSelfHealingDirective(
      input.state
    );

  await notifyUser(input.userId, {
    title: directive.title,

    body: directive.body,

    category:
      input.state === "critical_repair" ||
      input.state === "reroute_needed"
        ? "procurement_alert"
        : "operational_alert",

    url: input.url,

    data: {
      source:
        "ai_self_healing_procurement",

      selfHealingState:
        input.state,

      selfHealingScore:
        String(input.score),

      directive:
        directive.directive,
    },
  });
}