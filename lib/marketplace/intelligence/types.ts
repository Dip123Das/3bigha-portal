export type DemandLevel =
  | "low"
  | "medium"
  | "high"
  | "surging";

export type SupplyLevel =
  | "scarce"
  | "healthy"
  | "dense"
  | "saturated";

export interface DemandMetrics {
  score: number;
  level: DemandLevel;
  searches: number;
  rfqs: number;
  enquiries: number;
}

export interface SupplyMetrics {
  score: number;
  level: SupplyLevel;
  vendors: number;
  listings: number;
}

export interface GapAnalysis {
  demand: number;
  supply: number;
  gap: number;
  opportunityScore: number;
  classification:
    | "underserved"
    | "balanced"
    | "oversupplied";
}
