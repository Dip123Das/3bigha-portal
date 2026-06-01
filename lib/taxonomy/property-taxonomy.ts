import type { TaxonomyNode } from "./types";

function property(label: string, group: string, keywords: string[] = []): TaxonomyNode {
  const slug = label.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const query = label.toLowerCase();

  return {
    label,
    slug,
    query,
    group,
    module: "property",
    href: `/property?q=${encodeURIComponent(query)}`,
    keywords: [query, slug, ...keywords],
  };
}

export const propertyTaxonomy: TaxonomyNode[] = [
  property("Land", "Buy / Sell", ["plot", "jomi"]),
  property("Residential", "Buy / Sell", ["house", "flat", "home"]),
  property("Commercial", "Buy / Sell", ["shop", "office"]),
  property("Agricultural", "Buy / Sell", ["farm land"]),
  property("Industrial", "Buy / Sell", ["factory", "warehouse"]),
  property("Builder Projects", "Projects", ["apartment project"]),
  property("Investment", "Investment", ["roi", "deal room"]),
  property("Documentation", "Legal Work", ["registry", "mutation"]),
  property("Valuation", "Legal Work", ["property valuation"]),
  property("Survey", "Legal Work", ["land survey"]),
];
