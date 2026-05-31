import { notifyUser } from "./notifyUser";

export type CopilotActionType =
  | "follow_up"
  | "quote_review"
  | "vendor_reengagement"
  | "buyer_reengagement"
  | "deadline_warning"
  | "workflow_resume"
  | "negotiation_push"
  | "critical_attention";

export function generateCopilotRecommendation(input: {
  urgencyLevel?: string;
  recoverySeverity?: string;
  dealRiskLevel?: string;
  unreadMessages?: number;
  vendorSilent?: boolean;
  buyerSilent?: boolean;
  deadlineHours?: number | null;
}) {
  const unread = Number(input.unreadMessages || 0);

  if (
    input.dealRiskLevel === "collapse_risk"
  ) {
    return {
      type: "critical_attention" as CopilotActionType,

      title:
        "Critical deal recovery needed",

      body:
        "This procurement workflow is at high risk of collapse. Immediate follow-up recommended.",

      priority: "critical",
    };
  }

  if (
    input.recoverySeverity ===
      "critical_recovery" ||
    input.urgencyLevel === "critical"
  ) {
    return {
      type: "workflow_resume" as CopilotActionType,

      title:
        "Resume stalled procurement workflow",

      body:
        "This workflow has been inactive too long. Resume negotiation and procurement activity.",

      priority: "critical",
    };
  }

  if (
    typeof input.deadlineHours ===
      "number" &&
    input.deadlineHours <= 6
  ) {
    return {
      type: "deadline_warning" as CopilotActionType,

      title:
        "Procurement deadline approaching",

      body:
        "Quotation or procurement deadline is approaching soon.",

      priority: "high",
    };
  }

  if (
    input.vendorSilent &&
    unread >= 3
  ) {
    return {
      type: "vendor_reengagement" as CopilotActionType,

      title:
        "Vendor follow-up recommended",

      body:
        "Vendor activity appears stalled. Send a follow-up message.",

      priority: "medium",
    };
  }

  if (
    input.buyerSilent &&
    unread >= 3
  ) {
    return {
      type: "buyer_reengagement" as CopilotActionType,

      title:
        "Buyer re-engagement suggested",

      body:
        "Buyer interaction has slowed down. Reconnect to continue the workflow.",

      priority: "medium",
    };
  }

  return {
    type: "follow_up" as CopilotActionType,

    title:
      "Operational follow-up available",

    body:
      "A workflow follow-up opportunity has been detected.",

    priority: "normal",
  };
}

export async function notifyAutonomousCopilot(input: {
  userId: string;

  url: string;

  urgencyLevel?: string;

  recoverySeverity?: string;

  dealRiskLevel?: string;

  unreadMessages?: number;

  vendorSilent?: boolean;

  buyerSilent?: boolean;

  deadlineHours?: number | null;

  rfqId?: string;

  conversationId?: string;
}) {
  if (!input.userId) return;

  const recommendation =
    generateCopilotRecommendation({
      urgencyLevel:
        input.urgencyLevel,

      recoverySeverity:
        input.recoverySeverity,

      dealRiskLevel:
        input.dealRiskLevel,

      unreadMessages:
        input.unreadMessages,

      vendorSilent:
        input.vendorSilent,

      buyerSilent:
        input.buyerSilent,

      deadlineHours:
        input.deadlineHours,
    });

  await notifyUser(input.userId, {
    title: recommendation.title,

    body: recommendation.body,

    category:
      recommendation.priority ===
        "critical" ||
      recommendation.priority ===
        "high"
        ? "procurement_alert"
        : "operational_alert",

    url: input.url,

    rfqId: input.rfqId,

    conversationId:
      input.conversationId,

    data: {
      source:
        "autonomous_procurement_copilot",

      copilotAction:
        recommendation.type,

      priority:
        recommendation.priority,
    },
  });
}