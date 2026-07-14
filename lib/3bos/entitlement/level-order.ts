import type {
  CapabilityLevel,
  GrowthPlanKey,
} from "../capability";

export const CAPABILITY_LEVEL_ORDER: readonly CapabilityLevel[] = Object.freeze([
  "none",
  "basic",
  "limited",
  "standard",
  "full",
  "advanced",
  "priority",
  "executive",
  "unlimited",
  "enterprise",
]);

export const GROWTH_PLAN_ORDER: readonly GrowthPlanKey[] = Object.freeze([
  "start",
  "grow",
  "manage",
  "scale",
]);

export function capabilityLevelMeets(
  current: CapabilityLevel,
  required: CapabilityLevel
): boolean {
  return (
    CAPABILITY_LEVEL_ORDER.indexOf(current) >=
    CAPABILITY_LEVEL_ORDER.indexOf(required)
  );
}

export function growthPlanMeets(
  current: GrowthPlanKey,
  required: GrowthPlanKey
): boolean {
  return (
    GROWTH_PLAN_ORDER.indexOf(current) >=
    GROWTH_PLAN_ORDER.indexOf(required)
  );
}
