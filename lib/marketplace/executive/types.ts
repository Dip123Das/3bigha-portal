export type AmeSignalSource =
  | "demand"
  | "supply"
  | "gap"
  | "growth"
  | "rfq"
  | "vendor"
  | "procurement"
  | "geography"
  | "mos";

export type AmeDecisionPriority = "low" | "medium" | "high" | "critical";

export type AmeRecommendedAction =
  | "generate_opportunity"
  | "notify_vendor"
  | "recruit_vendor"
  | "promote_location"
  | "monitor_only";

export type AmeSignal = {
  source: AmeSignalSource;
  title: string;
  score?: number;
  confidence?: number;
  location?: string | null;
  category?: string | null;
  metadata?: Record<string, unknown>;
};

export type AmeDecision = {
  decision_id: string;
  priority: AmeDecisionPriority;
  action: AmeRecommendedAction;
  title: string;
  reasoning: string;
  confidence: number;
  estimated_value?: number | null;
  signals: AmeSignal[];
  created_at: string;
};
