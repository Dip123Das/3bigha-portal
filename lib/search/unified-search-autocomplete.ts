import {
  analyzeUnifiedMarketplaceIntent,
  type UnifiedMarketplaceModuleFilter,
} from "@/lib/search/unified-marketplace-brain";

export type UnifiedSearchAutocompleteSuggestion = {
  label: string;
  query: string;
  href: string;
  icon: string;
  badge: string;
  module?: UnifiedMarketplaceModuleFilter;
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function uniqueSuggestions(items: UnifiedSearchAutocompleteSuggestion[]) {
  return items
    .filter((item) => cleanText(item.label) && cleanText(item.href))
    .filter((item, index, arr) => arr.findIndex((x) => x.href === item.href || x.label === item.label) === index)
    .slice(0, 8);
}

export function buildUnifiedSearchAutocomplete(input: {
  query: string;
  module: UnifiedMarketplaceModuleFilter;
  recentLocations?: string[];
}): UnifiedSearchAutocompleteSuggestion[] {
  const query = cleanText(input.query);
  const module = input.module || "all";
  const brain = analyzeUnifiedMarketplaceIntent(query);
  const clean = encodeURIComponent(query || "marketplace requirement");
  const location = brain.locationHint || input.recentLocations?.[0] || "Cooch Behar";
  const encodedLocation = encodeURIComponent(location);

  if (!query) {
    return uniqueSuggestions([
      {
        label: "Search cement price today",
        query: "cement price today",
        href: "/search?q=cement%20price%20today&module=materials",
        icon: "📊",
        badge: "Price",
        module: "materials",
      },
      {
        label: "Post material requirement",
        query: "need cement and TMT for house construction",
        href: "/rfq?query=need%20cement%20and%20TMT%20for%20house%20construction",
        icon: "⚡",
        badge: "RFQ",
        module: "materials",
      },
      {
        label: "Find rajmistri near me",
        query: "rajmistri near me",
        href: "/search?q=rajmistri%20near%20me&module=services",
        icon: "👷",
        badge: "Service",
        module: "services",
      },
      {
        label: "Find land in Cooch Behar",
        query: "land in Cooch Behar",
        href: "/search?q=land%20in%20Cooch%20Behar&module=property",
        icon: "🏠",
        badge: "Property",
        module: "property",
      },
    ]);
  }

  const suggestions: UnifiedSearchAutocompleteSuggestion[] = [
    {
      label: `Search "${query}" across marketplace`,
      query,
      href: `/search?q=${clean}${module !== "all" ? `&module=${encodeURIComponent(module)}` : ""}`,
      icon: "🔎",
      badge: "Search",
      module,
    },
  ];

  if (brain.primaryModule !== "all") {
    suggestions.push({
      label: `Search ${query} in ${brain.primaryModule}`,
      query,
      href: `/search?q=${clean}&module=${encodeURIComponent(brain.primaryModule)}`,
      icon: "🎯",
      badge: "Best module",
      module: brain.primaryModule,
    });
  }

  if (brain.wantsProcurement || brain.wantsRfq || brain.isBulk || brain.primaryModule === "materials") {
    suggestions.push(
      {
        label: brain.quantityHint ? `Create RFQ for ${brain.quantityHint}` : `Create RFQ for ${query}`,
        query,
        href: `/rfq?query=${clean}`,
        icon: "⚡",
        badge: "RFQ",
        module: brain.primaryModule,
      },
      {
        label: `Find suppliers for ${query}`,
        query,
        href: `/vendor/discovery?q=${clean}${brain.primaryModule !== "all" ? `&module=${brain.primaryModule}` : ""}`,
        icon: "🚚",
        badge: "Vendors",
        module: brain.primaryModule,
      }
    );
  }

  if (brain.wantsPrice || brain.primaryModule === "materials") {
    suggestions.push({
      label: `${query} price today`,
      query: `${query} price today`,
      href: `/price-today?q=${clean}`,
      icon: "📊",
      badge: "Price",
      module: "materials",
    });
  }

  if (brain.primaryModule === "services") {
    suggestions.push({
      label: `${query} service providers near ${location}`,
      query: `${query} near ${location}`,
      href: `/vendor/discovery?q=${clean}&module=services`,
      icon: "👷",
      badge: "Service",
      module: "services",
    });
  }

  if (brain.primaryModule === "property" || brain.wantsInvestment) {
    suggestions.push(
      {
        label: `${query} investment potential`,
        query: `${query} investment potential`,
        href: `/investment/opportunities?q=${clean}`,
        icon: "📈",
        badge: "Investment",
        module: "property",
      },
      {
        label: `Construction cost after buying in ${location}`,
        query: `house construction cost in ${location}`,
        href: `/house-construction-cost?location=${encodedLocation}`,
        icon: "🏗️",
        badge: "Cost",
        module: "property",
      }
    );
  }

  if (brain.primaryModule === "rentals") {
    suggestions.push({
      label: `${query} rental near ${location}`,
      query: `${query} rental near ${location}`,
      href: `/rentals?search=${clean}`,
      icon: "🚜",
      badge: "Rental",
      module: "rentals",
    });
  }

  return uniqueSuggestions(suggestions);
}