import type { SeoModule } from "@/lib/geo/india-geo";

export type SearchInternalGraphLink = {
  label: string;
  href: string;
  intent: "search" | "rfq" | "module" | "category" | "price";
};

function queryToSlug(query: string) {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function moduleTitle(module: SeoModule) {
  if (module === "property") return "Property";
  if (module === "materials") return "Building Materials";
  if (module === "services") return "Construction Services";
  return "Rental Services";
}

export function getSearchInternalGraph({
  query,
  module,
  area,
}: {
  query: string;
  module: SeoModule | null;
  area: string;
}): SearchInternalGraphLink[] {
  const links: SearchInternalGraphLink[] = [
    {
      label: `Live search results for ${query}`,
      href: `/search?q=${encodeURIComponent(query)}${
        module ? `&module=${module}` : ""
      }`,
      intent: "search",
    },
    {
      label: `Post requirement for ${query}`,
      href: `/rfq/general/new?q=${encodeURIComponent(query)}${
        module ? `&module=${module}` : ""
      }`,
      intent: "rfq",
    },
    {
      label: `${query} price and rate search`,
      href: `/search/${queryToSlug(`${query} price in ${area}`)}`,
      intent: "price",
    },
  ];

  if (module) {
    links.push({
      label: `${moduleTitle(module)} marketplace in ${area}`,
      href: `/search/${queryToSlug(`${moduleTitle(module)} in ${area}`)}`,
      intent: "module",
    });
  }

  return links;
}