export const PROPERTY_KEYWORDS = [
  "land", "jomi", "jamin", "bastu jomi", "chash jomi", "plot",
  "residential plot", "commercial land", "road side land", "highway land",
  "agricultural land", "farm land", "low budget land", "cheap land",
  "land for sale", "plot for sale", "jomi bikri", "bastu land",
  "flat", "2bhk flat", "3bhk flat", "1bhk flat", "apartment",
  "ready flat", "under construction flat", "builder flat", "resale flat",
  "house", "bari", "duplex house", "single floor house", "new house",
  "old house", "house for sale", "bari bikri", "villa", "bungalow",
  "shop", "dokan", "shop rent", "shop for sale", "market shop",
  "office space", "commercial property", "godown", "warehouse",
  "factory land", "business land", "investment property",
  "property dealer", "real estate agent", "land broker", "dalal",
  "property broker", "promoter", "builder project", "new project",
  "mutation land", "registered land", "clear title property",
  "conversion land", "khatian land", "dag number land", "rs lr plot",
  "corner plot", "boundary wall land", "gated property", "vastu land",
];

export function getPropertyKeywords(area: string) {
  const cleanArea = area.trim();

  return PROPERTY_KEYWORDS.flatMap((word) => [
    `${word} in ${cleanArea}`,
    `${word} near me in ${cleanArea}`,
    `${word} price in ${cleanArea}`,
    `${word} rate in ${cleanArea}`,
    `${word} dealer in ${cleanArea}`,
    `${word} broker in ${cleanArea}`,
    `${word} agent in ${cleanArea}`,
    `best ${word} in ${cleanArea}`,
    `buy ${word} in ${cleanArea}`,
    `sell ${word} in ${cleanArea}`,
    `post requirement for ${word} in ${cleanArea}`,
  ]);
}