import type { ConstructionGrade } from "./cost-config";
import type { ConstructionTimelinePhaseKey } from "./timeline-types";

export type ConstructionMilestoneStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "delayed"
  | "blocked";

export type ConstructionMilestonePriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type ConstructionMilestoneInput = {
  projectId?: string;
  builtUpAreaSqFt: number;
  floorCount?: number;
  grade?: ConstructionGrade;
  roomCount?: number;
  bathroomCount?: number;
  hasInteriorWork?: boolean;
  projectStartDate?: string;
};

export type ConstructionMilestone = {
  key: ConstructionTimelinePhaseKey;
  title: string;
  description: string;
  sequence: number;
  status: ConstructionMilestoneStatus;
  priority: ConstructionMilestonePriority;
  plannedStartDate: string;
  plannedEndDate: string;
  estimatedDays: number;
  progressPercent: number;
  vendorCategory: string;
  dependency: string;
  aiRiskNote: string;
};

export type ConstructionMilestonePlan = {
  projectId?: string;
  projectStartDate: string;
  estimatedCompletionDate: string;
  totalEstimatedDays: number;
  milestones: ConstructionMilestone[];
  assumptions: string[];
};

export type ConstructionProjectMilestoneDbRow = {
  id: string;
  project_id: string;
  user_id: string | null;

  milestone_key: string;
  title: string;
  description: string | null;
  sequence: number;

  status: ConstructionMilestoneStatus;
  priority: ConstructionMilestonePriority;

  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;

  estimated_days: number;
  progress_percent: number;

  vendor_category: string | null;
  dependency: string | null;
  ai_risk_note: string | null;

  created_at: string;
  updated_at: string;
};
