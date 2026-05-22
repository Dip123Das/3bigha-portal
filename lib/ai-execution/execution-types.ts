export type AiExecutionSource =
  | "search"
  | "workflow"
  | "inbox"
  | "rfq"
  | "vendor"
  | "property"
  | "procurement"
  | "global";

export type AiExecutionUrgency = "critical" | "high" | "medium" | "normal";

export type AiExecutionActionType =
  | "rfq"
  | "vendor"
  | "price"
  | "logistics"
  | "negotiation"
  | "followup"
  | "recovery"
  | "construction"
  | "investment"
  | "legal"
  | "workflow"
  | "monitor";

export type AiExecutionAction = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  type: AiExecutionActionType;
  priority: AiExecutionUrgency;
};

export type AiExecutionInput = {
  query?: string;
  module?: string;
  source?: AiExecutionSource;
  readinessScore?: number;
  negotiationScore?: number;
  resultCount?: number;
  inboxUrgency?: "Critical" | "High" | "Normal" | "Now" | "Today" | "Monitor";
  procurementStage?: string;
  workflowRisk?: "High" | "Medium" | "Low";
  closurePrediction?: "High" | "Medium" | "Low";
};

export type AiExecutionPlan = {
  show: boolean;
  title: string;
  subtitle: string;
  stage: string;
  urgency: AiExecutionUrgency;
  score: number;
  actions: AiExecutionAction[];
  signals: string[];
};