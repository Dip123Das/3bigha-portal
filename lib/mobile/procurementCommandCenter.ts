import { notifyUser } from "./notifyUser";

export type CommandCenterStatus =
  | "calm"
  | "attention"
  | "pressure"
  | "crisis";

export function calculateProcurementCommandStatus(input: {
  activeWorkflows?: number;
  urgentWorkflows?: number;
  criticalWorkflows?: number;
  stalledWorkflows?: number;
  highRiskDeals?: number;
  unreadOperationalUpdates?: number;
}) {
  const active = Number(input.activeWorkflows || 0);
  const urgent = Number(input.urgentWorkflows || 0);
  const critical = Number(input.criticalWorkflows || 0);
  const stalled = Number(input.stalledWorkflows || 0);
  const highRiskDeals = Number(input.highRiskDeals || 0);
  const unread = Number(input.unreadOperationalUpdates || 0);

  let score = 0;

  score += urgent * 12;
  score += critical * 25;
  score += stalled * 10;
  score += highRiskDeals * 15;

  if (unread >= 5) score += 10;
  if (unread >= 15) score += 20;

  if (active >= 10) score += 10;

  const status: CommandCenterStatus =
    score >= 90
      ? "crisis"
      : score >= 60
      ? "pressure"
      : score >= 30
      ? "attention"
      : "calm";

  return {
    score,
    status,
    shouldNotify:
      status === "attention" ||
      status === "pressure" ||
      status === "crisis",
  };
}

export function buildCommandCenterBrief(status: CommandCenterStatus) {
  switch (status) {
    case "crisis":
      return {
        title: "Procurement crisis detected",
        body: "Multiple workflows need immediate attention. Open command center now.",
        action: "Open command center and resolve critical workflows first.",
      };

    case "pressure":
      return {
        title: "Procurement pressure rising",
        body: "Several workflows are becoming urgent. Review priorities now.",
        action: "Review urgent workflows and send follow-ups.",
      };

    case "attention":
      return {
        title: "Procurement attention needed",
        body: "Some workflows need review before they become urgent.",
        action: "Check pending RFQs and unread operational updates.",
      };

    default:
      return {
        title: "Procurement operations calm",
        body: "No urgent procurement pressure detected.",
        action: "Continue normal operations.",
      };
  }
}

export async function notifyCommandCenterStatus(input: {
  userId: string;
  url: string;
  status: CommandCenterStatus;
  score: number;
}) {
  if (!input.userId) return;

  const brief = buildCommandCenterBrief(input.status);

  await notifyUser(input.userId, {
    title: brief.title,
    body: brief.body,
    category:
      input.status === "crisis" || input.status === "pressure"
        ? "procurement_alert"
        : "operational_alert",
    url: input.url,
    data: {
      source: "ai_procurement_command_center",
      commandStatus: input.status,
      commandScore: String(input.score),
      recommendedAction: brief.action,
    },
  });
}