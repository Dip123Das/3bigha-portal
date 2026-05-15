import type { ConstructionGrade } from "./cost-config";
import type { ConstructionTimelinePhaseKey } from "./timeline-types";

export type ProcurementTriggerPriority = "low" | "medium" | "high" | "critical";

export type ProcurementTriggerType =
  | "material"
  | "labour"
  | "service"
  | "rental"
  | "inspection"
  | "payment"
  | "coordination";

export type ProcurementPhaseInput = {
  builtUpAreaSqFt: number;
  floorCount?: number;
  grade?: ConstructionGrade;
  roomCount?: number;
  bathroomCount?: number;
  hasInteriorWork?: boolean;
  projectStartDate?: string;
};

export type ProcurementTriggerRule = {
  phaseKey: ConstructionTimelinePhaseKey;
  triggerType: ProcurementTriggerType;
  title: string;
  description: string;
  recommendedLeadDays: number;
  priority: ProcurementTriggerPriority;
  vendorCategory: string;
  rfqCategory: string;
  rfqReadyName: string;
  note: string;
};

export type ProcurementPhaseTrigger = ProcurementTriggerRule & {
  triggerDate: string;
  phaseStartDate: string;
  phaseEndDate: string;
  phaseDurationDays: number;
  sequence: number;
};

export type ProcurementPhaseSchedule = {
  projectStartDate: string;
  estimatedCompletionDate: string;
  totalEstimatedDays: number;
  builtUpAreaSqFt: number;
  floorCount: number;
  grade: ConstructionGrade;
  triggers: ProcurementPhaseTrigger[];
  assumptions: string[];
};