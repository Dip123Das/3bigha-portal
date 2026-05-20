import {
  analyzeUnifiedMarketplaceIntent,
  type UnifiedMarketplaceModuleFilter,
} from "@/lib/search/unified-marketplace-brain";

export type VendorNegotiationInsight = {
  show: boolean;
  title: string;
  subtitle: string;
  negotiationScore: number;
  negotiationLabel: "Low" | "Medium" | "High" | "Very High";
  rfqAcceptanceLikelihood: number;
  procurementRisk: "Low" | "Medium" | "High";
  bestStrategy: string;
  recommendedVendorType: string;
  priceStrategy: string;
  chips: string[];
  rfqHref: string;
  vendorHref: string;
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function negotiationLabel(score: number): VendorNegotiationInsight["negotiationLabel"] {
  if (score >= 85) return "Very High";
  if (score >= 68) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

export function buildVendorNegotiationInsight(input: {
  query: string;
  module: UnifiedMarketplaceModuleFilter;
  resultCount: number;
  vendorLiquidityScore?: number;
  procurementReadinessScore?: number;
  vendorQualityScore?: number;
}): VendorNegotiationInsight {
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
    (brain.wantsProcurement ? 16 : 0) +
    (brain.wantsVendor ? 14 : 0) +
    (brain.wantsRfq ? 12 : 0) +
    (brain.isBulk ? 12 : 0) +
    (brain.wantsPrice ? 10 : 0) +
    (brain.quantityHint ? 8 : 0) +
    (brain.locationHint ? 6 : 0) +
    (brain.isUrgent ? 5 : 0);

  const moduleScore =
    module === "materials"
      ? 18
      : module === "services"
        ? 15
        : module === "rentals"
          ? 12
          : module === "property"
            ? 8
            : 5;

  const marketScore = Math.min(14, input.resultCount * 1.1);
  const liquidityScore = Math.min(16, Math.max(0, (input.vendorLiquidityScore || 0) / 6));
  const readinessScore = Math.min(14, Math.max(0, (input.procurementReadinessScore || 0) / 7));
  const qualityScore = Math.min(14, Math.max(0, (input.vendorQualityScore || 0) / 7));

  const negotiationScore = clamp(
    28 + workflowScore + moduleScore + marketScore + liquidityScore + readinessScore + qualityScore
  );

  const rfqAcceptanceLikelihood = clamp(
    negotiationScore - 3 + (brain.isBulk ? 4 : 0) + (brain.locationHint ? 3 : 0)
  );

  const procurementRisk: VendorNegotiationInsight["procurementRisk"] =
    negotiationScore >= 72 ? "Low" : negotiationScore >= 48 ? "Medium" : "High";

  const recommendedVendorType =
    module === "materials"
      ? brain.isBulk
        ? "Bulk supplier with price negotiation"
        : "Local dealer with stock confirmation"
      : module === "services"
        ? brain.isUrgent
          ? "Fast-response contractor"
          : "Verified service provider"
        : module === "rentals"
          ? "Equipment operator with availability confirmation"
          : "Local marketplace vendor";

  const bestStrategy =
    negotiationScore >= 85
      ? "Send RFQ to multiple vendors and negotiate bulk terms."
      : negotiationScore >= 68
        ? "Start vendor discovery, then send RFQ to shortlisted vendors."
        : negotiationScore >= 45
          ? "Add quantity, location and timeline before negotiation."
          : "Improve search details before starting vendor negotiation.";

  const priceStrategy =
    brain.wantsPrice || module === "materials"
      ? "Check Price Today before final negotiation."
      : brain.isBulk
        ? "Ask for slab pricing and delivery terms."
        : "Compare at least 3 vendor responses.";

  const chips: string[] = [];
  if (brain.quantityHint) chips.push(`Qty: ${brain.quantityHint}`);
  if (brain.locationHint) chips.push(`Area: ${brain.locationHint}`);
  if (brain.isBulk) chips.push("Bulk negotiation");
  if (brain.wantsPrice) chips.push("Price-sensitive");
  if (brain.isUrgent) chips.push("Urgent response");
  if (brain.wantsVendor) chips.push("Vendor sourcing");

  return {
    show: Boolean(query && (module !== "property" || brain.wantsVendor || brain.wantsInvestment || input.resultCount > 0)),
    title:
      negotiationScore >= 85
        ? "Very strong negotiation opportunity"
        : negotiationScore >= 68
          ? "Good negotiation opportunity"
          : negotiationScore >= 45
            ? "Negotiation possible with better details"
            : "Vendor negotiation needs stronger signals",
    subtitle:
      "3Bigha is estimating RFQ acceptance, negotiation strength, vendor risk and best transaction strategy.",
    negotiationScore,
    negotiationLabel: negotiationLabel(negotiationScore),
    rfqAcceptanceLikelihood,
    procurementRisk,
    bestStrategy,
    recommendedVendorType,
    priceStrategy,
    chips: chips.length ? chips.slice(0, 6) : ["Vendor negotiation", "RFQ acceptance", "Procurement confidence"],
    rfqHref: `/rfq/general/new?query=${clean}${module !== "all" ? `&module=${encodeURIComponent(module)}` : ""}`,
    vendorHref: `/vendor/discovery?q=${clean}${module !== "all" ? `&module=${encodeURIComponent(module)}` : ""}`,
  };
}