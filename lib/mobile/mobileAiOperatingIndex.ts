import { notifyUser } from "./notifyUser";

export type MobileAiOperatingIndexState =
  | "healthy"
  | "active"
  | "attention"
  | "high_pressure"
  | "critical";

export function calculateMobileAiOperatingIndex(input: {
  notificationPressure?: number;
  procurementPressure?: number;
  dealRisk?: number;
  recoveryLoad?: number;
  supplyChainRisk?: number;
  economicStress?: number;
  governanceRisk?: number;
  battlefieldStress?: number;
}) {
  let score = 0;

  score += Number(input.notificationPressure || 0) * 6;
  score += Number(input.procurementPressure || 0) * 12;
  score += Number(input.dealRisk || 0) * 14;
  score += Number(input.recoveryLoad || 0) * 12;
  score += Number(input.supplyChainRisk || 0) * 14;
  score += Number(input.economicStress || 0) * 12;
  score += Number(input.governanceRisk || 0) * 18;
  score += Number(input.battlefieldStress || 0) * 16;

  const state: MobileAiOperatingIndexState =
    score >= 180
      ? "critical"
      : score >= 130
      ? "high_pressure"
      : score >= 80
      ? "attention"
      : score >= 35
      ? "active"
      : "healthy";

  return {
    score,
    state,
    shouldSurface:
      state === "attention" ||
      state === "high_pressure" ||
      state === "critical",
  };
}

export function buildMobileAiIndexDirective(
  state: MobileAiOperatingIndexState
) {
  switch (state) {
    case "critical":
      return "Open command center and resolve critical workflows first.";
    case "high_pressure":
      return "Review procurement, recovery, and supply-chain pressure.";
    case "attention":
      return "Check priority workflows and unread operational alerts.";
    case "active":
      return "Operations active. Monitor important updates.";
    default:
      return "Mobile AI operations healthy.";
  }
}

export async function notifyMobileAiOperatingIndex(input: {
  userId: string;
  url: string;
  state: MobileAiOperatingIndexState;
  score: number;
}) {
  if (!input.userId) return;

  await notifyUser(input.userId, {
    title: "3Bigha Mobile AI operating status",
    body: buildMobileAiIndexDirective(input.state),
    category:
      input.state === "critical" || input.state === "high_pressure"
        ? "procurement_alert"
        : "operational_alert",
    url: input.url,
    data: {
      source: "mobile_ai_operating_index",
      operatingState: input.state,
      operatingScore: String(input.score),
      directive: buildMobileAiIndexDirective(input.state),
    },
  });
}