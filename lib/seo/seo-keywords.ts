import type { SeoModule } from "@/lib/geo/india-geo";

export type SeoKeywordItem = {
  keyword: string;
  intent: "search" | "rfq" | "price" | "vendor" | "buyer";
};

const moduleKeywords: Record<SeoModule, string[]> = {
  property: [
    "land for sale",
    "residential plot",
    "commercial land",
    "flat for sale",
    "house for sale",
    "builder project",
    "property dealer",
    "real estate agent",
  ],
  materials: [
    "cement supplier",
    "steel supplier",
    "sand supplier",
    "brick supplier",
    "aggregate supplier",
    "plumbing materials",
    "electrical materials",
    "building materials",
  ],
  services: [
    "contractor",
    "architect",
    "plumber",
    "electrician",
    "painter",
    "mason",
    "labour contractor",
    "turnkey construction",
  ],
  rentals: [
    "jcb rental",
    "excavator rental",
    "scaffolding rental",
    "shuttering rental",
    "construction equipment rental",
    "tools rental",
    "commercial rental",
    "property rental",
  ],
};

export function getSeoKeywords(
  module: SeoModule,
  area: string
): SeoKeywordItem[] {
  const base = moduleKeywords[module] || [];
  const cleanArea = area.trim();

  return base.flatMap((keyword) => [
    {
      keyword: `${keyword} in ${cleanArea}`,
      intent: "search" as const,
    },
    {
      keyword: `${keyword} near me in ${cleanArea}`,
      intent: "search" as const,
    },
    {
      keyword: `${keyword} price in ${cleanArea}`,
      intent: "price" as const,
    },
    {
      keyword: `best ${keyword} in ${cleanArea}`,
      intent: "vendor" as const,
    },
    {
      keyword: `post requirement for ${keyword} in ${cleanArea}`,
      intent: "rfq" as const,
    },
  ]);
}

export function getSeoKeywordGroups(module: SeoModule, area: string) {
  const keywords = getSeoKeywords(module, area);

  return {
    search: keywords.filter((item) => item.intent === "search"),
    rfq: keywords.filter((item) => item.intent === "rfq"),
    price: keywords.filter((item) => item.intent === "price"),
    vendor: keywords.filter((item) => item.intent === "vendor"),
    buyer: keywords.filter((item) => item.intent === "buyer"),
  };
}