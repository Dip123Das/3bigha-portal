import { notifyUser } from "./notifyUser";

export type EconomicIntelligenceState =
  | "stable"
  | "watch"
  | "tightening"
  | "stress"
  | "shock_risk";

export function calculatePredictiveEconomicIntelligence(input: {
  demandGrowth?: number;
  supplierInstability?: number;
  shortageSignals?: number;
  costPressure?: number;
  delayedSupplyChains?: number;
  urgentDemandSpikes?: number;
  regionalMarketAnomalies?: number;
  failedProcurementAttempts?: number;
}) {
  const demandGrowth = Number(input.demandGrowth || 0);
  const supplierInstability = Number(input.supplierInstability || 0);
  const shortageSignals = Number(input.shortageSignals || 0);
  const costPressure = Number(input.costPressure || 0);
  const delayedSupplyChains = Number(input.delayedSupplyChains || 0);
  const urgentDemandSpikes = Number(input.urgentDemandSpikes || 0);
  const anomalies = Number(input.regionalMarketAnomalies || 0);
  const failedAttempts = Number(input.failedProcurementAttempts || 0);

  let score = 0;

  score += demandGrowth * 10;
  score += supplierInstability * 15;
  score += shortageSignals * 18;
  score += costPressure * 14;
  score += delayedSupplyChains * 12;
  score += urgentDemandSpikes * 16;
  score += anomalies * 18;
  score += failedAttempts * 10;

  const state: EconomicIntelligenceState =
    score >= 140
      ? "shock_risk"
      : score >= 100
      ? "stress"
      : score >= 70
      ? "tightening"
      : score >= 35
      ? "watch"
      : "stable";

  return {
    score,
    state,

    shouldAlert:
      state === "tightening" ||
      state === "stress" ||
      state === "shock_risk",
  };
}

export function buildEconomicIntelligenceDirective(
  state: EconomicIntelligenceState
) {
  switch (state) {
    case "shock_risk":
      return {
        title: "Market shock risk detected",

        body:
          "Procurement economy signals show serious shortage or cost pressure risk.",

        directive:
          "Secure critical materials, confirm supplier availability, and review price exposure.",
      };

    case "stress":
      return {
        title: "Procurement economy under stress",

        body:
          "Supplier, shortage, or cost-pressure signals are rising.",

        directive:
          "Prioritize urgent procurement and monitor supplier stability.",
      };

    case "tightening":
      return {
        title: "Market supply tightening",

        body:
          "Demand or supply signals suggest tighter procurement conditions ahead.",

        directive:
          "Review upcoming RFQs and secure quotations early.",
      };

    case "watch":
      return {
        title: "Market watch signal",

        body:
          "Some procurement market signals need monitoring.",

        directive:
          "Monitor demand, supplier response, and cost movement.",
      };

    default:
      return {
        title: "Procurement market stable",

        body:
          "No major economic stress signal detected.",

        directive:
          "Continue standard procurement monitoring.",
      };
  }
}

export async function notifyPredictiveEconomicIntelligence(input: {
  userId: string;

  url: string;

  state: EconomicIntelligenceState;

  score: number;
}) {
  if (!input.userId) return;

  const directive =
    buildEconomicIntelligenceDirective(
      input.state
    );

  await notifyUser(input.userId, {
    title: directive.title,

    body: directive.body,

    category:
      input.state === "shock_risk" ||
      input.state === "stress"
        ? "procurement_alert"
        : "operational_alert",

    url: input.url,

    data: {
      source:
        "ai_predictive_economic_intelligence",

      economicState:
        input.state,

      economicScore:
        String(input.score),

      directive:
        directive.directive,
    },
  });
}