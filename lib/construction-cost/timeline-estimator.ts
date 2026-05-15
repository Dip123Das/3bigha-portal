import {
  TIMELINE_GRADE_MULTIPLIERS,
  TIMELINE_RULES,
} from "./timeline-rules";

import type { ConstructionGrade } from "./cost-config";

import type {
  TimelineEstimateInput,
  TimelineEstimateResult,
  TimelinePhaseEstimate,
} from "./timeline-types";

function sanitizeArea(value: number): number {
  if (!Number.isFinite(value)) return 1000;
  return Math.max(100, Math.min(Math.round(value), 100000));
}

function sanitizeCount(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(Math.round(value ?? fallback), 100));
}

function normalizeGrade(value?: ConstructionGrade): ConstructionGrade {
  if (value === "economy" || value === "standard" || value === "premium") {
    return value;
  }

  return "standard";
}

function roundDays(value: number): number {
  return Math.max(1, Math.round(value));
}

export function estimateConstructionTimeline(
  input: TimelineEstimateInput,
): TimelineEstimateResult {
  const builtUpAreaSqFt = sanitizeArea(input.builtUpAreaSqFt);
  const floorCount = Math.max(1, sanitizeCount(input.floorCount, 1));
  const grade = normalizeGrade(input.grade);

  const roomCount = Math.max(
    1,
    sanitizeCount(input.roomCount, Math.max(2, Math.round(builtUpAreaSqFt / 300))),
  );

  const bathroomCount = Math.max(
    1,
    sanitizeCount(input.bathroomCount, Math.max(1, Math.round(roomCount / 2))),
  );

  const hasInteriorWork = Boolean(input.hasInteriorWork);

  const areaFactor = builtUpAreaSqFt / 1000;
  const floorMultiplier =
    floorCount <= 1 ? 1 : 1 + Math.min(floorCount - 1, 10) * 0.12;

  const gradeMultiplier = TIMELINE_GRADE_MULTIPLIERS[grade] ?? 1;
  const roomMultiplier = 1 + Math.max(0, roomCount - 3) * 0.025;
  const bathroomMultiplier = 1 + Math.max(0, bathroomCount - 1) * 0.03;
  const interiorMultiplier = hasInteriorWork ? 1.14 : 1;

  const phases: TimelinePhaseEstimate[] = TIMELINE_RULES.map((rule) => {
    let multiplier = floorMultiplier * gradeMultiplier;

    if (
      rule.key === "electrical_plumbing_rough" ||
      rule.key === "doors_windows" ||
      rule.key === "painting" ||
      rule.key === "final_finishing"
    ) {
      multiplier *= roomMultiplier;
    }

    if (
      rule.key === "electrical_plumbing_rough" ||
      rule.key === "final_finishing"
    ) {
      multiplier *= bathroomMultiplier;
    }

    if (
      rule.key === "painting" ||
      rule.key === "final_finishing"
    ) {
      multiplier *= interiorMultiplier;
    }

    const estimatedDays = roundDays(
      (rule.baseDays + rule.daysPer1000SqFt * areaFactor) * multiplier,
    );

    return {
      key: rule.key,
      label: rule.label,
      description: rule.description,
      estimatedDays,
      sequence: rule.sequence,
      dependency: rule.dependency,
      vendorCategory: rule.vendorCategory,
      riskLevel: rule.riskLevel,
      note: rule.note,
    };
  }).sort((a, b) => a.sequence - b.sequence);

  const totalEstimatedDays = phases.reduce(
    (sum, phase) => sum + phase.estimatedDays,
    0,
  );

  return {
    builtUpAreaSqFt,
    floorCount,
    grade,
    roomCount,
    bathroomCount,
    hasInteriorWork,
    totalEstimatedDays,
    totalEstimatedWeeks: Math.ceil(totalEstimatedDays / 7),
    phases,
    assumptions: [
      "This is an indicative construction timeline estimate for early planning.",
      "Actual duration depends on labour availability, weather, material delivery, cash flow, site access and contractor coordination.",
      "RCC and foundation phases may vary significantly based on structural design and curing requirements.",
      "Premium finishing and interior work may increase project duration.",
      "This timeline can later be connected to procurement scheduling and milestone tracking.",
    ],
  };
}

export function buildTimelineRfqDescription(
  timeline: TimelineEstimateResult,
): string {
  return [
    "AI Construction Timeline Estimate:",
    `Built-up area: ${timeline.builtUpAreaSqFt} sq.ft`,
    `Floors: ${timeline.floorCount}`,
    `Rooms: ${timeline.roomCount}`,
    `Bathrooms: ${timeline.bathroomCount}`,
    `Grade: ${timeline.grade}`,
    `Estimated duration: ${timeline.totalEstimatedDays} days / approx ${timeline.totalEstimatedWeeks} weeks`,
    "",
    "Phase-wise Timeline:",
    ...timeline.phases.map(
      (phase) =>
        `• ${phase.label}: approx ${phase.estimatedDays} days (${phase.vendorCategory})`,
    ),
    "",
    "Note: Vendor should confirm actual work schedule, manpower deployment, material dependency and milestone-wise completion plan.",
  ].join("\n");
}