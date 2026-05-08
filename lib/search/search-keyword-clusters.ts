import type { SeoModule } from "@/lib/geo/india-geo";
import { getModuleKeywordGroups } from "@/lib/seo/module-keywords";

export function getSearchKeywordClusters({
  query,
  module,
  area,
}: {
  query: string;
  module: SeoModule | null;
  area?: string;
}) {
  const safeArea = area || "your area";

  if (!module) {
    return {
      related: [
        `${query} near me`,
        `${query} price`,
        `${query} supplier`,
        `${query} dealer`,
        `post requirement for ${query}`,
      ],
      rfq: [`post requirement for ${query}`, `get quote for ${query}`],
      price: [`${query} price`, `${query} rate today`],
    };
  }

  const groups = getModuleKeywordGroups(module, safeArea);

  return {
    related: [
      `${query} in ${safeArea}`,
      `${query} near me in ${safeArea}`,
      ...groups.search.slice(0, 10).map((item) => item.keyword),
    ],
    rfq: [
      `post requirement for ${query} in ${safeArea}`,
      ...groups.rfq.slice(0, 6).map((item) => item.keyword),
    ],
    price: [
      `${query} price in ${safeArea}`,
      `${query} rate today in ${safeArea}`,
      ...groups.price.slice(0, 6).map((item) => item.keyword),
    ],
  };
}