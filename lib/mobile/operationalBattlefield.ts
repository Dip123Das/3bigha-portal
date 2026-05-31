import { notifyUser } from "./notifyUser";

export type OperationalBattlefieldPulse =
  | "normal"
  | "active"
  | "strained"
  | "unstable"
  | "critical";

export function calculateOperationalBattlefieldPulse(input: {
  liveEvents?: number;
  anomalyEvents?: number;
  delayedActions?: number;
  failedActions?: number;
  urgentNotifications?: number;
  activeProcurementCrises?: number;
  supplierStressEvents?: number;
  workflowRecoveryEvents?: number;
}) {
  const live = Number(input.liveEvents || 0);
  const anomalies = Number(input.anomalyEvents || 0);
  const delayed = Number(input.delayedActions || 0);
  const failed = Number(input.failedActions || 0);
  const urgent = Number(input.urgentNotifications || 0);
  const crises = Number(input.activeProcurementCrises || 0);
  const supplierStress = Number(input.supplierStressEvents || 0);
  const recovery = Number(input.workflowRecoveryEvents || 0);

  let score = 0;

  score += anomalies * 15;
  score += delayed * 8;
  score += failed * 18;
  score += urgent * 10;
  score += crises * 25;
  score += supplierStress * 12;
  score += recovery * 8;

  if (live >= 20) score += 10;
  if (live >= 50) score += 20;

  const pulse: OperationalBattlefieldPulse =
    score >= 120
      ? "critical"
      : score >= 85
      ? "unstable"
      : score >= 55
      ? "strained"
      : score >= 25
      ? "active"
      : "normal";

  return {
    score,
    pulse,

    needsAttention:
      pulse === "strained" ||
      pulse === "unstable" ||
      pulse === "critical",
  };
}

export function buildBattlefieldPulseBrief(
  pulse: OperationalBattlefieldPulse
) {
  switch (pulse) {
    case "critical":
      return {
        title: "Critical operational battlefield alert",
        body: "Multiple operational systems are under pressure. Immediate review recommended.",
        action: "Open operational command center and resolve critical alerts first.",
      };

    case "unstable":
      return {
        title: "Operational battlefield unstable",
        body: "Procurement and workflow activity show serious stress signals.",
        action: "Review delayed actions, failed workflows, and supplier stress.",
      };

    case "strained":
      return {
        title: "Operational pressure detected",
        body: "Several workflows may need active coordination.",
        action: "Check urgent notifications and recovery workflows.",
      };

    case "active":
      return {
        title: "Operations active",
        body: "Multiple live workflows are currently active.",
        action: "Monitor activity and respond to priority updates.",
      };

    default:
      return {
        title: "Operations normal",
        body: "No major operational stress detected.",
        action: "Continue normal monitoring.",
      };
  }
}

export async function notifyOperationalBattlefieldPulse(input: {
  userId: string;
  url: string;
  pulse: OperationalBattlefieldPulse;
  score: number;
}) {
  if (!input.userId) return;

  const brief = buildBattlefieldPulseBrief(input.pulse);

  await notifyUser(input.userId, {
    title: brief.title,
    body: brief.body,
    category:
      input.pulse === "critical" ||
      input.pulse === "unstable"
        ? "procurement_alert"
        : "operational_alert",
    url: input.url,
    data: {
      source: "ai_operational_battlefield_engine",
      battlefieldPulse: input.pulse,
      battlefieldScore: String(input.score),
      recommendedAction: brief.action,
    },
  });
}