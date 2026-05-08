import {
  VendorRecommendationInput,
  VendorRecommendationResult,
  sortVendorRecommendations,
} from "@/lib/seo/vendor-recommendation-engine";

export type MarketplaceDiscoveryInput = {
  query?: string | null;
  city?: string | null;
  district?: string | null;
  locality?: string | null;
  category?: string | null;
  vendors: VendorRecommendationInput[];
};

export type MarketplaceDiscoveryResult = {
  query: string;
  totalVendors: number;
  recommendedVendors: VendorRecommendationResult[];
  discoverySignals: string[];
  summary: string;
};

function normalize(value?: string | null) {
  return String(value || "").toLowerCase().trim();
}

export function buildMarketplaceDiscovery(
  input: MarketplaceDiscoveryInput
): MarketplaceDiscoveryResult {
  const query = input.query || input.category || "marketplace vendors";

  const vendors = input.vendors.map((vendor) => ({
    ...vendor,
    searchIntent: query,
    buyerCity: input.city || vendor.city,
    buyerDistrict: input.district || vendor.district,
    buyerLocality: input.locality || vendor.locality,
  }));

  const recommendedVendors = sortVendorRecommendations(vendors);

  const discoverySignals: string[] = [];

  if (input.locality) discoverySignals.push("locality relevance");
  if (input.city) discoverySignals.push("city relevance");
  if (input.district) discoverySignals.push("district relevance");
  if (input.category) discoverySignals.push("category relevance");
  if (input.query) discoverySignals.push("semantic search intent");
  if (recommendedVendors.some((vendor) => vendor.isVerified)) {
    discoverySignals.push("verified vendor trust");
  }
  if (recommendedVendors.some((vendor) => (vendor.reputationScore || 0) > 70)) {
    discoverySignals.push("reputation strength");
  }

  const topVendor = recommendedVendors[0];

  return {
    query,
    totalVendors: recommendedVendors.length,
    recommendedVendors,
    discoverySignals,
    summary: topVendor
      ? `AI discovery found ${recommendedVendors.length} vendors for ${query}. Top recommendation: ${topVendor.businessName}.`
      : `AI discovery did not find matching vendors for ${query}.`,
  };
}

export function filterVendorsForDiscovery(
  vendors: VendorRecommendationInput[],
  query?: string | null
) {
  const cleanQuery = normalize(query);

  if (!cleanQuery) return vendors;

  return vendors.filter((vendor) => {
    const searchableText = [
      vendor.businessName,
      vendor.category,
      vendor.city,
      vendor.district,
      vendor.locality,
      ...(vendor.services || []),
      ...(vendor.materials || []),
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(cleanQuery);
  });
}