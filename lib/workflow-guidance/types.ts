export type WorkflowGuidanceSeverity =
  | "calm"
  | "attention"
  | "watch"
  | "priority";

export type WorkflowGuidanceItem = {
  id: string;
  message: string;
  severity: WorkflowGuidanceSeverity;
  actionLabel?: string;
  href?: string;
};

export type WorkflowGuidanceInput = {
  staleThreads?: number;
  pendingSuppliers?: number;
  delayedDeliveries?: number;
  blockedExecution?: number;
  pendingFollowups?: number;
};
