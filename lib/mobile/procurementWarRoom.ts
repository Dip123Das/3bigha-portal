import { notifyUser } from "./notifyUser";

export type WarRoomThreatLevel =
  | "stable"
  | "elevated"
  | "high_alert"
  | "critical_alert";

export function calculateWarRoomThreat(input: {
  stalledProcurements?: number;
  supplierCollapseRisks?: number;
  criticalDeadlines?: number;
  delayedVendorResponses?: number;
  failedNegotiations?: number;
  unreadOperationalAlerts?: number;
  activeCrises?: number;
}) {
  const stalled = Number(input.stalledProcurements || 0);
  const supplierRisks = Number(input.supplierCollapseRisks || 0);
  const deadlines = Number(input.criticalDeadlines || 0);
  const delayedResponses = Number(input.delayedVendorResponses || 0);
  const failedNegotiations = Number(input.failedNegotiations || 0);
  const unread = Number(input.unreadOperationalAlerts || 0);
  const crises = Number(input.activeCrises || 0);

  let score = 0;

  score += stalled * 10;
  score += supplierRisks * 18;
  score += deadlines * 15;
  score += delayedResponses * 10;
  score += failedNegotiations * 15;
  score += crises * 25;

  if (unread >= 5) score += 10;
  if (unread >= 15) score += 20;

  const level: WarRoomThreatLevel =
    score >= 100
      ? "critical_alert"
      : score >= 70
      ? "high_alert"
      : score >= 35
      ? "elevated"
      : "stable";

  return {
    score,
    level,

    requiresWarRoom:
      level === "elevated" ||
      level === "high_alert" ||
      level === "critical_alert",
  };
}

export function buildWarRoomDirective(
  level: WarRoomThreatLevel
) {
  switch (level) {
    case "critical_alert":
      return {
        title: "Critical procurement war-room alert",

        body:
          "Major operational procurement risks detected across workflows.",

        directive:
          "Open procurement war room immediately and resolve critical bottlenecks.",
      };

    case "high_alert":
      return {
        title: "High procurement alert",

        body:
          "Several workflows are approaching operational failure.",

        directive:
          "Prioritize delayed negotiations and supplier response recovery.",
      };

    case "elevated":
      return {
        title: "Operational procurement pressure detected",

        body:
          "Some workflows require active monitoring and follow-up.",

        directive:
          "Review stalled workflows before escalation increases.",
      };

    default:
      return {
        title: "Procurement operations stable",

        body:
          "No major procurement threats currently detected.",

        directive:
          "Continue normal operational monitoring.",
      };
  }
}

export async function notifyWarRoomThreat(input: {
  userId: string;

  url: string;

  level: WarRoomThreatLevel;

  score: number;
}) {
  if (!input.userId) return;

  const directive =
    buildWarRoomDirective(
      input.level
    );

  await notifyUser(input.userId, {
    title: directive.title,

    body: directive.body,

    category:
      input.level ===
        "critical_alert" ||
      input.level ===
        "high_alert"
        ? "procurement_alert"
        : "operational_alert",

    url: input.url,

    data: {
      source:
        "ai_procurement_war_room",

      warRoomLevel:
        input.level,

      warRoomScore:
        String(input.score),

      directive:
        directive.directive,
    },
  });
}