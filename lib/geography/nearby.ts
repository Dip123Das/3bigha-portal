import {
  Coordinates,
  createBoundingBox,
  filterWithinRadius,
  isValidCoordinate,
} from "./distance";

export type NearbySearchInput<T> = {
  center: Coordinates;
  radiusKm: number;
  items: T[];
  getCoordinates: (item: T) => Coordinates | null | undefined;
};

export type NearbyResult<T> = T & {
  distanceKm: number;
};

export function normalizeRadiusKm(value: string | number | null | undefined, fallbackKm = 25): number {
  const radius = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(radius) || radius <= 0) return fallbackKm;

  return Math.min(radius, 250);
}

export function parseCoordinate(value: string | number | null | undefined): number | null {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export function parseCenterFromSearchParams(searchParams: URLSearchParams): Coordinates | null {
  const latitude = parseCoordinate(searchParams.get("lat") || searchParams.get("latitude"));
  const longitude = parseCoordinate(searchParams.get("lng") || searchParams.get("longitude"));

  const center = {
    latitude: latitude ?? Number.NaN,
    longitude: longitude ?? Number.NaN,
  };

  return isValidCoordinate(center) ? center : null;
}

export function nearbySearch<T>({
  center,
  radiusKm,
  items,
  getCoordinates,
}: NearbySearchInput<T>): NearbyResult<T>[] {
  if (!isValidCoordinate(center)) return [];

  return filterWithinRadius(center, items, getCoordinates, radiusKm);
}

export function nearbyBoundingBox(center: Coordinates, radiusKm: number) {
  return createBoundingBox(center, radiusKm);
}
