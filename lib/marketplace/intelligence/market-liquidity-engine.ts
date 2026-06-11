export type MarketLiquidity =
  | "stagnant"
  | "slow"
  | "active"
  | "liquid";

export function resolveMarketLiquidity(
  score: number
): MarketLiquidity {
  if (score >= 76) return "liquid";
  if (score >= 51) return "active";
  if (score >= 26) return "slow";
  return "stagnant";
}
