import { notifyUser } from "./notifyUser";

export type MarketOperatingState =
  | "optimized"
  | "adaptive"
  | "imbalanced"
  | "stressed"
  | "systemic_risk";

export function calculateAutonomousMarketState(input: {
  procurementPressure?: number;
  supplierStress?: number;
  workflowFailures?: number;
  recoveryLoad?: number;
  activeCrises?: number;
  delayedNegotiations?: number;
  marketAnomalies?: number;
  operationalLoad?: number;
}) {
  const procurementPressure =
    Number(input.procurementPressure || 0);

  const supplierStress =
    Number(input.supplierStress || 0);

  const workflowFailures =
    Number(input.workflowFailures || 0);

  const recoveryLoad =
    Number(input.recoveryLoad || 0);

  const crises =
    Number(input.activeCrises || 0);

  const delayedNegotiations =
    Number(input.delayedNegotiations || 0);

  const anomalies =
    Number(input.marketAnomalies || 0);

  const operationalLoad =
    Number(input.operationalLoad || 0);

  let score = 0;

  score += procurementPressure * 12;

  score += supplierStress * 14;

  score += workflowFailures * 18;

  score += recoveryLoad * 10;

  score += crises * 28;

  score += delayedNegotiations * 12;

  score += anomalies * 20;

  if (operationalLoad >= 50) {
    score += 10;
  }

  if (operationalLoad >= 100) {
    score += 20;
  }

  const state: MarketOperatingState =
    score >= 150
      ? "systemic_risk"
      : score >= 110
      ? "stressed"
      : score >= 75
      ? "imbalanced"
      : score >= 35
      ? "adaptive"
      : "optimized";

  return {
    score,

    state,

    requiresGovernance:
      state === "imbalanced" ||
      state === "stressed" ||
      state === "systemic_risk",
  };
}

export function buildMarketOperatingDirective(
  state: MarketOperatingState
) {
  switch (state) {
    case "systemic_risk":
      return {
        title:
          "Systemic operational market risk detected",

        body:
          "Marketplace-wide procurement instability requires immediate intervention.",

        directive:
          "Activate autonomous recovery governance and stabilize critical procurement chains.",
      };

    case "stressed":
      return {
        title:
          "Operational market stress increasing",

        body:
          "Procurement ecosystem pressure is rising across workflows and suppliers.",

        directive:
          "Rebalance procurement load and reduce operational bottlenecks.",
      };

    case "imbalanced":
      return {
        title:
          "Marketplace operational imbalance detected",

        body:
          "Some procurement systems require adaptive coordination.",

        directive:
          "Monitor delayed negotiations and supplier recovery pipelines.",
      };

    case "adaptive":
      return {
        title:
          "Marketplace operating adaptively",

        body:
          "Operational systems are dynamically adjusting to workflow pressure.",

        directive:
          "Continue active operational monitoring.",
      };

    default:
      return {
        title:
          "Marketplace operating optimally",

        body:
          "Operational marketplace systems healthy and balanced.",

        directive:
          "Continue standard marketplace monitoring.",
      };
  }
}

export async function notifyAutonomousMarketState(input: {
  userId: string;

  url: string;

  state: MarketOperatingState;

  score: number;
}) {
  if (!input.userId) return;

  const directive =
    buildMarketOperatingDirective(
      input.state
    );

  await notifyUser(input.userId, {
    title: directive.title,

    body: directive.body,

    category:
      input.state === "systemic_risk" ||
      input.state === "stressed"
        ? "procurement_alert"
        : "operational_alert",

    url: input.url,

    data: {
      source:
        "ai_autonomous_market_os",

      marketState:
        input.state,

      marketScore:
        String(input.score),

      directive:
        directive.directive,
    },
  });
}