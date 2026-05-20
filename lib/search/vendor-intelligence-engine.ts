import {
  analyzeUnifiedMarketplaceIntent,
  type UnifiedMarketplaceModuleFilter,
} from "@/lib/search/unified-marketplace-brain";

export type VendorIntelligenceInsight = {
  show: boolean;
  title: string;
  subtitle: string;
  qualityScore: number;
  reliabilityLabel: "Starter" | "Good" | "Strong" | "Excellent";
  bestVendorType: string;
  responseConfidence: "Low" | "Medium" | "High" | "Very High";
  procurementFit: string;
  localityStrength: string;
  badges: string[];
  vendorHref: string;
  rfqHref: string;
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function reliabilityLabel(score: number): VendorIntelligenceInsight["reliabilityLabel"] {
  if (score >= 86) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 48) return "Good";
  return "Starter";
}

function responseConfidence(score: number): VendorIntelligenceInsight["responseConfidence"] {
  if (score >= 86) return "Very High";
  if (score >= 70) return "High";
  if (score >= 48) return "Medium";
  return "Low";
}

export function buildVendorIntelligenceInsight(input: {
  query: string;
  module: UnifiedMarketplaceModuleFilter;
  resultCount: number;
  liquidityScore?: number;
  procurementReadinessScore?: number;
}): VendorIntelligenceInsight {
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
    (brain.wantsVendor ? 16 : 0) +
    (brain.wantsProcurement ? 16 : 0) +
    (brain.wantsRfq ? 10 : 0) +
    (brain.isBulk ? 10 : 0) +
    (brain.isUrgent ? 8 : 0) +
    (brain.locationHint ? 8 : 0) +
    (brain.wantsNearby ? 7 : 0);

  const moduleScore =
    module === "materials"
      ? 18
      : module === "services"
        ? 16
        : module === "rentals"
          ? 13
          : module === "property"
            ? 9
            : 6;

  const resultScore = Math.min(14, input.resultCount * 1.1);
  const liquidityContribution = Math.min(18, Math.max(0, (input.liquidityScore || 0) / 5));
  const readinessContribution = Math.min(14, Math.max(0, (input.procurementReadinessScore || 0) / 7));

  const qualityScore = clamp(
    32 + workflowScore + moduleScore + resultScore + liquidityContribution + readinessContribution
  );

  const bestVendorType =
    module === "materials"
      ? brain.isBulk || brain.wantsProcurement
        ? "Bulk material supplier"
        : "Local material dealer"
      : module === "services"
        ? brain.isUrgent
          ? "Fast-response contractor"
          : "Verified service provider"
        : module === "rentals"
          ? "Equipment rental operator"
          : module === "property"
            ? "Local property consultant"
            : "Marketplace vendor";

  const procurementFit =
    qualityScore >= 86
      ? "Best suited for direct RFQ routing"
      : qualityScore >= 70
        ? "Good fit for vendor discovery and RFQ"
        : qualityScore >= 48
          ? "Use discovery before final RFQ"
          : "More details needed for better vendor matching";

  const localityStrength =
    brain.locationHint || brain.wantsNearby
      ? "Locality signal available"
      : "Add locality for stronger vendor matching";

  const badges: string[] = [];
  if (brain.isBulk) badges.push("Bulk capable");
  if (brain.isUrgent) badges.push("Fast response needed");
  if (brain.wantsProcurement) badges.push("Procurement fit");
  if (brain.wantsVendor) badges.push("Vendor sourcing");
  if (brain.locationHint) badges.push(`Area: ${brain.locationHint}`);
  if (module !== "all") badges.push(`${module} specialist`);

  return {
    show: Boolean(query && (module !== "property" || brain.wantsVendor || brain.wantsInvestment || input.resultCount > 0)),
    title:
      qualityScore >= 86
        ? "Excellent vendor intelligence match"
        : qualityScore >= 70
          ? "Strong vendor intelligence match"
          : qualityScore >= 48
            ? "Vendor intelligence available"
            : "Vendor discovery can be improved",
    subtitle:
      "3Bigha is estimating vendor quality, RFQ responsiveness, locality strength and procurement suitability for this search.",
    qualityScore,
    reliabilityLabel: reliabilityLabel(qualityScore),
    bestVendorType,
    responseConfidence: responseConfidence(qualityScore),
    procurementFit,
    localityStrength,
    badges: badges.length ? badges.slice(0, 6) : ["Vendor discovery", "RFQ routing", "Marketplace intelligence"],
    vendorHref: `/vendor/discovery?q=${clean}${module !== "all" ? `&module=${encodeURIComponent(module)}` : ""}`,
    rfqHref: `/rfq/general/new?query=${clean}${module !== "all" ? `&module=${encodeURIComponent(module)}` : ""}`,
  };
}