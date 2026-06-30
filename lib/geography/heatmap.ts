import { LatLng } from "./coordinates";

export interface HeatPoint extends LatLng {

  weight: number;
}

export function normalizeWeights(
  points: HeatPoint[]
): HeatPoint[] {

  const max =
    Math.max(...points.map(p => p.weight), 1);

  return points.map(p => ({
    ...p,
    weight: p.weight / max,
  }));
}