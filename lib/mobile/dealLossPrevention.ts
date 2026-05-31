import { notifyUser } from "./notifyUser";

export type DealLossRiskLevel =
  | "stable"
  | "watch"
  | "at_risk"
  | "high_risk"
  | "collapse_risk";

export function calculateDealLossRisk(input: {
  hoursSinceBuyerActivity?: number;
  hoursSinceVendorActivity?: number;
  unreadMessages?: number;
  vendorResponseCount?: number;
  buyerViewedQuote?: boolean;
  quoteCount?: number;
  negotiationStarted?: boolean;
  deadlineHours?: number | null;
  highValueDeal?: boolean;
}) {
  const buyerIdle = Number(input.hoursSinceBuyerActivity || 0);
  const vendorIdle = Number(input.hoursSinceVendorActivity || 0);
  const unread = Number(input.unreadMessages || 0);
  const vendorResponses = Number(input.vendorResponseCount || 0);
  const quoteCount = Number(input.quoteCount || 0);

  let score = 0;

  if (buyerIdle >= 24) score += 15;
  if (buyerIdle >= 72) score += 20;

  if (vendorIdle >= 24) score += 15;
  if (vendorIdle >= 72) score += 20;

  if (unread >= 3) score += 10;
  if (unread >= 7) score += 15;

  if (vendorResponses === 0) score += 20;
  if (quoteCount === 0) score += 15;

  if (input.buyerViewedQuote === false && quoteCount > 0) {
    score += 15;
  }

  if (!input.negotiationStarted && quoteCount > 0) {
    score += 10;
  }

  if (typeof input.deadlineHours === "number") {
    if (input.deadlineHours <= 24) score += 15;
    if (input.deadlineHours <= 6) score += 20;
  }

  if (input.highValueDeal) score += 10;

  const level: DealLossRiskLevel =
    score >= 95
      ? "collapse_risk"
      : score >= 75
      ? "high_risk"
      : score >= 50
      ? "at_risk"
      : score >= 25
      ? "watch"
      : "stable";

  return {
    score,
    level,
    shouldRescue:
      level === "at_risk" ||
      level === "high_risk" ||
      level === "collapse_risk",
  };
}

export function buildDealRescueAction(level: DealLossRiskLevel) {
  switch (level) {
    case "collapse_risk":
      return "Open this deal now. Send a direct follow-up or call the other party.";

    case "high_risk":
      return "Send a strong follow-up and confirm price, delivery, and availability.";

    case "at_risk":
      return "Restart the conversation with a clear next step.";

    case "watch":
      return "Monitor this deal and follow up if there is no activity soon.";

    default:
      return "Deal flow is stable.";
  }
}

export async function notifyDealLossRisk(input: {
  userId: string;
  title: string;
  body: string;
  url: string;
  riskLevel: DealLossRiskLevel;
  riskScore: number;
  rfqId?: string;
  conversationId?: string;
}) {
  if (!input.userId) return;

  await notifyUser(input.userId, {
    title: input.title,
    body: input.body,
    category:
      input.riskLevel === "collapse_risk" ||
      input.riskLevel === "high_risk"
        ? "procurement_alert"
        : "operational_alert",
    url: input.url,
    rfqId: input.rfqId,
    conversationId: input.conversationId,
    data: {
      source: "deal_loss_prevention_engine",
      riskLevel: input.riskLevel,
      riskScore: String(input.riskScore),
      rescueAction: buildDealRescueAction(input.riskLevel),
    },
  });
}