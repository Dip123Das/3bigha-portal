export type ExactPwdItem = {
  code: string;

  chapter: string;

  description: string;

  domain:
    | "building"
    | "sanitary"
    | "electrical";

  unit: string;

  baseRate: number;

  keywords: string[];

  materialKeys: string[];

  source:
    | "WB_PWD_BUILDING_2015"
    | "WB_PWD_SANITARY_2017"
    | "WB_PWD_ELECTRICAL_2017";
};

export const EXACT_PWD_ITEMS: ExactPwdItem[] = [
  {
    code: "2.1",
    chapter: "Earthwork",
    description:
      "Earthwork in excavation of foundation trenches",
    domain: "building",
    unit: "cum",
    baseRate: 285,
    keywords: [
      "earthwork",
      "excavation",
      "foundation",
      "trench",
    ],
    materialKeys: ["labour"],
    source: "WB_PWD_BUILDING_2015",
  },

  {
    code: "4.1",
    chapter: "PCC",
    description:
      "Plain cement concrete in foundation and plinth",
    domain: "building",
    unit: "cum",
    baseRate: 6400,
    keywords: [
      "pcc",
      "plain cement concrete",
      "foundation concrete",
    ],
    materialKeys: [
      "cement",
      "sand",
      "aggregate",
    ],
    source: "WB_PWD_BUILDING_2015",
  },

  {
    code: "5.3",
    chapter: "RCC",
    description:
      "Reinforced cement concrete M20 grade",
    domain: "building",
    unit: "cum",
    baseRate: 8900,
    keywords: [
      "rcc",
      "column",
      "beam",
      "slab",
      "m20",
    ],
    materialKeys: [
      "cement",
      "sand",
      "aggregate",
      "tmt",
    ],
    source: "WB_PWD_BUILDING_2015",
  },

  {
    code: "6.4",
    chapter: "Brickwork",
    description:
      "Brickwork in cement mortar",
    domain: "building",
    unit: "cum",
    baseRate: 5900,
    keywords: [
      "brickwork",
      "brick wall",
      "masonry",
      "wall",
    ],
    materialKeys: [
      "bricks",
      "cement",
      "sand",
    ],
    source: "WB_PWD_BUILDING_2015",
  },

  {
    code: "13.1",
    chapter: "Plaster",
    description:
      "Internal plaster with cement mortar",
    domain: "building",
    unit: "sqm",
    baseRate: 215,
    keywords: [
      "plaster",
      "internal plaster",
      "wall finish",
    ],
    materialKeys: [
      "cement",
      "sand",
    ],
    source: "WB_PWD_BUILDING_2015",
  },

  {
    code: "18.3",
    chapter: "Flooring",
    description:
      "Vitrified tile flooring work",
    domain: "building",
    unit: "sqm",
    baseRate: 950,
    keywords: [
      "tile",
      "flooring",
      "vitrified",
      "floor tile",
    ],
    materialKeys: [
      "tiles",
      "cement",
      "sand",
    ],
    source: "WB_PWD_BUILDING_2015",
  },

  {
    code: "SAN-7.2",
    chapter: "Sanitary",
    description:
      "CPVC/UPVC internal plumbing line",
    domain: "sanitary",
    unit: "rm",
    baseRate: 320,
    keywords: [
      "pipe",
      "cpvc",
      "upvc",
      "plumbing",
    ],
    materialKeys: [
      "pipe",
      "fittings",
    ],
    source: "WB_PWD_SANITARY_2017",
  },

  {
    code: "ELEC-4.5",
    chapter: "Electrical",
    description:
      "Internal copper wiring point",
    domain: "electrical",
    unit: "point",
    baseRate: 780,
    keywords: [
      "wire",
      "electrical",
      "switch",
      "point",
      "wiring",
    ],
    materialKeys: [
      "wire",
      "switch",
      "conduit",
    ],
    source: "WB_PWD_ELECTRICAL_2017",
  },
];

export function searchExactPwdItems(
  query: string,
) {
  const normalized =
    query.toLowerCase().trim();

  return EXACT_PWD_ITEMS.filter((item) =>
    item.keywords.some((keyword) =>
      normalized.includes(keyword),
    ),
  );
}
