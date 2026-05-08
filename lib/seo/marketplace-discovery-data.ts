import { getVendorRecommendationCandidates } from "@/lib/seo/vendor-recommendation-data";
import type { VendorRecommendationInput } from "@/lib/seo/vendor-recommendation-engine";

const fallbackVendors: VendorRecommendationInput[] = [
  {
    vendorId: "cement-supplier-cooch-behar",
    businessName: "Cement Supplier Cooch Behar",
    slug: "cement-supplier-cooch-behar",
    city: "Cooch Behar",
    district: "Cooch Behar",
    state: "West Bengal",
    locality: "Khagrabari",
    category: "Construction Materials",
    services: ["Cement Supply", "Construction Delivery"],
    materials: ["Cement", "Sand", "Bricks"],
    reputationScore: 78,
    leaderboardScore: 82,
    authorityScore: 80,
    conversionRate: 24,
    isVerified: true,
    boostActive: false,
  },
  {
    vendorId: "steel-supplier-cooch-behar",
    businessName: "Steel Supplier Cooch Behar",
    slug: "steel-supplier-cooch-behar",
    city: "Cooch Behar",
    district: "Cooch Behar",
    state: "West Bengal",
    locality: "Cooch Behar Town",
    category: "Construction Materials",
    services: ["Steel Supply", "Construction Delivery"],
    materials: ["TMT Steel", "Steel", "Cement"],
    reputationScore: 74,
    leaderboardScore: 79,
    authorityScore: 77,
    conversionRate: 21,
    isVerified: true,
    boostActive: true,
  },
  {
    vendorId: "building-materials-khagrabari",
    businessName: "Building Materials Khagrabari",
    slug: "building-materials-khagrabari",
    city: "Cooch Behar",
    district: "Cooch Behar",
    state: "West Bengal",
    locality: "Khagrabari",
    category: "Building Suppliers",
    services: ["Material Supply", "Local Delivery"],
    materials: ["Cement", "TMT Steel", "Bricks"],
    reputationScore: 81,
    leaderboardScore: 84,
    authorityScore: 83,
    conversionRate: 26,
    isVerified: true,
    boostActive: false,
  },
];

export async function getMarketplaceDiscoveryVendors(): Promise<
  VendorRecommendationInput[]
> {
  const vendors = await getVendorRecommendationCandidates("");

  return vendors.length > 0 ? vendors : fallbackVendors;
}