export type WorkflowModule =
  | "property"
  | "materials"
  | "services"
  | "rentals"
  | "rfq"
  | "inbox"
  | "vendor"
  | "buyer"
  | "procurement"
  | "investment"
  | "construction"
  | "general";

export type WorkflowStage =
  | "started"
  | "draft"
  | "submitted"
  | "review"
  | "comparison"
  | "conversation"
  | "negotiation"
  | "accepted"
  | "dispatch"
  | "billing"
  | "completed"
  | "paused";

export type WorkflowContinuityState = {
  id: string;
  module: WorkflowModule;
  stage: WorkflowStage;
  title: string;
  summary?: string;
  href: string;
  primaryActionLabel?: string;
  updatedAt: number;
};
