export type PwdItemizationInput = {
  builtUpAreaSqFt: number;

  floorCount: number;

  civilCost: number;

  electricalCost: number;

  plumbingCost: number;

  finishingCost: number;
};

export type PwdLineItem = {
  chapter: string;

  itemCode: string;

  description: string;

  quantity: number;

  unit: string;

  rate: number;

  amount: number;
};

export type PwdItemizationResult = {
  civilItems: PwdLineItem[];

  plumbingItems: PwdLineItem[];

  electricalItems: PwdLineItem[];

  finishingItems: PwdLineItem[];

  totalEstimatedCost: number;

  notes: string[];
};

function round(value: number) {
  return Number(value.toFixed(2));
}

function buildItem(
  chapter: string,
  itemCode: string,
  description: string,
  quantity: number,
  unit: string,
  rate: number,
): PwdLineItem {
  return {
    chapter,
    itemCode,
    description,
    quantity: round(quantity),
    unit,
    rate: round(rate),
    amount: round(quantity * rate),
  };
}

export function generatePwdItemization(
  input: PwdItemizationInput,
): PwdItemizationResult {
  const totalArea =
    input.builtUpAreaSqFt *
    Math.max(1, input.floorCount);

  const civilItems: PwdLineItem[] = [
    buildItem(
      "Civil Works",
      "PWD-CIV-001",
      "Earthwork in excavation",
      totalArea * 0.08,
      "cum",
      420,
    ),

    buildItem(
      "Civil Works",
      "PWD-CIV-002",
      "PCC work",
      totalArea * 0.03,
      "cum",
      6800,
    ),

    buildItem(
      "Civil Works",
      "PWD-CIV-003",
      "RCC work",
      totalArea * 0.12,
      "cum",
      9200,
    ),

    buildItem(
      "Civil Works",
      "PWD-CIV-004",
      "Reinforcement steel",
      totalArea * 4.8,
      "kg",
      78,
    ),

    buildItem(
      "Civil Works",
      "PWD-CIV-005",
      "Brick masonry",
      totalArea * 0.09,
      "cum",
      7600,
    ),
  ];

  const plumbingItems: PwdLineItem[] = [
    buildItem(
      "Sanitary & Plumbing",
      "PWD-PLB-001",
      "Internal water supply lines",
      totalArea * 0.09,
      "rft",
      220,
    ),

    buildItem(
      "Sanitary & Plumbing",
      "PWD-PLB-002",
      "Internal sanitary piping",
      totalArea * 0.07,
      "rft",
      240,
    ),
  ];

  const electricalItems: PwdLineItem[] = [
    buildItem(
      "Electrical",
      "PWD-ELC-001",
      "Internal wiring points",
      totalArea * 0.018,
      "points",
      1850,
    ),

    buildItem(
      "Electrical",
      "PWD-ELC-002",
      "Distribution board",
      Math.max(1, input.floorCount),
      "nos",
      9500,
    ),
  ];

  const finishingItems: PwdLineItem[] = [
    buildItem(
      "Finishing",
      "PWD-FIN-001",
      "Wall plaster",
      totalArea * 2.2,
      "sqft",
      32,
    ),

    buildItem(
      "Finishing",
      "PWD-FIN-002",
      "Flooring tiles",
      totalArea,
      "sqft",
      95,
    ),

    buildItem(
      "Finishing",
      "PWD-FIN-003",
      "Painting work",
      totalArea * 2.4,
      "sqft",
      24,
    ),
  ];

  const totalEstimatedCost =
    [
      ...civilItems,
      ...plumbingItems,
      ...electricalItems,
      ...finishingItems,
    ].reduce(
      (sum, item) => sum + item.amount,
      0,
    );

  return {
    civilItems,

    plumbingItems,

    electricalItems,

    finishingItems,

    totalEstimatedCost:
      round(totalEstimatedCost),

    notes: [
      "PWD itemization is currently AI-assisted and indicative.",
      "Rates should be synced periodically with district-level market conditions.",
      "Structural drawings may significantly affect RCC quantities.",
      "Electrical and plumbing quantities depend on final room layouts.",
    ],
  };
}
