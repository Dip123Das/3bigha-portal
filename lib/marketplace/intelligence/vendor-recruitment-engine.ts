export interface VendorRecruitmentTarget {
  module: string;
  opportunityScore: number;
  shortageScore: number;
  recommendedVendorCount: number;
  priority: "low" | "medium" | "high" | "critical";
}

export function buildVendorRecruitmentTarget(
  module: string,
  demandScore: number,
  supplyScore: number
): VendorRecruitmentTarget {
  const shortageScore = Math.max(
    0,
    demandScore - supplyScore
  );

  const recommendedVendorCount =
    shortageScore >= 80
      ? 12
      : shortageScore >= 60
        ? 8
        : shortageScore >= 40
          ? 5
          : shortageScore >= 20
            ? 3
            : 1;

  const priority =
    shortageScore >= 80
      ? "critical"
      : shortageScore >= 60
        ? "high"
        : shortageScore >= 40
          ? "medium"
          : "low";

  return {
    module,
    opportunityScore: shortageScore,
    shortageScore,
    recommendedVendorCount,
    priority,
  };
}
