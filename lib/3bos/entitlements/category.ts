export type OperatingProfile = "individual_professional" | "multi_service_professional" | "multi_business_organisation";

export const OPERATING_PROFILE_RULES = {
  individual_professional: { categoryLimit: 1, growthPlan: "individual_growth", upgradePlan: "multi_service_growth" },
  multi_service_professional: { categoryLimit: 5, growthPlan: "multi_service_growth", upgradePlan: "multi_business_operating" },
  multi_business_organisation: { categoryLimit: null, growthPlan: "multi_business_operating", upgradePlan: null },
} as const;

export function categoryUpgradeMessage(input: { currentLabel?: string; requestedLabel?: string; profile: OperatingProfile }) {
  const current = input.currentLabel ? `: ${input.currentLabel}` : "";
  const requested = input.requestedLabel || "this new category";
  if (input.profile === "individual_professional") {
    return `Your Individual Growth Plan supports one business category${current}. To offer ${requested}, upgrade to the Multi-Service Growth Plan, which supports up to five categories.`;
  }
  if (input.profile === "multi_service_professional") {
    return `Your Multi-Service Growth Plan supports up to five categories. To add ${requested} beyond that limit, upgrade to the Multi-Business Operating Plan.`;
  }
  return `This category is not yet enabled for your business. Review your business-unit setup or contact support.`;
}
