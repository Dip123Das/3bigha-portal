import { analyzeGap } from "./gap-analysis-engine";

export type OpportunityPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type OpportunityKind =
  | "high_opportunity"
  | "vendor_shortage"
  | "oversupplied"
  | "balanced"
  | "watch";

export interface OpportunitySignal {
  demand: number;
  supply: number;
  gap: number;
  opportunityScore: number;
  classification:
    | "underserved"
    | "balanced"
    | "oversupplied";
  priority: OpportunityPriority;
  kind: OpportunityKind;
  recommendation: string;
}

function resolvePriority(score: number): OpportunityPriority {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function resolveKind(input: {
  demand: number;
  supply: number;
  gap: number;
}): OpportunityKind {
  if (input.demand >= 60 && input.supply <= 30) {
    return "high_opportunity";
  }

  if (input.supply <= 20 && input.demand >= 30) {
    return "vendor_shortage";
  }

  if (input.supply - input.demand >= 30) {
    return "oversupplied";
  }

  if (Math.abs(input.gap) <= 20) {
    return "balanced";
  }

  return "watch";
}

function recommendationFor(kind: OpportunityKind): string {
  switch (kind) {
    case "high_opportunity":
      return "Recruit vendors, expand inventory, and improve RFQ routing in this geography.";
    case "vendor_shortage":
      return "Prioritize vendor onboarding and expand matching radius for new RFQs.";
    case "oversupplied":
      return "Avoid aggressive vendor recruitment; focus on conversion, quality, and differentiation.";
    case "balanced":
      return "Maintain marketplace coverage and monitor momentum.";
    default:
      return "Watch this market for early demand or supply movement.";
  }
}

export function buildOpportunitySignal(
  demand: number,
  supply: number
): OpportunitySignal {
  const gap = analyzeGap(demand, supply);

  const priority = resolvePriority(gap.opportunityScore);

  const kind = resolveKind({
    demand: gap.demand,
    supply: gap.supply,
    gap: gap.gap,
  });

  return {
    ...gap,
    priority,
    kind,
    recommendation: recommendationFor(kind),
  };
}
