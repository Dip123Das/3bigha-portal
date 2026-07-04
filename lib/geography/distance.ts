export type DistanceUnit = "km" | "miles";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type BoundingBox = {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
};

const EARTH_RADIUS_KM = 6371.0088;
const KM_TO_MILES = 0.6213711922;

export function isValidCoordinate(point: Coordinates | null | undefined): point is Coordinates {
  if (!point) return false;

  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

export function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function kmToMiles(km: number): number {
  return km * KM_TO_MILES;
}

export function milesToKm(miles: number): number {
  return miles / KM_TO_MILES;
}

export function convertDistance(value: number, from: DistanceUnit, to: DistanceUnit): number {
  if (from === to) return value;
  return from === "km" ? kmToMiles(value) : milesToKm(value);
}

export function haversineDistanceKm(from: Coordinates, to: Coordinates): number {
  if (!isValidCoordinate(from) || !isValidCoordinate(to)) {
    throw new Error("Invalid coordinates supplied to haversineDistanceKm");
  }

  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function distanceKm(from: Coordinates, to: Coordinates): number {
  return haversineDistanceKm(from, to);
}

export function distanceBetween(
  from: Coordinates,
  to: Coordinates,
  unit: DistanceUnit = "km"
): number {
  const km = haversineDistanceKm(from, to);
  return unit === "km" ? km : kmToMiles(km);
}

export function createBoundingBox(center: Coordinates, radiusKm: number): BoundingBox {
  if (!isValidCoordinate(center)) {
    throw new Error("Invalid center coordinate supplied to createBoundingBox");
  }

  if (!Number.isFinite(radiusKm) || radiusKm < 0) {
    throw new Error("Invalid radius supplied to createBoundingBox");
  }

  const latDelta = radiusKm / 111.32;
  const cosLatitude = Math.cos(toRadians(center.latitude));
  const lonDelta = Math.abs(cosLatitude) < 0.000001 ? 180 : radiusKm / (111.32 * cosLatitude);

  return {
    minLatitude: Math.max(-90, center.latitude - latDelta),
    maxLatitude: Math.min(90, center.latitude + latDelta),
    minLongitude: Math.max(-180, center.longitude - lonDelta),
    maxLongitude: Math.min(180, center.longitude + lonDelta),
  };
}

export function isInsideBoundingBox(point: Coordinates, box: BoundingBox): boolean {
  return (
    point.latitude >= box.minLatitude &&
    point.latitude <= box.maxLatitude &&
    point.longitude >= box.minLongitude &&
    point.longitude <= box.maxLongitude
  );
}

export function isWithinRadiusKm(center: Coordinates, point: Coordinates, radiusKm: number): boolean {
  return haversineDistanceKm(center, point) <= radiusKm;
}

export function filterWithinRadius<T>(
  center: Coordinates,
  items: T[],
  getCoordinates: (item: T) => Coordinates | null | undefined,
  radiusKm: number
): Array<T & { distanceKm: number }> {
  const box = createBoundingBox(center, radiusKm);

  return items
    .map((item) => {
      const coordinates = getCoordinates(item);
      if (!isValidCoordinate(coordinates)) return null;
      if (!isInsideBoundingBox(coordinates, box)) return null;

      const distanceKm = haversineDistanceKm(center, coordinates);
      if (distanceKm > radiusKm) return null;

      return {
        ...item,
        distanceKm,
      };
    })
    .filter((item): item is T & { distanceKm: number } => Boolean(item))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
