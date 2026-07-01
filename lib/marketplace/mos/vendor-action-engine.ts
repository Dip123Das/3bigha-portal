import type { DemandAroundMe } from "./types";

export type VendorAction = {
  action_type: "respond" | "expand_coverage" | "update_inventory" | "boost_visibility" | "improve_profile";
  action_label: string;
  action_href: string;
  confidence: number;
  estimated_value: number;
  reason: string;
};

export function buildVendorAction(demandAroundMe: DemandAroundMe): VendorAction {
  const score = Number(demandAroundMe.opportunity?.score || 0);
  const activeRfqs = Number(demandAroundMe.demand?.todayRfqs || 0);
  const nearbyVendors = Number(demandAroundMe.supply?.nearbyVendors || 0);
  const estimatedMarketValue = Number(demandAroundMe.demand?.estimatedMarketValue || 0);

  if (activeRfqs > 0) {
    return {
      action_type: "respond",
      action_label: "View RFQs",
      action_href: "/dashboard/vendor/rfqs",
      confidence: Math.min(98, Math.max(65, score)),
      estimated_value: estimatedMarketValue,
      reason: "Active buyer demand is visible in your operating area.",
    };
  }

  if (nearbyVendors <= 5 && score >= 60) {
    return {
      action_type: "expand_coverage",
      action_label: "Expand Coverage",
      action_href: "/onboarding/business",
      confidence: Math.min(95, Math.max(60, score)),
      estimated_value: estimatedMarketValue,
      reason: "Low vendor competition is detected in this market.",
    };
  }

  if (score >= 65) {
    return {
      action_type: "update_inventory",
      action_label: "Update Inventory",
      action_href: "/dashboard/vendor/inventory",
      confidence: Math.min(92, Math.max(60, score)),
      estimated_value: estimatedMarketValue,
      reason: "Demand signals suggest this category may need fresher listings or stock visibility.",
    };
  }

  if (score >= 40) {
    return {
      action_type: "boost_visibility",
      action_label: "Boost Visibility",
      action_href: "/dashboard/subscription/boost",
      confidence: Math.min(85, Math.max(50, score)),
      estimated_value: estimatedMarketValue,
      reason: "Improving visibility may help capture upcoming marketplace demand.",
    };
  }

  return {
    action_type: "improve_profile",
    action_label: "Improve Profile",
    action_href: "/onboarding/business",
    confidence: 50,
    estimated_value: estimatedMarketValue,
    reason: "Complete profile, categories, coverage and listings so the system can match you better.",
  };
}
