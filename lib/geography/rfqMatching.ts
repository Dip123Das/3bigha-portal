import { Coordinates } from "./distance";
import { nearbyBoundingBox, nearbySearch } from "./nearby";
import { resolveVendorCoordinates } from "./vendorCoordinates";
import {
  isEligibleVendorProfile,
  matchesBusinessCategory,
  sortNearbyVendors,
  vendorCoversDistance,
} from "./vendorMatching";

export type RfqVendorCandidate = {
  user_id: string;
  business_name: string | null;
  business_type: string | null;
  nature_of_business: string[] | null;
  contact_person: string | null;
  phone_primary: string | null;
  phone_whatsapp: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  locality: string | null;
  service_radius_km: number | string | null;
  delivery_radius_km: number | string | null;
  statewide_service: boolean | null;
  nationwide_service: boolean | null;
  verified_lat: number | string | null;
  verified_lng: number | string | null;
  location_verification_status: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  boost_priority: number | string | null;
  is_complete: boolean | null;
  registration_complete: boolean | null;
};

export type RecommendNearbyVendorsInput = {
  center: Coordinates;
  radiusKm: number;
  category?: string | null;
  vendors: RfqVendorCandidate[];
  limit?: number;
};

export function recommendNearbyVendors({
  center,
  radiusKm,
  category,
  vendors,
  limit = 25,
}: RecommendNearbyVendorsInput) {
  const nearby = nearbySearch<RfqVendorCandidate>({
    center,
    radiusKm,
    items: vendors,
    getCoordinates: (vendor) => resolveVendorCoordinates(vendor).coordinates,
  })
    .filter((vendor) => matchesBusinessCategory(vendor, category))
    .filter(isEligibleVendorProfile)
    .filter(vendorCoversDistance);

  return sortNearbyVendors(nearby).slice(0, limit);
}

export function createVendorCandidateBoundingBox(center: Coordinates, radiusKm: number) {
  return nearbyBoundingBox(center, radiusKm);
}
