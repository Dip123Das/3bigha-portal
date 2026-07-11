import type { GrowthPlanKey, LegacyPlanKey } from "./types";
import { resolveLegacyGrowthPlan } from "./registry";

export type GrowthPlanPresentation = {
  legacyPlan: string;
  growthPlan: GrowthPlanKey;
  stageLabel: string;
  offerLabel: string;
  shortDescription: string;
  badge: string;
};

const STAGE_META: Record<
  GrowthPlanKey,
  {
    stageLabel: string;
    shortDescription: string;
    badge: string;
  }
> = {
  start: {
    stageLabel: "Start",
    shortDescription:
      "Begin with essential tools for visibility and everyday business work.",
    badge: "Begin confidently",
  },
  grow: {
    stageLabel: "Grow",
    shortDescription:
      "Reach more customers and organise a growing volume of work.",
    badge: "Build momentum",
  },
  manage: {
    stageLabel: "Manage",
    shortDescription:
      "Coordinate advanced operations, customers and team activity.",
    badge: "Run professionally",
  },
  scale: {
    stageLabel: "Scale",
    shortDescription:
      "Support larger teams, branches and enterprise operations.",
    badge: "Expand with control",
  },
};

const LEGACY_OFFER_LABELS: Record<string, string> = {
  free: "Start — Essential",
  basic_vendor: "Start — Extended",
  silver_vendor: "Grow",
  gold_vendor: "Manage",
  premium_vendor: "Manage",
  platinum_vendor: "Scale",
  hub_vendor: "Scale",
};

export function getGrowthPlanPresentation(
  legacyPlan: LegacyPlanKey | null | undefined
): GrowthPlanPresentation {
  const resolution = resolveLegacyGrowthPlan(legacyPlan);
  const meta = STAGE_META[resolution.growthPlan];

  return {
    legacyPlan: resolution.legacyPlan,
    growthPlan: resolution.growthPlan,
    stageLabel: meta.stageLabel,
    offerLabel:
      LEGACY_OFFER_LABELS[resolution.legacyPlan] ?? meta.stageLabel,
    shortDescription: meta.shortDescription,
    badge: meta.badge,
  };
}
