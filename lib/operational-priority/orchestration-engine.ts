export type WorkflowExecutionState =
  | "execute-now"
  | "high-priority"
  | "scheduled"
  | "blocked"
  | "stable";

export type WorkflowExecutionItem = {
  state: WorkflowExecutionState;
  title: string;
  detail: string;
  score: number;
  href?: string;
};

export type OperationalOrchestrationResult = {
  highestPriorityWorkflow?: WorkflowExecutionItem | null;
  blockedWorkflows: WorkflowExecutionItem[];
  recommendedSequence: WorkflowExecutionItem[];
  quickWins: WorkflowExecutionItem[];
  stableFlows: WorkflowExecutionItem[];
};

function rankState(score: number): WorkflowExecutionState {
  if (score >= 90) return "execute-now";
  if (score >= 70) return "high-priority";
  if (score >= 45) return "scheduled";
  if (score >= 20) return "blocked";
  return "stable";
}

export function buildOperationalOrchestration(input: {
  unread?: number;
  stale?: number;
  highRisk?: number;
  pendingQuotes?: number;
  activeThreads?: number;
  href?: string;
}): OperationalOrchestrationResult {
  const rows: WorkflowExecutionItem[] = [];

  if ((input.highRisk || 0) > 0) {
    const score = Math.min(100, 80 + input.highRisk! * 5);

    rows.push({
      state: rankState(score),
      score,
      title: "Resolve high-risk workflow",
      detail: `${input.highRisk} workflow(s) require immediate operational review.`,
      href: input.href,
    });
  }

  if ((input.stale || 0) > 0) {
    const score = Math.min(100, 60 + input.stale! * 4);

    rows.push({
      state: rankState(score),
      score,
      title: "Recover delayed conversations",
      detail: `${input.stale} workflow(s) may require follow-up recovery.`,
      href: input.href,
    });
  }

  if ((input.unread || 0) > 0) {
    const score = Math.min(100, 40 + input.unread! * 3);

    rows.push({
      state: rankState(score),
      score,
      title: "Review unread operational messages",
      detail: `${input.unread} unread workflow communication item(s).`,
      href: input.href,
    });
  }

  if ((input.pendingQuotes || 0) > 0) {
    const score = Math.min(100, 35 + input.pendingQuotes! * 3);

    rows.push({
      state: rankState(score),
      score,
      title: "Finalize quotation comparison",
      detail: `${input.pendingQuotes} quotation workflow(s) pending action.`,
      href: input.href,
    });
  }

  if (!rows.length && (input.activeThreads || 0) > 0) {
    rows.push({
      state: "stable",
      score: 10,
      title: "Operational workflows stable",
      detail: `${input.activeThreads} active workflow(s) currently stable.`,
      href: input.href,
    });
  }

  const sorted = rows.sort((a, b) => b.score - a.score);

  return {
    highestPriorityWorkflow: sorted[0] || null,

    blockedWorkflows: sorted.filter(
      (x) => x.state === "blocked"
    ),

    recommendedSequence: sorted.filter(
      (x) =>
        x.state === "execute-now" ||
        x.state === "high-priority" ||
        x.state === "scheduled"
    ),

    quickWins: sorted.filter(
      (x) => x.score >= 35 && x.score <= 60
    ),

    stableFlows: sorted.filter(
      (x) => x.state === "stable"
    ),
  };
}
