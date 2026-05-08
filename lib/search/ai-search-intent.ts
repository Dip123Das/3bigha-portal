import type { SeoModule } from "@/lib/geo/india-geo";

export type SearchIntent =
  | "property"
  | "materials"
  | "services"
  | "rentals"
  | "price"
  | "rfq"
  | "vendor"
  | "near_me"
  | "unknown";

export type ParsedSearchIntent = {
  query: string;
  normalizedQuery: string;
  module: SeoModule | null;
  intent: SearchIntent;
  areaHint?: string;
};

const materialWords = [
  "cement",
  "balu",
  "sand",
  "pathor",
  "gitti",
  "rod",
  "tmt",
  "tiles",
  "door",
  "dorja",
  "janla",
  "chimney",
  "tep kol",
  "pipe",
  "sanitary",
  "paint",
  "brick",
  "it",
];

const serviceWords = [
  "rajmistri",
  "mistri",
  "contractor",
  "plumber",
  "electrician",
  "painter",
  "carpenter",
  "tiles mistri",
  "welder",
  "architect",
];

const propertyWords = [
  "land",
  "jomi",
  "plot",
  "flat",
  "house",
  "bari",
  "shop",
  "dokan",
  "godown",
];

const rentalWords = [
  "rent",
  "rental",
  "bhara",
  "jcb",
  "room rent",
  "flat rent",
  "house rent",
  "shop rent",
];

export function parseAiSearchIntent(query: string): ParsedSearchIntent {
  const normalizedQuery = query.trim().toLowerCase();

  let module: SeoModule | null = null;

  if (materialWords.some((word) => normalizedQuery.includes(word))) {
    module = "materials";
  } else if (serviceWords.some((word) => normalizedQuery.includes(word))) {
    module = "services";
  } else if (rentalWords.some((word) => normalizedQuery.includes(word))) {
    module = "rentals";
  } else if (propertyWords.some((word) => normalizedQuery.includes(word))) {
    module = "property";
  }

  let intent: SearchIntent = "unknown";

  if (normalizedQuery.includes("near me")) intent = "near_me";
  else if (normalizedQuery.includes("price") || normalizedQuery.includes("rate")) intent = "price";
  else if (
    normalizedQuery.includes("supplier") ||
    normalizedQuery.includes("dealer") ||
    normalizedQuery.includes("dokan") ||
    normalizedQuery.includes("shop")
  )
    intent = "vendor";
  else if (
    normalizedQuery.includes("post requirement") ||
    normalizedQuery.includes("rfq") ||
    normalizedQuery.includes("quote")
  )
    intent = "rfq";
  else if (module) intent = module;

  const areaParts = ["in ", "near ", "at "];

  let areaHint: string | undefined;

  for (const marker of areaParts) {
    const index = normalizedQuery.lastIndexOf(marker);
    if (index >= 0) {
      areaHint = query.slice(index + marker.length).trim();
      break;
    }
  }

  return {
    query,
    normalizedQuery,
    module,
    intent,
    areaHint,
  };
}