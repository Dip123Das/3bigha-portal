import { notifyUser } from "./notifyUser";

export type OperationalPriorityLevel =
  | "normal"
  | "important"
  | "urgent"
  | "critical";

export function calculateOperationalPriority(input: {
  urgencyScore?: number;
  unreadCount?: number;
  hoursIdle?: number;
  hasDeadlineRisk?: boolean;
  hasNoVendorResponse?: boolean;
  isHighValueWorkflow?: boolean;
}) {
  const urgencyScore = Number(input.urgencyScore || 0);
  const unreadCount = Number(input.unreadCount || 0);
  const hoursIdle = Number(input.hoursIdle || 0);

  let score = urgencyScore;

  if (unreadCount >= 3) score += 10;
  if (unreadCount >= 7) score += 15;

  if (hoursIdle >= 24) score += 15;
  if (hoursIdle >= 72) score += 20;

  if (input.hasDeadlineRisk) score += 20;
  if (input.hasNoVendorResponse) score += 15;
  if (input.isHighValueWorkflow) score += 10;

  const level: OperationalPriorityLevel =
    score >= 90
      ? "critical"
      : score >= 65
      ? "urgent"
      : score >= 35
      ? "important"
      : "normal";

  return {
    score,
    level,
    shouldSurface:
      level === "important" ||
      level === "urgent" ||
      level === "critical",
  };
}

export function buildPriorityAction(input: {
  level: OperationalPriorityLevel;
  module?: string;
}) {
  if (input.level === "critical") {
    return "Open now and take action immediately.";
  }

  if (input.level === "urgent") {
    return "Review this workflow and send a follow-up.";
  }

  if (input.level === "important") {
    return "Check this workflow when available.";
  }

  return "No immediate action needed.";
}

export async function notifyOperationalPriority(input: {
  userId: string;
  title: string;
  body: string;
  url: string;
  level: OperationalPriorityLevel;
  priorityScore: number;
  module?: string;
  rfqId?: string;
  conversationId?: string;
}) {
  if (!input.userId) return;

  await notifyUser(input.userId, {
    title: input.title,
    body: input.body,
    category:
      input.level === "critical" || input.level === "urgent"
        ? "procurement_alert"
        : "operational_alert",
    url: input.url,
    rfqId: input.rfqId,
    conversationId: input.conversationId,
    data: {
      source: "ai_operational_priority_engine",
      priorityLevel: input.level,
      priorityScore: String(input.priorityScore),
      module: input.module || "operations",
      recommendedAction: buildPriorityAction({
        level: input.level,
        module: input.module,
      }),
    },
  });
}