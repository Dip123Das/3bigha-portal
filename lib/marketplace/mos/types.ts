export type MosCompetitionLevel = "low" | "medium" | "high";

export type MosGeographyMode =
  | "coordinates"
  | "place"
  | "block"
  | "subdivision"
  | "district"
  | "state";

export interface DemandAroundMe {
  generatedAt: string;

  geography: {
    state?: string;
    district?: string;
    subdivision?: string;
    block?: string;
    place?: string;
    radiusKm: number;
    mode: MosGeographyMode;
  };

  demand: {
    todayRfqs: number;
    activeBuyers: number;
    estimatedMarketValue: number;
    fastestGrowingCategory?: string;
    highestDemandArea?: string;
  };

  supply: {
    nearbyVendors: number;
    competition: MosCompetitionLevel;
  };

  opportunity: {
    score: number;
    summary: string;
  };

  recommendation: {
    title: string;
    description: string;
  };
}
