import type { SeoModule } from "@/lib/geo/india-geo";
import { getPropertyKeywords } from "@/lib/seo/property-keywords";
import { getMaterialKeywords } from "@/lib/seo/material-keywords";
import { getServiceKeywords } from "@/lib/seo/service-keywords";
import { getRentalKeywords } from "@/lib/seo/rental-keywords";

type ModuleKeywordItem = {
  keyword: string;
};

export function getModuleKeywords(module: SeoModule, area: string): string[] {
  if (module === "property") return getPropertyKeywords(area);
  if (module === "materials") return getMaterialKeywords(area);
  if (module === "services") return getServiceKeywords(area);
  if (module === "rentals") return getRentalKeywords(area);

  return [];
}

function toItems(keywords: string[]): ModuleKeywordItem[] {
  return keywords.map((keyword) => ({ keyword }));
}

export function getModuleKeywordGroups(module: SeoModule, area: string) {
  const keywords = getModuleKeywords(module, area);

  return {
    search: toItems(keywords.slice(0, 20)),
    rfq: toItems(
      keywords
        .filter((item) => item.toLowerCase().includes("post requirement"))
        .slice(0, 12)
    ),
    price: toItems(
      keywords
        .filter(
          (item) =>
            item.toLowerCase().includes("price") ||
            item.toLowerCase().includes("rate")
        )
        .slice(0, 12)
    ),
    nearMe: toItems(
      keywords
        .filter((item) => item.toLowerCase().includes("near me"))
        .slice(0, 12)
    ),
  };
}