import { IntelligenceDisclosureLevel } from "./adaptive-collapse-engine";

export type SectionSleepInput = {
  section: string;
  disclosureLevel?: IntelligenceDisclosureLevel;
  hasCriticalItems?: boolean;
  hasUserAction?: boolean;
  repeatedSignals?: boolean;
  passive?: boolean;
};

export type SectionSleepDecision = {
  asleep: boolean;
  collapsed: boolean;
  label: string;
  reason: string;
};

export function resolveSectionSleep(input: SectionSleepInput): SectionSleepDecision {
  if (input.hasCriticalItems || input.hasUserAction) {
    return {
      asleep: false,
      collapsed: false,
      label: "Active",
      reason: "Critical or user-actionable section remains visible.",
    };
  }

  if (input.disclosureLevel === "minimal" || input.passive || input.repeatedSignals) {
    return {
      asleep: true,
      collapsed: true,
      label: "Sleeping",
      reason: "Passive section is sleeping to reduce executive fatigue.",
    };
  }

  if (input.disclosureLevel === "summary") {
    return {
      asleep: false,
      collapsed: true,
      label: "Summarized",
      reason: "Section remains available as summary.",
    };
  }

  return {
    asleep: false,
    collapsed: false,
    label: "Open",
    reason: "Section visible under current disclosure level.",
  };
}
