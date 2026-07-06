import {
  analyzeUnifiedMarketplaceIntent,
  type UnifiedMarketplaceModuleFilter,
} from "@/lib/search/unified-marketplace-brain";

export type VendorLiquidityInsight = {
  show: boolean;
  title: string;
  subtitle: string;
  confidenceLabel: "Low" | "Medium" | "High" | "Very High";
  score: number;
  activeVendors: number;
  fastResponders: number;
  bulkReadyVendors: number;
  responseEstimate: string;
  module: UnifiedMarketplaceModuleFilter;
  chips: string[];
  vendorHref: string;
  rfqHref: string;
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function confidenceLabel(score: number): VendorLiquidityInsight["confidenceLabel"] {
  if (score >= 85) return "Very High";
  if (score >= 68) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

export function buildVendorLiquidityInsight(input: {
  query: string;
  module: UnifiedMarketplaceModuleFilter;
  resultCount: number;
}): VendorLiquidityInsight {
  const query = cleanText(input.query);
  const brain = analyzeUnifiedMarketplaceIntent(query);
  const clean = encodeURIComponent(query || "marketplace requirement");

  const module =
    input.module !== "all"
      ? input.module
      : brain.primaryModule !== "all"
        ? brain.primaryModule
        : "all";

  const commercialBoost =
    (brain.wantsProcurement ? 18 : 0) +
    (brain.wantsVendor ? 14 : 0) +
    (brain.wantsRfq ? 12 : 0) +
    (brain.isBulk ? 10 : 0) +
    (brain.isUrgent ? 8 : 0) +
    (brain.wantsNearby ? 6 : 0);

  const moduleBoost =
    module === "materials"
      ? 18
      : module === "services"
        ? 15
        : module === "rentals"
          ? 12
          : module === "property"
            ? 8
            : 4;

  const resultBoost = Math.min(20, input.resultCount * 1.6);
  const score = clampScore(34 + commercialBoost + moduleBoost + resultBoost);

  const activeVendors = Math.max(
    2,
    Math.round(score / 8) + (brain.isBulk ? 2 : 0) + (brain.wantsNearby ? 1 : 0)
  );

  const fastResponders = Math.max(1, Math.round(activeVendors * (brain.isUrgent ? 0.48 : 0.34)));
  const bulkReadyVendors = brain.isBulk || brain.wantsProcurement ? Math.max(1, Math.round(activeVendors * 0.42)) : Math.max(0, Math.round(activeVendors * 0.18));

  const responseEstimate =
    score >= 85
      ? "High response expected"
      : score >= 68
        ? "Good response expected"
        : score >= 45
          ? "Moderate response expected"
          : "Needs wider vendor discovery";

  const chips: string[] = [
    `${activeVendors} active vendors`,
    `${fastResponders} fast responders`,
  ];

  if (bulkReadyVendors > 0) chips.push(`${bulkReadyVendors} bulk-ready`);
  if (brain.locationHint) chips.push(`Locality: ${brain.locationHint}`);
  if (brain.isUrgent) chips.push("Urgent routing");
  if (brain.wantsPrice) chips.push("Price-aware");

  return {
    show: Boolean(query && (module !== "property" || brain.wantsInvestment || brain.wantsVendor || input.resultCount > 0)),
    title:
      score >= 68
        ? "Vendor liquidity looks strong"
        : score >= 45
          ? "Vendor liquidity available"
          : "Vendor discovery recommended",
    subtitle:
      module === "materials"
        ? "3Bigha can route this procurement search toward suppliers, RFQ and price workflows."
        : module === "services"
          ? "This service search can be routed toward contractors and nearby providers."
          : module === "rentals"
            ? "This rental search can be routed toward equipment providers and availability checks."
            : "3Bigha can continue this search through vendors, RFQ and marketplace workflows.",
    confidenceLabel: confidenceLabel(score),
    score,
    activeVendors,
    fastResponders,
    bulkReadyVendors,
    responseEstimate,
    module,
    chips: chips.slice(0, 5),
    vendorHref: `/vendor/discovery?q=${clean}${module !== "all" ? `&module=${encodeURIComponent(module)}` : ""}`,
    rfqHref: `/rfq?query=${clean}${module !== "all" ? `&module=${encodeURIComponent(module)}` : ""}`,
  };
}