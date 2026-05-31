import { notifyUser } from "./notifyUser";

export type SupplyChainRiskState =
  | "stable"
  | "watch"
  | "disruption_risk"
  | "route_failure_risk"
  | "critical_supply_risk";

export function calculateSupplyChainRisk(input: {
  supplierDelays?: number;
  logisticsDelays?: number;
  routeFailures?: number;
  stockoutSignals?: number;
  deliveryFailures?: number;
  regionalDisruptions?: number;
  urgentUnfulfilledOrders?: number;
}) {
  let score = 0;

  score += Number(input.supplierDelays || 0) * 12;
  score += Number(input.logisticsDelays || 0) * 14;
  score += Number(input.routeFailures || 0) * 20;
  score += Number(input.stockoutSignals || 0) * 18;
  score += Number(input.deliveryFailures || 0) * 18;
  score += Number(input.regionalDisruptions || 0) * 16;
  score += Number(input.urgentUnfulfilledOrders || 0) * 15;

  const state: SupplyChainRiskState =
    score >= 130
      ? "critical_supply_risk"
      : score >= 95
      ? "route_failure_risk"
      : score >= 60
      ? "disruption_risk"
      : score >= 30
      ? "watch"
      : "stable";

  return {
    score,
    state,
    shouldAlert:
      state === "disruption_risk" ||
      state === "route_failure_risk" ||
      state === "critical_supply_risk",
  };
}

export function buildSupplyChainDirective(state: SupplyChainRiskState) {
  switch (state) {
    case "critical_supply_risk":
      return "Secure alternate suppliers and reroute urgent deliveries immediately.";
    case "route_failure_risk":
      return "Check delivery routes, supplier availability, and backup logistics.";
    case "disruption_risk":
      return "Monitor delayed supply chains and confirm fulfillment readiness.";
    case "watch":
      return "Watch supplier and logistics delays.";
    default:
      return "Supply chain stable.";
  }
}

export async function notifySupplyChainRisk(input: {
  userId: string;
  url: string;
  state: SupplyChainRiskState;
  score: number;
}) {
  if (!input.userId) return;

  await notifyUser(input.userId, {
    title:
      input.state === "critical_supply_risk"
        ? "Critical supply chain risk"
        : "Supply chain intelligence alert",
    body: buildSupplyChainDirective(input.state),
    category:
      input.state === "critical_supply_risk" ||
      input.state === "route_failure_risk"
        ? "procurement_alert"
        : "operational_alert",
    url: input.url,
    data: {
      source: "ai_autonomous_supply_chain_intelligence",
      supplyChainState: input.state,
      supplyChainScore: String(input.score),
      directive: buildSupplyChainDirective(input.state),
    },
  });
}