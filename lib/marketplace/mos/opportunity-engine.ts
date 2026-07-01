export type MosOpportunity = {
  rank: number;
  type: "rfq" | "listing" | "coverage" | "boost" | "pricing" | "profile";
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  score: number;
  actionLabel: string;
  actionHref: string;
};

function priorityFromScore(score: number): MosOpportunity["priority"] {
  if (score >= 85) return "urgent";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function buildMosOpportunities(input: {
  activeRfqs: number;
  todayRfqs: number;
  activeBuyers: number;
  estimatedMarketValue: number;
  fastestGrowingCategory?: string;
  opportunityScore: number;
  nearbyVendors: number;
}) {
  const opportunities: Omit<MosOpportunity, "rank">[] = [];

  if (input.activeRfqs > 0) {
    const score = Math.min(100, input.opportunityScore + input.todayRfqs * 5);
    opportunities.push({
      type: "rfq",
      title: "Respond to active RFQs",
      description: `${input.activeRfqs} active RFQ demand signals are visible in your operating geography.`,
      priority: priorityFromScore(score),
      score,
      actionLabel: "View RFQs",
      actionHref: "/dashboard/vendor/rfqs",
    });
  }

  if (input.fastestGrowingCategory) {
    const score = Math.min(100, 50 + input.activeRfqs * 6);
    opportunities.push({
      type: "listing",
      title: `Strengthen ${input.fastestGrowingCategory} listings`,
      description: `Demand activity is strongest in ${input.fastestGrowingCategory}. Update inventory, pricing, and availability.`,
      priority: priorityFromScore(score),
      score,
      actionLabel: "Update Listings",
      actionHref: "/dashboard/vendor/inventory",
    });
  }

  if (input.nearbyVendors <= 5 && input.activeRfqs > 0) {
    const score = Math.min(100, 75 + input.activeRfqs * 3);
    opportunities.push({
      type: "coverage",
      title: "Low competition opportunity",
      description: "Demand exists in your geography while vendor competition is still low.",
      priority: priorityFromScore(score),
      score,
      actionLabel: "Expand Coverage",
      actionHref: "/onboarding/business",
    });
  }

  if (input.activeRfqs > 0 && input.estimatedMarketValue > 0) {
    const score = Math.min(100, 55 + Math.round(input.estimatedMarketValue / 100000));
    opportunities.push({
      type: "pricing",
      title: "Review pricing for current demand",
      description: `Visible RFQ value is approximately ₹${Math.round(input.estimatedMarketValue).toLocaleString("en-IN")}. Keep pricing competitive.`,
      priority: priorityFromScore(score),
      score,
      actionLabel: "Update Prices",
      actionHref: "/vendor/price-updates/new",
    });
  }

  if (input.activeRfqs > 0) {
    const score = Math.min(100, 45 + input.activeBuyers * 5);
    opportunities.push({
      type: "boost",
      title: "Improve visibility for active buyers",
      description: `${input.activeBuyers} active buyers are visible in this market. Boosting can improve RFQ visibility.`,
      priority: priorityFromScore(score),
      score,
      actionLabel: "Boost Visibility",
      actionHref: "/dashboard/subscription/boost",
    });
  }

  if (opportunities.length === 0) {
    opportunities.push({
      type: "profile",
      title: "Prepare for upcoming demand",
      description: "Keep your profile, categories, inventory, and pricing ready so the system can match you when demand rises.",
      priority: "medium",
      score: 40,
      actionLabel: "Improve Profile",
      actionHref: "/onboarding/business",
    });
  }

  return opportunities
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
}
