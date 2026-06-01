import type { TaxonomyNode } from "./types";

function material(label: string, group: string, keywords: string[] = []): TaxonomyNode {
  const slug = label.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const query = label.toLowerCase();

  return {
    label,
    slug,
    query,
    group,
    module: "materials",
    href: `/materials?q=${encodeURIComponent(query)}`,
    keywords: [query, slug, ...keywords],
  };
}

export const materialTaxonomy: TaxonomyNode[] = [
  material("Cement", "Structural", ["concrete", "opc", "ppc"]),
  material("Steel / TMT Rod", "Structural", ["steel", "rod", "rebar", "tmt"]),
  material("Sand", "Structural", ["river sand", "m sand"]),
  material("Stone Chips", "Structural", ["aggregate", "chips"]),
  material("Bricks", "Structural", ["blocks", "aac block"]),
  material("Concrete", "Structural", ["ready mix", "rmc"]),

  material("Tiles", "Finishing", ["flooring"]),
  material("Paints", "Finishing", ["paint", "wall finish"]),
  material("False Ceiling", "Finishing", ["ceiling"]),
  material("Glass", "Finishing", ["window glass"]),
  material("Interior Materials", "Finishing", ["interior"]),

  material("Electrical Materials", "Electrical / Plumbing", ["wire", "switch", "cable"]),
  material("Plumbing Materials", "Electrical / Plumbing", ["pipe", "sanitary"]),
  material("Sanitary", "Electrical / Plumbing", ["toilet", "bathroom"]),
  material("Wires & Cables", "Electrical / Plumbing", ["wire", "cable"]),

  material("Scaffolding", "Tools / Equipment", ["support", "temporary structure"]),
  material("Shuttering", "Tools / Equipment", ["centering"]),
  material("Construction Tools", "Tools / Equipment", ["tools"]),
];
