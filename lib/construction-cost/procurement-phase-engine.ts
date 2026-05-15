import { estimateConstructionTimeline } from "./timeline-estimator";
import { PROCUREMENT_TRIGGER_RULES } from "./procurement-trigger-rules";

import type {
  ProcurementPhaseInput,
  ProcurementPhaseSchedule,
  ProcurementPhaseTrigger,
} from "./procurement-phase-types";

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

function subtractDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
}

export function generateProcurementPhaseSchedule(
  input: ProcurementPhaseInput,
): ProcurementPhaseSchedule {
  const timeline = estimateConstructionTimeline({
    builtUpAreaSqFt: input.builtUpAreaSqFt,
    floorCount: input.floorCount,
    grade: input.grade,
    roomCount: input.roomCount,
    bathroomCount: input.bathroomCount,
    hasInteriorWork: input.hasInteriorWork,
  });

  const projectStart = parseStartDate(input.projectStartDate);

  let cursor = new Date(projectStart);

  const phaseWindows = timeline.phases.map((phase) => {
    const startDate = new Date(cursor);
    const endDate = addDays(startDate, phase.estimatedDays);

    cursor = new Date(endDate);

    return {
      phaseKey: phase.key,
      sequence: phase.sequence,
      startDate,
      endDate,
      estimatedDays: phase.estimatedDays,
    };
  });

  const triggers: ProcurementPhaseTrigger[] = PROCUREMENT_TRIGGER_RULES.flatMap(
    (rule) => {
      const phase = phaseWindows.find((item) => item.phaseKey === rule.phaseKey);

      if (!phase) return [];

      const triggerDate = subtractDays(
        phase.startDate,
        rule.recommendedLeadDays,
      );

      return [
        {
          ...rule,
          triggerDate: toDateOnly(triggerDate),
          phaseStartDate: toDateOnly(phase.startDate),
          phaseEndDate: toDateOnly(phase.endDate),
          phaseDurationDays: phase.estimatedDays,
          sequence: phase.sequence,
        },
      ];
    },
  ).sort((a, b) => {
    const dateCompare =
      new Date(a.triggerDate).getTime() - new Date(b.triggerDate).getTime();

    if (dateCompare !== 0) return dateCompare;

    return a.sequence - b.sequence;
  });

  return {
    projectStartDate: toDateOnly(projectStart),
    estimatedCompletionDate: toDateOnly(cursor),
    totalEstimatedDays: timeline.totalEstimatedDays,
    builtUpAreaSqFt: timeline.builtUpAreaSqFt,
    floorCount: timeline.floorCount,
    grade: timeline.grade,
    triggers,
    assumptions: [
      "This procurement schedule is generated from the AI construction timeline estimate.",
      "Trigger dates indicate when RFQ/vendor coordination should ideally begin.",
      "Actual procurement dates may change due to vendor availability, material stock, transport, payment timing and weather.",
      "Critical triggers should be handled before phase start to avoid work stoppage.",
      "This schedule is designed for future connection with 3bigha Procurement OS.",
    ],
  };
}

export function buildProcurementScheduleRfqDescription(
  schedule: ProcurementPhaseSchedule,
): string {
  return [
    "AI Procurement Phase Schedule:",
    `Project start: ${schedule.projectStartDate}`,
    `Estimated completion: ${schedule.estimatedCompletionDate}`,
    `Estimated duration: ${schedule.totalEstimatedDays} days`,
    "",
    "Procurement Triggers:",
    ...schedule.triggers.map(
      (trigger) =>
        `• ${trigger.triggerDate}: ${trigger.title} (${trigger.rfqCategory}) before ${trigger.phaseKey}`,
    ),
    "",
    "Note: Please coordinate vendor quotations, delivery timeline and site readiness according to the phase schedule.",
  ].join("\n");
}