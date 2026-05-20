export type UnifiedMarketplaceModule =
  | "property"
  | "materials"
  | "services"
  | "rentals"
  | "blog";

export type UnifiedMarketplaceModuleFilter = "all" | UnifiedMarketplaceModule;

export type UnifiedMarketplaceBrain = {
  query: string;
  normalizedQuery: string;
  primaryModule: UnifiedMarketplaceModuleFilter;
  workflow: "search" | "rfq" | "price" | "vendor" | "investment" | "procurement" | "rental";
  confidence: number;
  isBulk: boolean;
  isUrgent: boolean;
  isCommercial: boolean;
  wantsPrice: boolean;
  wantsVendor: boolean;
  wantsRfq: boolean;
  wantsInvestment: boolean;
  wantsProcurement: boolean;
  wantsNearby: boolean;
  quantityHint?: string;
  locationHint?: string;
  reasons: string[];
};

export type UnifiedMarketplaceRecommendation = {
  title: string;
  text: string;
  href: string;
  badge: string;
  icon: string;
  priority: number;
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function extractQuantityHint(query: string) {
  const match = query.match(
    /\b(\d+(?:\.\d+)?)\s*(bag|bags|cft|sqft|ton|tons|kg|pcs|piece|pieces|truck|trucks|brass|katha|bigha|acre|day|days|hour|hours)\b/i
  );
  return match ? match[0] : undefined;
}

function extractLocationHint(query: string) {
  const match = query.match(
    /(?:in|near|at|around|within)\s+([a-zA-Z\u0980-\u09FF\u0900-\u097F][\w\s\u0980-\u09FF\u0900-\u097F-]{2,50})$/i
  );
  return match ? match[1].trim() : undefined;
}

export function analyzeUnifiedMarketplaceIntent(query: string): UnifiedMarketplaceBrain {
  const raw = cleanText(query);
  const q = raw.toLowerCase();
  const reasons: string[] = [];

  const property = hasAny(q, [
    "land", "plot", "flat", "house", "home", "property", "shop", "godown",
    "jomi", "bari", "জমি", "বাড়ি", "জায়গা", "जमीन", "मकान",
  ]);

  const materials = hasAny(q, [
    "cement", "rod", "tmt", "steel", "brick", "sand", "stone", "aggregate",
    "chips", "tiles", "paint", "pipe", "door", "window",
    "সিমেন্ট", "রড", "ইট", "বালি", "পাথর", "सीमेंट", "बालू", "ईंट",
  ]);

  const services = hasAny(q, [
    "mason", "rajmistri", "mistri", "contractor", "plumber", "electrician",
    "painter", "architect", "labour", "service",
    "মিস্ত্রি", "রাজমিস্ত্রি", "কন্ট্রাক্টর", "ठेकेदार", "मिस्त्री",
  ]);

  const rentals = hasAny(q, [
    "jcb", "rental", "rent", "hire", "mixer", "scaffold", "machine",
    "equipment", "ভাড়া", "ভাড়া", "किराया",
  ]);

  const isBulk =
    /\b\d+\b/.test(q) ||
    hasAny(q, ["bulk", "wholesale", "truck", "load", "lot", "bags", "tons", "cft", "বাল্ক", "থোক"]);

  const isUrgent = hasAny(q, [
    "urgent", "today", "tomorrow", "immediate", "quick", "fast", "asap",
    "জরুরি", "তাড়াতাড়ি", "আজ", "कल", "जल्दी",
  ]);

  const wantsPrice = hasAny(q, ["price", "rate", "cost", "dam", "দাম", "রেট", "খরচ", "कीमत", "रेट"]);
  const wantsVendor = hasAny(q, ["vendor", "supplier", "dealer", "shop", "dokan", "সাপ্লায়ার", "দোকান", "डीलर"]);
  const wantsRfq = hasAny(q, ["quote", "quotation", "rfq", "requirement", "need", "lagbe", "chai", "চাই", "লাগবে", "चाहिए"]);
  const wantsInvestment = hasAny(q, ["investment", "invest", "roi", "return", "growth", "future", "resale", "বিনিয়োগ", "লাভ", "निवेश"]);
  const wantsProcurement = materials && (isBulk || wantsRfq || wantsVendor || isUrgent);
  const wantsNearby = hasAny(q, ["near me", "nearby", "near", "local", "around", "লোকাল", "কাছে", "पास", "नजदीक"]);
  const isCommercial = isBulk || wantsVendor || wantsRfq || wantsProcurement || hasAny(q, ["project", "site", "construction", "building", "supply", "work order"]);

  let primaryModule: UnifiedMarketplaceModuleFilter = "all";
  if (materials) primaryModule = "materials";
  else if (services) primaryModule = "services";
  else if (rentals) primaryModule = "rentals";
  else if (property) primaryModule = "property";

  if (primaryModule !== "all") reasons.push(`${primaryModule} intent`);
  if (isBulk) reasons.push("bulk quantity signal");
  if (isUrgent) reasons.push("urgent requirement");
  if (wantsPrice) reasons.push("price-check signal");
  if (wantsVendor) reasons.push("vendor sourcing signal");
  if (wantsInvestment) reasons.push("investment signal");
  if (wantsNearby) reasons.push("local discovery signal");

  let workflow: UnifiedMarketplaceBrain["workflow"] = "search";
  if (wantsProcurement) workflow = "procurement";
  else if (wantsRfq) workflow = "rfq";
  else if (wantsPrice) workflow = "price";
  else if (wantsVendor) workflow = "vendor";
  else if (wantsInvestment) workflow = "investment";
  else if (rentals) workflow = "rental";

  const confidence = Math.min(
    0.96,
    0.45 +
      (primaryModule !== "all" ? 0.18 : 0) +
      (isCommercial ? 0.1 : 0) +
      (wantsPrice ? 0.08 : 0) +
      (wantsVendor ? 0.08 : 0) +
      (wantsNearby ? 0.05 : 0) +
      (isUrgent ? 0.04 : 0)
  );

  return {
    query: raw,
    normalizedQuery: q,
    primaryModule,
    workflow,
    confidence,
    isBulk,
    isUrgent,
    isCommercial,
    wantsPrice,
    wantsVendor,
    wantsRfq,
    wantsInvestment,
    wantsProcurement,
    wantsNearby,
    quantityHint: extractQuantityHint(raw),
    locationHint: extractLocationHint(raw),
    reasons,
  };
}

export function scoreUnifiedMarketplaceResult(input: {
  module: UnifiedMarketplaceModule;
  title?: string | null;
  subtitle?: string | null;
  meta?: string | null;
  price?: number | null;
  query: string;
  moduleFilter: UnifiedMarketplaceModuleFilter;
}) {
  const brain = analyzeUnifiedMarketplaceIntent(input.query);
  const haystack = `${input.title || ""} ${input.subtitle || ""} ${input.meta || ""}`.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  if (brain.primaryModule !== "all" && input.module === brain.primaryModule) {
    score += 24;
    reasons.push("workflow module match");
  }

  if (input.moduleFilter !== "all" && input.module === input.moduleFilter) {
    score += 12;
    reasons.push("selected module");
  }

  for (const token of brain.normalizedQuery.split(/\s+/).filter((x) => x.length >= 3).slice(0, 10)) {
    if (haystack.includes(token)) score += 4;
  }

  if (brain.wantsProcurement && input.module === "materials") {
    score += 18;
    reasons.push("procurement ready");
  }

  if (brain.wantsVendor && (input.module === "materials" || input.module === "services")) {
    score += 10;
    reasons.push("vendor sourcing fit");
  }

  if (brain.wantsPrice && input.price != null && input.price > 0) {
    score += 8;
    reasons.push("price visible");
  }

  if (brain.wantsInvestment && input.module === "property") {
    score += 14;
    reasons.push("investment fit");
  }

  if (brain.isUrgent && (input.module === "materials" || input.module === "services" || input.module === "rentals")) {
    score += 7;
    reasons.push("urgent workflow fit");
  }

  return {
    score,
    reason: reasons[0] || brain.reasons[0] || "unified marketplace match",
  };
}

export function buildUnifiedMarketplaceRecommendations(
  query: string,
  module: UnifiedMarketplaceModuleFilter
): UnifiedMarketplaceRecommendation[] {
  const brain = analyzeUnifiedMarketplaceIntent(query);
  const clean = encodeURIComponent(brain.query || "marketplace requirement");
  const moduleParam =
    module !== "all"
      ? `&module=${encodeURIComponent(module)}`
      : brain.primaryModule !== "all"
        ? `&module=${encodeURIComponent(brain.primaryModule)}`
        : "";

  const items: UnifiedMarketplaceRecommendation[] = [];

  if (brain.wantsProcurement || brain.wantsRfq || brain.isBulk) {
    items.push({
      title: brain.isUrgent ? "Send urgent RFQ to suppliers" : "Create a smart RFQ",
      text: brain.quantityHint
        ? `Detected quantity: ${brain.quantityHint}. Send this as a structured requirement to vendors.`
        : "Convert this search into a structured requirement and collect vendor responses.",
      href: `/rfq/general/new?query=${clean}`,
      badge: "Procurement workflow",
      icon: "⚡",
      priority: 100,
    });
  }

  if (brain.wantsVendor || brain.wantsProcurement || brain.primaryModule === "services") {
    items.push({
      title: "Find matching vendors",
      text: brain.locationHint
        ? `Source vendors around ${brain.locationHint} with marketplace matching.`
        : "Discover suppliers, contractors and service providers related to this search.",
      href: `/vendor/discovery?q=${clean}${moduleParam}`,
      badge: "Vendor routing",
      icon: "🎯",
      priority: 90,
    });
  }

  if (brain.wantsPrice || brain.primaryModule === "materials" || brain.wantsProcurement) {
    items.push({
      title: "Check Price Today",
      text: "Compare local market rate before buying, quoting or negotiating.",
      href: `/price-today?q=${clean}`,
      badge: "Price intelligence",
      icon: "📊",
      priority: 80,
    });
  }

  if (brain.wantsInvestment || brain.primaryModule === "property") {
    items.push({
      title: "Review investment potential",
      text: "Check property opportunities, growth signals and investment workflow.",
      href: `/investment/opportunities?q=${clean}`,
      badge: "Investment path",
      icon: "📈",
      priority: 70,
    });
  }

  if (brain.primaryModule === "rentals" || brain.workflow === "rental") {
    items.push({
      title: "Check equipment rental options",
      text: "Compare rental availability and connect with equipment providers.",
      href: `/rentals?search=${clean}`,
      badge: "Rental workflow",
      icon: "🚜",
      priority: 65,
    });
  }

  items.push({
    title: "Continue unified search",
    text: "Search across property, materials, services, rentals and knowledge results.",
    href: `/search?q=${clean}${moduleParam}`,
    badge: "Unified search",
    icon: "🔎",
    priority: 40,
  });

  return items
    .sort((a, b) => b.priority - a.priority)
    .filter((item, index, arr) => arr.findIndex((x) => x.href === item.href) === index)
    .slice(0, 4);
}

export function getUnifiedMarketplaceSummary(query: string) {
  const brain = analyzeUnifiedMarketplaceIntent(query);
  const reasons = brain.reasons.length ? brain.reasons.join(", ") : "general marketplace intent";
  return `Unified Marketplace Brain detected ${reasons}. Recommended workflow: ${brain.workflow}.`;
}