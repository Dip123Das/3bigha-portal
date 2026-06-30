import { LatLng, toRadians } from "./coordinates";

const EARTH_RADIUS = 6371000;

export function haversineDistance(
  a: LatLng,
  b: LatLng
): number {

  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);

  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}

export function distanceKm(
  a: LatLng,
  b: LatLng
): number {
  return haversineDistance(a, b) / 1000;
}