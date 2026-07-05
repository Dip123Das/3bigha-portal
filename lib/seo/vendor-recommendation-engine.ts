import { computeMarketplaceRanking } from "@/lib/marketplace/marketplace-ranking";

export type VendorRecommendationInput = {
  vendorId: string;
  businessName: string;
  slug: string;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  locality?: string | null;
  category?: string | null;
  services?: string[];
  materials?: string[];
  searchIntent?: string | null;
  buyerCity?: string | null;
  buyerDistrict?: string | null;
  buyerLocality?: string | null;
  reputationScore?: number | null;
  leaderboardScore?: number | null;
  authorityScore?: number | null;
  conversionRate?: number | null;
  isVerified?: boolean | null;
  boostActive?: boolean | null;
};

export type VendorRecommendationResult = VendorRecommendationInput & {
  recommendationScore: number;
  recommendationReason: string;
  matchSignals: string[];
};

function normalize(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .trim();
}

function tokenSet(value?: string | null) {
  return normalize(value)
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 3);
}

function fuzzyIntentMatch(items: string[] | undefined, intent?: string | null) {
  const cleanIntent = normalize(intent);
  const intentTokens = tokenSet(cleanIntent);

  if (!cleanIntent || intentTokens.length === 0) return false;

  return (items || []).some((item) => {
    const cleanItem = normalize(item);
    const itemTokens = tokenSet(cleanItem);

    if (!cleanItem || itemTokens.length === 0) return false;

    return (
      cleanIntent.includes(cleanItem) ||
      cleanItem.includes(cleanIntent) ||
      itemTokens.some((token) => intentTokens.includes(token))
    );
  });
}

function locationMatchScore(
  vendorValue?: string | null,
  buyerValue?: string | null,
  exactScore = 10
) {
  const vendor = normalize(vendorValue);
  const buyer = normalize(buyerValue);

  if (!vendor || !buyer) return 0;
  if (vendor === buyer) return exactScore;
  if (vendor.includes(buyer) || buyer.includes(vendor)) return Math.round(exactScore * 0.7);

  return 0;
}

export function calculateVendorRecommendationScore(
  input: VendorRecommendationInput
): VendorRecommendationResult {
  const matchSignals: string[] = [];

  const localityScore = locationMatchScore(input.locality, input.buyerLocality, 20);
  const cityScore = locationMatchScore(input.city, input.buyerCity, 15);
  const districtScore = locationMatchScore(input.district, input.buyerDistrict, 10);

  const serviceMatch = fuzzyIntentMatch(input.services, input.searchIntent);
  const materialMatch = fuzzyIntentMatch(input.materials, input.searchIntent);
  const categoryMatch = fuzzyIntentMatch(
    input.category ? [input.category] : [],
    input.searchIntent
  );

  let score = 0;

  if (localityScore > 0) {
    score += localityScore;
    matchSignals.push("Locality relevance");
  }

  if (cityScore > 0) {
    score += cityScore;
    matchSignals.push("City relevance");
  }

  if (districtScore > 0) {
    score += districtScore;
    matchSignals.push("District relevance");
  }

  if (serviceMatch) {
    score += 20;
    matchSignals.push("Service intent match");
  }

  if (materialMatch) {
    score += 22;
    matchSignals.push("Material intent match");
  }

  if (categoryMatch) {
    score += 14;
    matchSignals.push("Category intent match");
  }

  if ((input.reputationScore || 0) > 70) {
    score += 10;
    matchSignals.push("Strong reputation");
  }

  if ((input.leaderboardScore || 0) > 70) {
    score += 10;
    matchSignals.push("High marketplace rank");
  }

  if ((input.authorityScore || 0) > 70) {
    score += 8;
    matchSignals.push("High authority");
  }

  if ((input.conversionRate || 0) > 20) {
    score += 7;
    matchSignals.push("Good conversion record");
  }

  if (input.isVerified) {
    matchSignals.push("Verified vendor");
  }

  if (input.boostActive) {
    matchSignals.push("Boost active");
  }

  const ranking = computeMarketplaceRanking({
    aiScore: score,
    verificationScore: input.isVerified ? 6 : 0,
    boostScore: input.boostActive ? 4 : 0,
    reputationScore: input.reputationScore,
    authorityScore: input.authorityScore,
    conversionRate: input.conversionRate,
  });

  const recommendationScore = Math.min(100, ranking.score);

  return {
    ...input,
    recommendationScore,
    matchSignals,
    recommendationReason:
      matchSignals.length > 0
        ? `Recommended because of ${matchSignals.join(", ")}.`
        : "Recommended from general marketplace availability.",
  };
}

export function sortVendorRecommendations(
  vendors: VendorRecommendationInput[]
): VendorRecommendationResult[] {
  return vendors
    .map(calculateVendorRecommendationScore)
    .sort((a, b) => b.recommendationScore - a.recommendationScore);
}