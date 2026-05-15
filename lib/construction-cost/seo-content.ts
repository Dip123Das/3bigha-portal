import { generateConstructionEstimate } from "./cost-engine";
import { formatIndianCurrency } from "./cost-utils";

import type {
  ConstructionGrade,
  ConstructionRegionKey,
} from "./cost-config";

export type ConstructionSeoSection = {
  title: string;
  content: string;
};

export type ConstructionSeoContent = {
  title: string;
  description: string;
  h1: string;
  intro: string;
  estimatedCostText: string;
  pricingSummary: string;
  sections: ConstructionSeoSection[];
  estimate: ReturnType<typeof generateConstructionEstimate>;
};

type SeoConstructionContentInput = {
  state: string;
  city: string;
  grade?: ConstructionGrade;
  region?: ConstructionRegionKey;
};

function formatSlug(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function generateConstructionSeoContent(
  input: SeoConstructionContentInput,
): ConstructionSeoContent {
  const cityName = formatSlug(input.city);
  const stateName = formatSlug(input.state);

  const estimate = generateConstructionEstimate({
    builtUpAreaSqFt: 1000,
    floorCount: 1,
    grade: input.grade ?? "standard",
    region: input.region ?? "default",
    includeFinishing: true,
    includeElectrical: true,
    includePlumbing: true,
    includeInterior: false,
    projectType: "residential",
  });

  const title = `House Construction Cost in ${cityName}, ${stateName} | 3bigha`;

  const description = `Check latest house construction cost in ${cityName}, ${stateName}. Get AI-powered budget estimate, rate per sq.ft, material cost, labour cost and turnkey construction insights on 3bigha.`;

  const h1 = `House Construction Cost in ${cityName}`;

  const intro = `Planning to build a house in ${cityName}, ${stateName}? 3bigha AI Construction Intelligence Engine helps you estimate construction budget, rate per sq.ft, material cost, labour cost and turnkey quotation range.`;

  const pricingSummary = `${estimate.request.builtUpAreaSqFt} sq.ft ${estimate.summary.suggestedGrade} construction in ${cityName} is estimated around ${formatIndianCurrency(
    estimate.summary.estimatedBudget,
  )}, approximately ${formatIndianCurrency(
    estimate.summary.estimatedRatePerSqFt,
  )} per sq.ft. Expected range: ${formatIndianCurrency(
    estimate.summary.estimatedBudgetMin,
  )} to ${formatIndianCurrency(
    estimate.summary.estimatedBudgetMax,
  )}.`;

  const estimatedCostText = `Estimated standard construction cost in ${cityName} currently ranges from ${formatIndianCurrency(
    estimate.summary.estimatedBudgetMin,
  )} to ${formatIndianCurrency(
    estimate.summary.estimatedBudgetMax,
  )} for approximately 1000 sq.ft built-up area.`;

  const sections: ConstructionSeoSection[] = [
    {
      title: `Average Construction Cost in ${cityName}`,
      content: `${pricingSummary} Final cost depends on land condition, foundation design, floor count, material brand, labour rate and finishing quality.`,
    },
    {
      title: `Construction Cost Per Sq.ft in ${cityName}`,
      content: `The AI-estimated standard construction rate in ${cityName} is approximately ${formatIndianCurrency(
        estimate.summary.estimatedRatePerSqFt,
      )} per sq.ft.`,
    },
    {
      title: "Major Cost Factors",
      content:
        "Important cost factors include TMT steel brand, cement grade, brick quality, sand, stone chips, labour availability, electrical wiring, plumbing scope, tiles, doors, windows and finishing materials.",
    },
    {
      title: "AI Construction Budget Intelligence",
      content:
        "3bigha uses construction cost intelligence to support buyer budget prediction, turnkey quotation comparison, RFQ estimation, future BOQ planning and procurement workflows.",
    },
    {
      title: `Turnkey Construction in ${cityName}`,
      content:
        "You can compare contractors, turnkey packages, construction material vendors and local service providers through the 3bigha marketplace.",
    },
  ];

  return {
    title,
    description,
    h1,
    intro,
    estimatedCostText,
    pricingSummary,
    sections,
    estimate,
  };
}