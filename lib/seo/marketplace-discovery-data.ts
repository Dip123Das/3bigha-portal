import { getVendorRecommendationCandidates } from "@/lib/seo/vendor-recommendation-data";
import type { VendorRecommendationInput } from "@/lib/seo/vendor-recommendation-engine";

export async function getMarketplaceDiscoveryVendors(): Promise<
  VendorRecommendationInput[]
> {
  return getVendorRecommendationCandidates("");
}