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

function includesIntent(items: string[] | undefined, intent?: string | null) {
  const cleanIntent = normalize(intent);

  if (!cleanIntent) return false;

  return (items || []).some((item) => {
    const cleanItem = normalize(item);

    return (
      cleanIntent.includes(cleanItem) ||
      cleanItem.includes(cleanIntent)
    );
  });
}

export function calculateVendorRecommendationScore(
  input: VendorRecommendationInput
): VendorRecommendationResult {
  const matchSignals: string[] = [];

  const localityMatch =
    normalize(input.locality) &&
    normalize(input.locality) === normalize(input.buyerLocality);

  const cityMatch =
    normalize(input.city) &&
    normalize(input.city) === normalize(input.buyerCity);

  const districtMatch =
    normalize(input.district) &&
    normalize(input.district) === normalize(input.buyerDistrict);

  const serviceMatch = includesIntent(input.services, input.searchIntent);
  const materialMatch = includesIntent(input.materials, input.searchIntent);
  const categoryMatch =
    normalize(input.category) &&
    normalize(input.searchIntent).includes(normalize(input.category));

  let score = 0;

  if (localityMatch) {
    score += 20;
    matchSignals.push("Same locality");
  }

  if (cityMatch) {
    score += 15;
    matchSignals.push("Same city");
  }

  if (districtMatch) {
    score += 10;
    matchSignals.push("Same district");
  }

  if (serviceMatch) {
    score += 18;
    matchSignals.push("Service intent match");
  }

  if (materialMatch) {
    score += 18;
    matchSignals.push("Material intent match");
  }

  if (categoryMatch) {
    score += 12;
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
    score += 6;
    matchSignals.push("Verified vendor");
  }

  if (input.boostActive) {
    score += 4;
    matchSignals.push("Boost active");
  }

  const recommendationScore = Math.min(100, score);

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