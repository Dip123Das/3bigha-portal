import type { BoqWorkCategory } from "./boq-types";
import type { ConstructionGrade } from "./cost-config";

export type BoqRule = {
  category: BoqWorkCategory;
  itemName: string;
  description: string;
  unit: string;
  quantityPerSqFt: number;
  vendorCategory: string;
  rfqReadyName: string;
  note: string;
};

export const BOQ_GRADE_MULTIPLIERS: Record<ConstructionGrade, number> = {
  economy: 0.92,
  standard: 1,
  premium: 1.12,
};

export const BOQ_ROOM_RULES: BoqRule[] = [
  {
    category: "foundation",
    itemName: "Foundation excavation",
    description: "Earth excavation for foundation and footing preparation.",
    unit: "cft",
    quantityPerSqFt: 0.65,
    vendorCategory: "Earthwork Contractor",
    rfqReadyName: "Foundation excavation work",
    note: "Actual quantity depends on soil condition and foundation depth.",
  },
  {
    category: "rcc",
    itemName: "RCC work",
    description: "RCC column, beam, slab and staircase work.",
    unit: "cft",
    quantityPerSqFt: 0.38,
    vendorCategory: "RCC Contractor",
    rfqReadyName: "RCC casting work",
    note: "Final RCC quantity must be verified from structural drawings.",
  },
  {
    category: "brickwork",
    itemName: "Brick/block masonry",
    description: "Wall masonry using brick or block.",
    unit: "sq.ft",
    quantityPerSqFt: 1.35,
    vendorCategory: "Masonry Contractor",
    rfqReadyName: "Brick masonry work",
    note: "Depends on wall thickness and internal partition layout.",
  },
  {
    category: "plaster",
    itemName: "Internal and external plaster",
    description: "Wall and ceiling plaster work.",
    unit: "sq.ft",
    quantityPerSqFt: 2.8,
    vendorCategory: "Plaster Contractor",
    rfqReadyName: "Wall plaster work",
    note: "Includes approximate internal and external plaster surface.",
  },
  {
    category: "flooring",
    itemName: "Floor tile work",
    description: "Floor tile laying with adhesive/mortar and finishing.",
    unit: "sq.ft",
    quantityPerSqFt: 0.95,
    vendorCategory: "Tile Contractor",
    rfqReadyName: "Floor tile laying work",
    note: "Add wastage depending on tile size and layout.",
  },
  {
    category: "painting",
    itemName: "Painting work",
    description: "Wall putty, primer and paint work.",
    unit: "sq.ft",
    quantityPerSqFt: 2.9,
    vendorCategory: "Painting Contractor",
    rfqReadyName: "Wall painting work",
    note: "Depends on number of coats and paint brand.",
  },
  {
    category: "electrical",
    itemName: "Electrical wiring",
    description: "Wiring, switch points, light/fan points and DB setup.",
    unit: "points",
    quantityPerSqFt: 0.018,
    vendorCategory: "Electrical Contractor",
    rfqReadyName: "Electrical wiring work",
    note: "Point count should be finalized from room layout.",
  },
  {
    category: "plumbing",
    itemName: "Plumbing work",
    description: "Bathroom, kitchen and water supply/drainage points.",
    unit: "points",
    quantityPerSqFt: 0.008,
    vendorCategory: "Plumbing Contractor",
    rfqReadyName: "Plumbing work",
    note: "Depends on number of bathrooms, kitchen and water tank layout.",
  },
  {
    category: "doors_windows",
    itemName: "Doors and windows",
    description: "Main door, internal doors, windows and ventilators.",
    unit: "sets",
    quantityPerSqFt: 0.012,
    vendorCategory: "Door & Window Vendor",
    rfqReadyName: "Door and window supply/fitting",
    note: "Depends on room count, design and material type.",
  },
  {
    category: "miscellaneous",
    itemName: "Site miscellaneous work",
    description: "Scaffolding, curing, cleaning, minor tools and site support.",
    unit: "lot",
    quantityPerSqFt: 0.001,
    vendorCategory: "General Contractor",
    rfqReadyName: "Miscellaneous site work",
    note: "Indicative lot-based estimate for early planning.",
  },
];