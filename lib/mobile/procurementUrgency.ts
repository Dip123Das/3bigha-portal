import { notifyUser } from "./notifyUser";

export type ProcurementUrgencyLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

export function calculateProcurementUrgency(input: {
  unreadCount?: number;
  hoursSinceLastActivity?: number;
  quoteDeadlineHours?: number | null;
  vendorResponseCount?: number;
}) {
  const unread = input.unreadCount || 0;
  const idleHours = input.hoursSinceLastActivity || 0;
  const deadlineHours = input.quoteDeadlineHours;
  const vendorResponses = input.vendorResponseCount || 0;

  let score = 0;

  if (unread >= 3) score += 20;
  if (unread >= 7) score += 20;

  if (idleHours >= 12) score += 15;
  if (idleHours >= 24) score += 20;

  if (typeof deadlineHours === "number") {
    if (deadlineHours <= 24) score += 20;
    if (deadlineHours <= 6) score += 20;
  }

  if (vendorResponses === 0) score += 15;

  const level: ProcurementUrgencyLevel =
    score >= 75
      ? "critical"
      : score >= 50
      ? "high"
      : score >= 25
      ? "medium"
      : "low";

  return {
    score,
    level,
    needsEscalation: level === "high" || level === "critical",
  };
}

export async function notifyProcurementUrgency(input: {
  userId: string;
  title: string;
  body: string;
  url: string;
  rfqId?: string;
  score: number;
  level: ProcurementUrgencyLevel;
}) {
  if (!input.userId) return;

  await notifyUser(input.userId, {
    title: input.title,
    body: input.body,
    category:
      input.level === "critical"
        ? "procurement_alert"
        : "operational_alert",
    rfqId: input.rfqId,
    url: input.url,
    data: {
      source: "procurement_urgency_escalation",
      urgencyScore: String(input.score),
      urgencyLevel: input.level,
    },
  });
}