import type { ParsedSearchIntent } from "@/lib/search/ai-search-intent";

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getAiSearchContent(intent: ParsedSearchIntent) {
  const area = intent.areaHint || "your local area";
  const queryTitle = titleCase(intent.query);

  return {
    title: `${queryTitle} | 3Bigha Marketplace Search`,
    heading: `Search results and marketplace intent for ${intent.query}`,
    description: `Explore ${intent.query} related listings, vendors, prices, RFQs and local marketplace options around ${area} on 3Bigha.`,
    paragraphs: [
      `Users searching for "${intent.query}" often want fast local discovery, supplier comparison, vendor contact, price/rate information or RFQ-based marketplace support.`,
      `3Bigha understands regional and local search terms such as jomi, balu, pathor, rajmistri, dorja, janla, tep kol, jcb bhara and other marketplace words commonly used by Indian users.`,
      `This search page helps connect user intent with relevant property, materials, services, rentals, local vendors, RFQ workflows and marketplace discovery paths.`,
    ],
  };
}