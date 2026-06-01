import type { TaxonomyNode } from "./types";

function rental(label: string, group: string, keywords: string[] = []): TaxonomyNode {
  const slug = label.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const query = label.toLowerCase();

  return {
    label,
    slug,
    query,
    group,
    module: "rentals",
    href: `/rentals?q=${encodeURIComponent(query)}`,
    keywords: [query, slug, ...keywords],
  };
}

export const rentalTaxonomy: TaxonomyNode[] = [
  rental("JCB / Excavator", "Heavy Equipment", ["jcb", "excavator"]),
  rental("Crane", "Heavy Equipment", ["lifting"]),
  rental("Roller", "Heavy Equipment", ["road roller"]),
  rental("Loader", "Heavy Equipment", ["loading"]),

  rental("Scaffolding", "Construction Support", ["temporary support"]),
  rental("Shuttering", "Construction Support", ["centering"]),
  rental("Safety Equipment", "Construction Support", ["helmet", "safety"]),

  rental("Truck", "Transport", ["transport"]),
  rental("Dumper", "Transport", ["material transport"]),
  rental("Transit Mixer", "Transport", ["concrete mixer"]),
  rental("Pickup", "Transport", ["small transport"]),

  rental("Concrete Mixer", "Tools / Machinery", ["mixer machine"]),
  rental("Construction Tools", "Tools / Machinery", ["tools"]),
];
