export type MaterialCategory = "Cement" | "Steel" | "Aggregates" | "Bricks" | "Paints";

export type Material = {
  id: string;
  name: string;
  category: MaterialCategory;
  supplier: string;
  price: string;

  // detail-friendly fields (optional now, useful later)
  unit?: string;
  description?: string;
  tags?: string[];
};

export const MATERIALS: Material[] = [
  {
    id: "m1",
    name: "ACC Cement (50 kg)",
    category: "Cement",
    supplier: "Authorized Dealer",
    price: "₹420 / bag",
    unit: "Bag (50 kg)",
    description: "High-quality cement suitable for RCC and general construction work.",
    tags: ["Popular", "Fast Moving"],
  },
  {
    id: "m2",
    name: "TMT Steel Bar",
    category: "Steel",
    supplier: "Primary Distributor",
    price: "₹62,000 / ton",
    unit: "Ton",
    description: "Fe500/Fe550 grade options commonly used for columns, beams and slabs.",
    tags: ["Structural"],
  },
  {
    id: "m3",
    name: "River Sand",
    category: "Aggregates",
    supplier: "Local Supplier",
    price: "₹1,800 / unit",
    unit: "Unit (local)",
    description: "Clean river sand for plastering and masonry (availability varies by season).",
    tags: ["Local"],
  },
  {
    id: "m4",
    name: "1st Class Bricks",
    category: "Bricks",
    supplier: "Kiln Supplier",
    price: "₹9 / piece",
    unit: "Piece",
    description: "Uniform size bricks suitable for load-bearing and partition walls.",
    tags: ["Bulk"],
  },
  {
    id: "m5",
    name: "Exterior Wall Paint (20L)",
    category: "Paints",
    supplier: "Paint Dealer",
    price: "₹3,600 / bucket",
    unit: "Bucket (20L)",
    description: "Weather-resistant exterior paint options (shade card available).",
    tags: ["Exterior"],
  },
];

export function getMaterialById(id: string) {
  return MATERIALS.find((m) => m.id === id) || null;
}
