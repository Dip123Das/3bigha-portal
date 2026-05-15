import { estimateConstructionTimeline } from "./timeline-estimator";

import type {
  ConstructionMilestone,
  ConstructionMilestoneInput,
  ConstructionMilestonePlan,
  ConstructionMilestonePriority,
} from "./milestone-types";

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseStartDate(value?: string): Date {
  if (!value) return new Date();

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function priorityFromRisk(risk: string): ConstructionMilestonePriority {
  if (risk === "high") return "critical";
  if (risk === "medium") return "high";
  return "medium";
}

export function generateConstructionMilestonePlan(
  input: ConstructionMilestoneInput,
): ConstructionMilestonePlan {
  const timeline = estimateConstructionTimeline({
    builtUpAreaSqFt: input.builtUpAreaSqFt,
    floorCount: input.floorCount,
    grade: input.grade,
    roomCount: input.roomCount,
    bathroomCount: input.bathroomCount,
    hasInteriorWork: input.hasInteriorWork,
  });

  const startDate = parseStartDate(input.projectStartDate);
  let cursor = new Date(startDate);

  const milestones: ConstructionMilestone[] = timeline.phases.map((phase) => {
    const plannedStartDate = new Date(cursor);
    const plannedEndDate = addDays(plannedStartDate, phase.estimatedDays);

    cursor = new Date(plannedEndDate);

    return {
      key: phase.key,
      title: phase.label,
      description: phase.description,
      sequence: phase.sequence,
      status: "pending",
      priority: priorityFromRisk(phase.riskLevel),
      plannedStartDate: toDateOnly(plannedStartDate),
      plannedEndDate: toDateOnly(plannedEndDate),
      estimatedDays: phase.estimatedDays,
      progressPercent: 0,
      vendorCategory: phase.vendorCategory,
      dependency: phase.dependency,
      aiRiskNote: phase.note,
    };
  });

  return {
    projectId: input.projectId,
    projectStartDate: toDateOnly(startDate),
    estimatedCompletionDate: toDateOnly(cursor),
    totalEstimatedDays: timeline.totalEstimatedDays,
    milestones,
    assumptions: [
      "Milestones are generated from the AI construction timeline estimate.",
      "Actual progress should be updated by project owner, contractor or site supervisor.",
      "Delayed or blocked milestones should trigger procurement review and vendor follow-up.",
      "This milestone plan is prepared for future AI recovery and execution supervision.",
    ],
  };
}

export function calculateMilestoneProgress(
  milestones: Pick<ConstructionMilestone, "progressPercent">[],
): number {
  if (!milestones.length) return 0;

  const total = milestones.reduce(
    (sum, milestone) => sum + Math.max(0, Math.min(100, milestone.progressPercent)),
    0,
  );

  return Math.round(total / milestones.length);
}

export function buildMilestoneSummary(plan: ConstructionMilestonePlan): string {
  return [
    "AI Construction Milestone Plan:",
    `Project start: ${plan.projectStartDate}`,
    `Estimated completion: ${plan.estimatedCompletionDate}`,
    `Estimated duration: ${plan.totalEstimatedDays} days`,
    "",
    "Milestones:",
    ...plan.milestones.map(
      (milestone) =>
        `• ${milestone.sequence}. ${milestone.title}: ${milestone.plannedStartDate} to ${milestone.plannedEndDate} (${milestone.priority})`,
    ),
  ].join("\n");
}
