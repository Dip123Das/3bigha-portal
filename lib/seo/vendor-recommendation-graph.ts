import {
  VendorRecommendationInput,
  VendorRecommendationResult,
  sortVendorRecommendations,
} from "@/lib/seo/vendor-recommendation-engine";

export type VendorRecommendationCluster = {
  title: string;
  reason: string;
  vendors: VendorRecommendationResult[];
};

export function buildVendorRecommendationClusters(input: {
  baseVendor: VendorRecommendationInput;
  candidateVendors: VendorRecommendationInput[];
}): VendorRecommendationCluster[] {
  const base = input.baseVendor;

  const candidates = input.candidateVendors.filter(
    (vendor) => vendor.vendorId !== base.vendorId
  );

  const sameLocality = sortVendorRecommendations(
    candidates.filter(
      (vendor) =>
        vendor.locality &&
        base.locality &&
        vendor.locality.toLowerCase() === base.locality.toLowerCase()
    )
  ).slice(0, 6);

  const sameCity = sortVendorRecommendations(
    candidates.filter(
      (vendor) =>
        vendor.city &&
        base.city &&
        vendor.city.toLowerCase() === base.city.toLowerCase()
    )
  ).slice(0, 6);

  const sameCategory = sortVendorRecommendations(
    candidates.filter(
      (vendor) =>
        vendor.category &&
        base.category &&
        vendor.category.toLowerCase() === base.category.toLowerCase()
    )
  ).slice(0, 6);

  const sameMaterials = sortVendorRecommendations(
    candidates.filter((vendor) =>
      (vendor.materials || []).some((material) =>
        (base.materials || []).map((item) => item.toLowerCase()).includes(
          material.toLowerCase()
        )
      )
    )
  ).slice(0, 6);

  const sameServices = sortVendorRecommendations(
    candidates.filter((vendor) =>
      (vendor.services || []).some((service) =>
        (base.services || []).map((item) => item.toLowerCase()).includes(
          service.toLowerCase()
        )
      )
    )
  ).slice(0, 6);

  return [
    {
      title: "Nearby Recommended Vendors",
      reason: "Vendors connected by locality and marketplace relevance",
      vendors: sameLocality.length > 0 ? sameLocality : sameCity,
    },
    {
      title: "Similar Category Vendors",
      reason: "Vendors connected by category authority",
      vendors: sameCategory,
    },
    {
      title: "Related Material Suppliers",
      reason: "Suppliers connected by material expertise",
      vendors: sameMaterials,
    },
    {
      title: "Related Service Providers",
      reason: "Providers connected by service expertise",
      vendors: sameServices,
    },
  ].filter((cluster) => cluster.vendors.length > 0);
}