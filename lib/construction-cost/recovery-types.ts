export type RecoverySeverity = "low" | "medium" | "high" | "critical";

export type RecoveryActionType =
  | "buyer_warning"
  | "procurement_escalation"
  | "alternate_vendor"
  | "schedule_recovery"
  | "material_followup"
  | "contractor_followup"
  | "site_supervision";

export type ConstructionRecoveryMilestone = {
  id?: string;
  project_id?: string;
  title?: string;
  name?: string;
  phase?: string;
  status?: string;
  planned_start?: string | null;
  planned_end?: string | null;
  actual_start?: string | null;
  actual_end?: string | null;
  due_date?: string | null;
  progress_percent?: number | null;
  dependency?: string | null;
  blocker_reason?: string | null;
  notes?: string | null;
};

export type RecoveryRiskSignal = {
  code: string;
  label: string;
  severity: RecoverySeverity;
  message: string;
};

export type RecoveryAction = {
  type: RecoveryActionType;
  title: string;
  description: string;
  priority: RecoverySeverity;
  recommendedOwner: "buyer" | "vendor" | "contractor" | "supervisor" | "system";
  automationReady: boolean;
};

export type ConstructionRecoveryPlan = {
  projectId: string;
  generatedAt: string;
  overallSeverity: RecoverySeverity;
  delayedMilestones: ConstructionRecoveryMilestone[];
  blockedMilestones: ConstructionRecoveryMilestone[];
  riskSignals: RecoveryRiskSignal[];
  actions: RecoveryAction[];
  buyerWarning: string;
  procurementEscalation: string;
  alternateVendorSuggestion: string;
  autonomousRecoveryReady: boolean;
};
