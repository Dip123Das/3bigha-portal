export type WorkflowRecommendation = {
  id: string;
  label: string;
  description: string;
  href?: string;
  priority: "high" | "medium" | "low";
};

export function buildWorkflowRecommendations(input: {
  module?: string;
  hasRfqs?: boolean;
  hasQuotes?: boolean;
  hasVendors?: boolean;
  hasPriceData?: boolean;
  riskLevel?: string | null;
  urgency?: string | null;
}): WorkflowRecommendation[] {
  const recommendations: WorkflowRecommendation[] = [];

  recommendations.push({
    id: "search-marketplace",
    label: "Search Marketplace",
    description:
      "Explore vendors, materials, services and operational options.",
    href: "/search",
    priority: "medium",
  });

  if (!input.hasRfqs) {
    recommendations.push({
      id: "create-rfq",
      label: "Create RFQ",
      description:
        "Create clear requirement with quantity, location and timeline.",
      href: "/rfq",
      priority: "high",
    });
  }

  if (input.hasQuotes) {
    recommendations.push({
      id: "compare-quotes",
      label: "Compare Quotations",
      description:
        "Compare pricing, vendor reliability and execution readiness.",
      href: "/dashboard/buyer/rfqs",
      priority: "high",
    });
  }

  if (input.hasPriceData) {
    recommendations.push({
      id: "review-prices",
      label: "Review Market Prices",
      description:
        "Check market movement before supplier negotiation.",
      href: "/price-today",
      priority: "medium",
    });
  }

  if (input.riskLevel === "high") {
    recommendations.push({
      id: "reduce-risk",
      label: "Reduce Procurement Risk",
      description:
        "Verify supplier reliability and avoid operational delays.",
      href: "/dashboard/procurement-os",
      priority: "high",
    });
  }

  if (input.urgency === "high") {
    recommendations.push({
      id: "expedite-workflow",
      label: "Prioritize Execution",
      description:
        "Accelerate procurement coordination and supplier response.",
      href: "/dashboard/procurement-live",
      priority: "high",
    });
  }

  if (input.hasVendors) {
    recommendations.push({
      id: "vendor-followup",
      label: "Follow Up Vendors",
      description:
        "Maintain supplier communication and negotiation continuity.",
      href: "/dashboard/procurement-followup-agent",
      priority: "medium",
    });
  }

  return recommendations;
}
