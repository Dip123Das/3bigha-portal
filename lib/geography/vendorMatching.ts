export type VendorMatchingInput = {
  business_type?: string | null;
  nature_of_business?: string[] | null;
  service_radius_km?: number | string | null;
  delivery_radius_km?: number | string | null;
  statewide_service?: boolean | null;
  nationwide_service?: boolean | null;
  boost_priority?: number | string | null;
  subscription_plan?: string | null;
  subscription_status?: string | null;
  is_complete?: boolean | null;
  registration_complete?: boolean | null;
};

export type NearbyVendorLike = VendorMatchingInput & {
  distanceKm: number;
};

function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function matchesBusinessCategory(
  vendor: VendorMatchingInput,
  category: string | null | undefined
): boolean {
  if (!category) return true;

  const target = category.toLowerCase().trim();
  if (!target) return true;

  const values = [
    vendor.business_type,
    ...(Array.isArray(vendor.nature_of_business) ? vendor.nature_of_business : []),
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return values.some((value) => value.includes(target));
}

export function vendorCoversDistance(vendor: NearbyVendorLike): boolean {
  if (vendor.nationwide_service || vendor.statewide_service) return true;

  const serviceRadius = toNumber(vendor.service_radius_km);
  const deliveryRadius = toNumber(vendor.delivery_radius_km);
  const effectiveRadius = Math.max(serviceRadius, deliveryRadius);

  if (effectiveRadius <= 0) return true;

  return vendor.distanceKm <= effectiveRadius;
}

export function isEligibleVendorProfile(vendor: VendorMatchingInput): boolean {
  if (vendor.is_complete === false && vendor.registration_complete === false) {
    return false;
  }

  return true;
}

export function vendorPriorityScore(vendor: NearbyVendorLike): number {
  const boostPriority = toNumber(vendor.boost_priority);

  const subscriptionWeight =
    vendor.subscription_status === "active"
      ? vendor.subscription_plan === "premium"
        ? 20
        : 10
      : 0;

  const distancePenalty = Math.min(vendor.distanceKm, 250) / 10;

  return boostPriority * 100 + subscriptionWeight - distancePenalty;
}

export function sortNearbyVendors<T extends NearbyVendorLike>(vendors: T[]): T[] {
  return [...vendors].sort((a, b) => {
    const scoreA = vendorPriorityScore(a);
    const scoreB = vendorPriorityScore(b);

    if (scoreA !== scoreB) return scoreB - scoreA;

    return a.distanceKm - b.distanceKm;
  });
}
