export function buildAiAssistant(result: any) {
  const intelligence = result?.intelligence || {};

  const vendorDiscovery = intelligence.vendorDiscovery;
  const procurementGraph = intelligence.procurementGraph;
  const smartDecision = intelligence.smartDecision;
  const pricePrediction = intelligence.pricePrediction;
  const rfqIntelligence = intelligence.rfqIntelligence;
  const quoteRisk = intelligence.quoteRisk;

  const summary =
    vendorDiscovery?.summary ||
    procurementGraph?.summary ||
    smartDecision?.summary ||
    "Operational marketplace guidance prepared successfully.";

  const nextActions = [
    "Compare vendors and pricing carefully",
    "Create clear RFQ with quantity, location and timeline",
    "Review market price trend before negotiation",
    "Prefer verified vendors with strong operational signals",
  ];

  if (quoteRisk?.riskLevel === "high") {
    nextActions.unshift(
      "Review quotation risk and verify supplier reliability"
    );
  }

  if (rfqIntelligence?.urgency === "high") {
    nextActions.unshift(
      "Prioritize vendor response and procurement execution"
    );
  }

  return {
    summary,

    recommendedVendors:
      vendorDiscovery?.recommendedVendors?.slice?.(0, 5) || [],

    procurementGraph,

    smartDecision,

    pricePrediction,

    rfqIntelligence,

    quoteRisk,

    nextActions,
  };
}
