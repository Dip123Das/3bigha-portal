import { haversineDistanceKm } from "./distance";

export type VendorCoverage = {
  vendorId: string;

  latitude: number | null;
  longitude: number | null;

  deliveryRadiusKm: number;

  statewideService?: boolean;

  nationwideService?: boolean;

  geoStateId?: string | null;

  geoDistrictId?: string | null;

  geoSubdivisionId?: string | null;

  geoBlockId?: string | null;

  geoPlaceId?: string | null;
};

export type TargetLocation = {
  latitude: number | null;
  longitude: number | null;

  geoStateId?: string | null;

  geoDistrictId?: string | null;

  geoSubdivisionId?: string | null;

  geoBlockId?: string | null;

  geoPlaceId?: string | null;
};

export type RoutingDecision = {
  matched: boolean;

  reason: string;

  distanceKm: number | null;
};

export function shouldRouteVendor(
  vendor: VendorCoverage,
  target: TargetLocation
): RoutingDecision {

  if (vendor.nationwideService) {
    return {
      matched: true,
      reason: "nationwide",
      distanceKm: null,
    };
  }

  if (
    vendor.statewideService &&
    vendor.geoStateId &&
    vendor.geoStateId === target.geoStateId
  ) {
    return {
      matched: true,
      reason: "statewide",
      distanceKm: null,
    };
  }

  const distance = haversineDistanceKm(
    {
      latitude: vendor.latitude,
      longitude: vendor.longitude,
    },
    {
      latitude: target.latitude,
      longitude: target.longitude,
    }
  );

  if (
    distance.valid &&
    distance.distanceKm !== null &&
    distance.distanceKm <= vendor.deliveryRadiusKm
  ) {
    return {
      matched: true,
      reason: "delivery-radius",
      distanceKm: distance.distanceKm,
    };
  }

  return {
    matched: false,
    reason: "outside-radius",
    distanceKm: distance.distanceKm,
  };
}
