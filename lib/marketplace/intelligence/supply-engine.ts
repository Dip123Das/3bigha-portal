import type {
  SupplyLevel,
  SupplyMetrics,
} from "./types";

function resolveLevel(
  score: number
): SupplyLevel {
  if (score >= 80) return "saturated";
  if (score >= 60) return "dense";
  if (score >= 30) return "healthy";
  return "scarce";
}

export function buildSupplyMetrics({
  vendors,
  listings,
}: {
  vendors: number;
  listings: number;
}): SupplyMetrics {
  const score = Math.min(
    100,
    Math.round(
      vendors * 0.6 +
      listings * 0.4
    )
  );

  return {
    score,
    level: resolveLevel(score),
    vendors,
    listings,
  };
}
