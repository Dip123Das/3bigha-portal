import { LatLng } from "./coordinates";
import { distanceKm } from "./distance";

export interface RouteEstimate {

  distanceKm: number;

  averageSpeed: number;

  durationMinutes: number;
}

export function estimateRoadRoute(
  from: LatLng,
  to: LatLng,
  averageSpeed = 40
): RouteEstimate {

  const km = distanceKm(from, to);

  return {

    distanceKm: km,

    averageSpeed,

    durationMinutes:
      (km / averageSpeed) * 60,
  };
}