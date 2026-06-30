export type GeoPoint = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
};

export type DistanceResult = {
  distanceKm: number | null;
  method: "haversine";
  valid: boolean;
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function isValidGeoPoint(point: GeoPoint | null | undefined): boolean {
  if (!point) return false;

  const lat = toNumber(point.latitude);
  const lng = toNumber(point.longitude);

  return (
    lat !== null &&
    lng !== null &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function haversineDistanceKm(
  origin: GeoPoint | null | undefined,
  destination: GeoPoint | null | undefined
): DistanceResult {
  if (!isValidGeoPoint(origin) || !isValidGeoPoint(destination)) {
    return {
      distanceKm: null,
      method: "haversine",
      valid: false,
    };
  }

  const lat1 = Number(origin!.latitude);
  const lon1 = Number(origin!.longitude);
  const lat2 = Number(destination!.latitude);
  const lon2 = Number(destination!.longitude);

  const earthRadiusKm = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return {
    distanceKm: Number((earthRadiusKm * c).toFixed(3)),
    method: "haversine",
    valid: true,
  };
}

export function isWithinRadiusKm(
  origin: GeoPoint | null | undefined,
  destination: GeoPoint | null | undefined,
  radiusKm: number | string | null | undefined
): boolean {
  const radius = toNumber(radiusKm);
  if (radius === null || radius < 0) return false;

  const result = haversineDistanceKm(origin, destination);
  return result.valid && result.distanceKm !== null && result.distanceKm <= radius;
}
