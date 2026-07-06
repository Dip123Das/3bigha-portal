import {
  analyzeUnifiedMarketplaceIntent,
  type UnifiedMarketplaceModuleFilter,
} from "@/lib/search/unified-marketplace-brain";

export type ProcurementDecisionInsight = {
  show: boolean;
  title: string;
  readinessLabel: "Low" | "Medium" | "High" | "Very High";
  readinessScore: number;
  rfqSuccessProbability: number;
  complexity: "Low" | "Medium" | "High";
  responseSpeed: "Slow" | "Moderate" | "Fast";
  recommendedVendorCount: string;
  bestAction: string;
  bestActionHref: string;
  secondaryHref: string;
  signals: string[];
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function readinessLabel(score: number): ProcurementDecisionInsight["readinessLabel"] {
  if (score >= 85) return "Very High";
  if (score >= 68) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

export function buildProcurementDecisionInsight(input: {
  query: string;
  module: UnifiedMarketplaceModuleFilter;
  resultCount: number;
  vendorLiquidityScore?: number;
}): ProcurementDecisionInsight {
  const query = cleanText(input.query);
  const brain = analyzeUnifiedMarketplaceIntent(query);
  const clean = encodeURIComponent(query || "marketplace requirement");

  const module =
    input.module !== "all"
      ? input.module
      : brain.primaryModule !== "all"
        ? brain.primaryModule
        : "all";

  const workflowScore =
    (brain.wantsProcurement ? 20 : 0) +
    (brain.wantsRfq ? 14 : 0) +
    (brain.wantsVendor ? 12 : 0) +
    (brain.isBulk ? 12 : 0) +
    (brain.isUrgent ? 10 : 0) +
    (brain.quantityHint ? 8 : 0) +
    (brain.locationHint ? 6 : 0) +
    (brain.wantsPrice ? 5 : 0);

  const moduleScore =
    module === "materials"
      ? 18
      : module === "services"
        ? 16
        : module === "rentals"
          ? 13
          : module === "property"
            ? 10
            : 6;

  const resultScore = Math.min(18, input.resultCount * 1.3);
  const liquidityScore = Math.min(18, Math.max(0, (input.vendorLiquidityScore || 0) / 5));

  const readinessScore = clamp(30 + workflowScore + moduleScore + resultScore + liquidityScore);
  const rfqSuccessProbability = clamp(readinessScore - 4 + (brain.isUrgent ? 3 : 0));
  const complexity: ProcurementDecisionInsight["complexity"] =
    module === "property" || query.toLowerCase().includes("construction")
      ? "High"
      : brain.isBulk || brain.wantsProcurement
        ? "Medium"
        : "Low";

  const responseSpeed: ProcurementDecisionInsight["responseSpeed"] =
    readinessScore >= 78 ? "Fast" : readinessScore >= 55 ? "Moderate" : "Slow";

  const recommendedVendorCount =
    readinessScore >= 85 ? "8–12" : readinessScore >= 68 ? "6–10" : readinessScore >= 45 ? "4–6" : "3–5";

  const signals: string[] = [];
  if (brain.quantityHint) signals.push(`Quantity detected: ${brain.quantityHint}`);
  if (brain.locationHint) signals.push(`Location detected: ${brain.locationHint}`);
  if (brain.wantsProcurement) signals.push("Procurement intent");
  if (brain.wantsRfq) signals.push("RFQ-ready search");
  if (brain.isUrgent) signals.push("Urgency risk");
  if (brain.wantsVendor) signals.push("Vendor sourcing");
  if (brain.wantsPrice) signals.push("Price validation needed");

  const bestAction =
    readinessScore >= 68
      ? "Create RFQ now"
      : module === "property"
        ? "Plan next workflow"
        : "Discover vendors first";

  const bestActionHref =
    readinessScore >= 68
      ? `/rfq?query=${clean}${module !== "all" ? `&module=${encodeURIComponent(module)}` : ""}`
      : module === "property"
        ? `/house-construction-cost?location=${encodeURIComponent(brain.locationHint || "")}`
        : `/vendor/discovery?q=${clean}${module !== "all" ? `&module=${encodeURIComponent(module)}` : ""}`;

  return {
    show: Boolean(query),
    title:
      readinessScore >= 85
        ? "Procurement readiness is very high"
        : readinessScore >= 68
          ? "Procurement opportunity looks strong"
          : readinessScore >= 45
            ? "Procurement workflow can be improved"
            : "More details will improve procurement success",
    readinessLabel: readinessLabel(readinessScore),
    readinessScore,
    rfqSuccessProbability,
    complexity,
    responseSpeed,
    recommendedVendorCount,
    bestAction,
    bestActionHref,
    secondaryHref: `/vendor/discovery?q=${clean}${module !== "all" ? `&module=${encodeURIComponent(module)}` : ""}`,
    signals: signals.length ? signals.slice(0, 6) : ["Marketplace intent", "Workflow continuation", "Vendor discovery"],
  };
}