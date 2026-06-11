import type {
  DemandLevel,
  DemandMetrics,
} from "./types";

function resolveLevel(
  score: number
): DemandLevel {
  if (score >= 80) return "surging";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

export function buildDemandMetrics({
  searches,
  rfqs,
  enquiries,
}: {
  searches: number;
  rfqs: number;
  enquiries: number;
}): DemandMetrics {
  const score = Math.min(
    100,
    Math.round(
      searches * 0.3 +
      rfqs * 0.5 +
      enquiries * 0.2
    )
  );

  return {
    score,
    level: resolveLevel(score),
    searches,
    rfqs,
    enquiries,
  };
}
