import { LatLng } from "./coordinates";
import { distanceKm } from "./distance";

export function sortNearest<T extends LatLng>(
  origin: LatLng,
  rows: T[]
): T[] {

  return [...rows].sort(
    (a, b) =>
      distanceKm(origin, a) -
      distanceKm(origin, b)
  );
}

export function filterWithinRadius<T extends LatLng>(
  origin: LatLng,
  rows: T[],
  radiusKm: number
): T[] {

  return rows.filter(
    r => distanceKm(origin, r) <= radiusKm
  );
}