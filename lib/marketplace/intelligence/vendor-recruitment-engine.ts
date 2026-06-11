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
  const shortageScore = Math.max(0, demandScore - supplyScore);

  const recommendedVendorCount =
    shortageScore >= 40
      ? 10
      : shortageScore >= 25
        ? 6
        : shortageScore >= 10
          ? 3
          : shortageScore >= 3
            ? 1
            : 0;

  const priority =
    shortageScore >= 40
      ? "critical"
      : shortageScore >= 25
        ? "high"
        : shortageScore >= 10
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
