import { Coordinates, isValidCoordinate } from "./distance";

export type VendorCoordinateSource = "verified" | "none";

export type VendorCoordinateInput = {
  verified_lat?: number | string | null;
  verified_lng?: number | string | null;
};

export type ResolvedVendorCoordinates = {
  coordinates: Coordinates | null;
  source: VendorCoordinateSource;
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveVendorCoordinates(
  vendor: VendorCoordinateInput
): ResolvedVendorCoordinates {
  const verified = {
    latitude: toNumber(vendor.verified_lat) ?? Number.NaN,
    longitude: toNumber(vendor.verified_lng) ?? Number.NaN,
  };

  if (isValidCoordinate(verified)) {
    return {
      coordinates: verified,
      source: "verified",
    };
  }

  return {
    coordinates: null,
    source: "none",
  };
}
