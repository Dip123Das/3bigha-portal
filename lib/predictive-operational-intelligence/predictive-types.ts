export type PredictiveSeverity = "calm" | "watch" | "pressure" | "risk";

export type PredictiveSignal = {
  id: string;
  title: string;
  message: string;
  severity: PredictiveSeverity;
  score: number;
  actionLabel?: string;
  href?: string;
};

export type WorkflowPredictionInput = {
  openWorkflows?: number;
  staleWorkflows?: number;
  pendingReplies?: number;
  overdueTasks?: number;
  supplierSilenceHours?: number;
  executionBlockedItems?: number;
  recentFailures?: number;
};

export type PredictiveOperationalSummary = {
  overallSeverity: PredictiveSeverity;
  overallScore: number;
  signals: PredictiveSignal[];
  updatedAt: string;
};
