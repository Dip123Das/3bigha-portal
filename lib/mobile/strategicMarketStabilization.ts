import { notifyUser } from "./notifyUser";

export type MarketStabilizationState =
  | "balanced"
  | "adaptive_balance"
  | "stress_balancing"
  | "stabilization_required"
  | "market_protection_mode";

export function calculateStrategicMarketStabilization(input: {
  procurementCongestion?: number;
  supplierFailures?: number;
  delayedFulfillment?: number;
  ecosystemStress?: number;
  recoveryPressure?: number;
  shortageClusters?: number;
  operationalImbalance?: number;
  crisisLoad?: number;
}) {
  const congestion =
    Number(input.procurementCongestion || 0);

  const supplierFailures =
    Number(input.supplierFailures || 0);

  const delayedFulfillment =
    Number(input.delayedFulfillment || 0);

  const ecosystemStress =
    Number(input.ecosystemStress || 0);

  const recoveryPressure =
    Number(input.recoveryPressure || 0);

  const shortageClusters =
    Number(input.shortageClusters || 0);

  const imbalance =
    Number(input.operationalImbalance || 0);

  const crisisLoad =
    Number(input.crisisLoad || 0);

  let score = 0;

  score += congestion * 12;

  score += supplierFailures * 18;

  score += delayedFulfillment * 14;

  score += ecosystemStress * 16;

  score += recoveryPressure * 12;

  score += shortageClusters * 20;

  score += imbalance * 15;

  score += crisisLoad * 28;

  const state: MarketStabilizationState =
    score >= 160
      ? "market_protection_mode"
      : score >= 120
      ? "stabilization_required"
      : score >= 80
      ? "stress_balancing"
      : score >= 40
      ? "adaptive_balance"
      : "balanced";

  return {
    score,

    state,

    requiresStabilization:
      state === "stress_balancing" ||
      state === "stabilization_required" ||
      state === "market_protection_mode",
  };
}

export function buildStrategicStabilizationDirective(
  state: MarketStabilizationState
) {
  switch (state) {
    case "market_protection_mode":
      return {
        title:
          "Marketplace protection mode activated",

        body:
          "Critical ecosystem instability detected across procurement operations.",

        directive:
          "Activate emergency stabilization governance and redistribute procurement load immediately.",
      };

    case "stabilization_required":
      return {
        title:
          "Strategic procurement stabilization required",

        body:
          "Marketplace procurement systems are showing severe imbalance.",

        directive:
          "Reduce bottlenecks, stabilize supplier coordination, and prioritize critical recovery chains.",
      };

    case "stress_balancing":
      return {
        title:
          "Operational balancing required",

        body:
          "Procurement ecosystem pressure is increasing across workflows.",

        directive:
          "Monitor congestion, supplier stress, and delayed procurement fulfillment.",
      };

    case "adaptive_balance":
      return {
        title:
          "Marketplace balancing adaptively",

        body:
          "Operational systems are dynamically stabilizing workflow activity.",

        directive:
          "Continue adaptive monitoring and supplier coordination.",
      };

    default:
      return {
        title:
          "Marketplace operational balance healthy",

        body:
          "Marketplace procurement systems currently stable.",

        directive:
          "Continue standard operational monitoring.",
      };
  }
}

export async function notifyStrategicMarketStabilization(input: {
  userId: string;

  url: string;

  state: MarketStabilizationState;

  score: number;
}) {
  if (!input.userId) return;

  const directive =
    buildStrategicStabilizationDirective(
      input.state
    );

  await notifyUser(input.userId, {
    title: directive.title,

    body: directive.body,

    category:
      input.state ===
        "market_protection_mode" ||
      input.state ===
        "stabilization_required"
        ? "procurement_alert"
        : "operational_alert",

    url: input.url,

    data: {
      source:
        "ai_strategic_market_stabilization",

      stabilizationState:
        input.state,

      stabilizationScore:
        String(input.score),

      directive:
        directive.directive,
    },
  });
}