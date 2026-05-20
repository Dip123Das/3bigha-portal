import {
  analyzeUnifiedMarketplaceIntent,
  type UnifiedMarketplaceModuleFilter,
} from "@/lib/search/unified-marketplace-brain";

export type SearchToRfqConversion = {
  show: boolean;
  title: string;
  subtitle: string;
  confidence: number;
  urgency: "normal" | "medium" | "high";
  detectedQuantity?: string;
  detectedLocation?: string;
  recommendedModule: UnifiedMarketplaceModuleFilter;
  rfqHref: string;
  vendorHref: string;
  priceHref: string;
  chips: string[];
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export function buildSearchToRfqConversion(input: {
  query: string;
  module: UnifiedMarketplaceModuleFilter;
}): SearchToRfqConversion {
  const query = cleanText(input.query);
  const brain = analyzeUnifiedMarketplaceIntent(query);
  const clean = encodeURIComponent(query || "marketplace requirement");

  const strongIntent =
    brain.wantsProcurement ||
    brain.wantsRfq ||
    brain.isBulk ||
    brain.isUrgent ||
    brain.wantsVendor ||
    brain.primaryModule === "materials" ||
    brain.primaryModule === "services" ||
    brain.primaryModule === "rentals";

  const recommendedModule =
    input.module !== "all"
      ? input.module
      : brain.primaryModule !== "all"
        ? brain.primaryModule
        : "all";

  let urgency: SearchToRfqConversion["urgency"] = "normal";
  if (brain.isUrgent) urgency = "high";
  else if (brain.isBulk || brain.wantsProcurement || brain.wantsRfq) urgency = "medium";

  const chips: string[] = [];

  if (brain.quantityHint) chips.push(`Qty: ${brain.quantityHint}`);
  if (brain.locationHint) chips.push(`Location: ${brain.locationHint}`);
  if (brain.wantsProcurement) chips.push("Procurement ready");
  if (brain.wantsVendor) chips.push("Vendor sourcing");
  if (brain.wantsPrice) chips.push("Price check advised");
  if (brain.isUrgent) chips.push("Urgent");
  if (brain.isBulk) chips.push("Bulk order");

  return {
    show: Boolean(query && strongIntent),
    title:
      urgency === "high"
        ? "Urgent RFQ recommended"
        : brain.wantsProcurement || brain.isBulk
          ? "Bulk procurement RFQ recommended"
          : "Turn this search into an RFQ",
    subtitle:
      urgency === "high"
        ? "This looks time-sensitive. Send it to vendors now for faster responses."
        : brain.quantityHint
          ? `Detected ${brain.quantityHint}. You can send this as a structured RFQ to matching vendors.`
          : "This search has buying or hiring intent. Convert it into a requirement and collect vendor responses.",
    confidence: brain.confidence,
    urgency,
    detectedQuantity: brain.quantityHint,
    detectedLocation: brain.locationHint,
    recommendedModule,
    rfqHref: `/rfq/general/new?query=${clean}${
      recommendedModule !== "all" ? `&module=${encodeURIComponent(recommendedModule)}` : ""
    }`,
    vendorHref: `/vendor/discovery?q=${clean}${
      recommendedModule !== "all" ? `&module=${encodeURIComponent(recommendedModule)}` : ""
    }`,
    priceHref: `/price-today?q=${clean}`,
    chips: chips.length ? chips.slice(0, 5) : ["RFQ ready", "Vendor workflow", "Marketplace action"],
  };
}