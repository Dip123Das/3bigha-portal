import type { ConstructionGrade } from "./cost-config";

export type ConstructionTimelinePhaseKey =
  | "planning"
  | "foundation"
  | "rcc"
  | "brickwork"
  | "electrical_plumbing_rough"
  | "plaster"
  | "flooring"
  | "doors_windows"
  | "painting"
  | "final_finishing"
  | "handover";

export type TimelineRiskLevel = "low" | "medium" | "high";

export type TimelineEstimateInput = {
  builtUpAreaSqFt: number;
  floorCount?: number;
  grade?: ConstructionGrade;
  roomCount?: number;
  bathroomCount?: number;
  hasInteriorWork?: boolean;
};

export type TimelinePhaseEstimate = {
  key: ConstructionTimelinePhaseKey;
  label: string;
  description: string;
  estimatedDays: number;
  sequence: number;
  dependency: string;
  vendorCategory: string;
  riskLevel: TimelineRiskLevel;
  note: string;
};

export type TimelineEstimateResult = {
  builtUpAreaSqFt: number;
  floorCount: number;
  grade: ConstructionGrade;
  roomCount: number;
  bathroomCount: number;
  hasInteriorWork: boolean;
  totalEstimatedDays: number;
  totalEstimatedWeeks: number;
  phases: TimelinePhaseEstimate[];
  assumptions: string[];
};