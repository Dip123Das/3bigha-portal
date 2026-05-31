import { notifyUser } from "./notifyUser";

export type WorkflowRecoverySeverity =
  | "watch"
  | "recover"
  | "urgent_recovery"
  | "critical_recovery";

export function calculateWorkflowRecovery(input: {
  hoursInactive?: number;
  unreadMessages?: number;
  pendingQuotes?: number;
  noVendorReplies?: boolean;
  missedDeadline?: boolean;
  procurementValue?: "low" | "medium" | "high";
}) {
  const inactive = Number(input.hoursInactive || 0);
  const unread = Number(input.unreadMessages || 0);
  const pendingQuotes = Number(input.pendingQuotes || 0);

  let score = 0;

  if (inactive >= 24) score += 20;
  if (inactive >= 72) score += 25;
  if (inactive >= 120) score += 30;

  if (unread >= 3) score += 10;
  if (unread >= 7) score += 15;

  if (pendingQuotes >= 3) score += 10;

  if (input.noVendorReplies) score += 15;

  if (input.missedDeadline) score += 25;

  if (input.procurementValue === "high") score += 20;
  else if (input.procurementValue === "medium") score += 10;

  const severity: WorkflowRecoverySeverity =
    score >= 90
      ? "critical_recovery"
      : score >= 65
      ? "urgent_recovery"
      : score >= 35
      ? "recover"
      : "watch";

  return {
    score,
    severity,

    needsRecovery:
      severity === "recover" ||
      severity === "urgent_recovery" ||
      severity === "critical_recovery",
  };
}

export function buildRecoveryRecommendation(
  severity: WorkflowRecoverySeverity
) {
  switch (severity) {
    case "critical_recovery":
      return "Immediate workflow recovery required. Open procurement thread and take action now.";

    case "urgent_recovery":
      return "Procurement workflow is stalling. Send follow-up and resume negotiation.";

    case "recover":
      return "Workflow may need attention. Review latest activity.";

    default:
      return "Workflow healthy.";
  }
}

export async function notifyWorkflowRecovery(input: {
  userId: string;

  title: string;

  body: string;

  url: string;

  severity: WorkflowRecoverySeverity;

  recoveryScore: number;

  rfqId?: string;

  conversationId?: string;
}) {
  if (!input.userId) return;

  await notifyUser(input.userId, {
    title: input.title,

    body: input.body,

    category:
      input.severity === "critical_recovery" ||
      input.severity === "urgent_recovery"
        ? "procurement_alert"
        : "operational_alert",

    url: input.url,

    rfqId: input.rfqId,

    conversationId: input.conversationId,

    data: {
      source: "workflow_recovery_engine",

      recoverySeverity: input.severity,

      recoveryScore: String(input.recoveryScore),

      recommendation:
        buildRecoveryRecommendation(
          input.severity
        ),
    },
  });
}