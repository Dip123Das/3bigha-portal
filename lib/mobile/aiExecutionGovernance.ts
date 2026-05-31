import { notifyUser } from "./notifyUser";

export type ExecutionGovernanceState =
  | "normal"
  | "guided"
  | "controlled"
  | "restricted"
  | "emergency_control";

export function calculateExecutionGovernance(input: {
  failedAutonomousActions?: number;
  riskyActions?: number;
  pendingApprovals?: number;
  userOverrides?: number;
  crisisActions?: number;
  repeatedFailures?: number;
}) {
  let score = 0;

  score += Number(input.failedAutonomousActions || 0) * 18;
  score += Number(input.riskyActions || 0) * 20;
  score += Number(input.pendingApprovals || 0) * 8;
  score += Number(input.userOverrides || 0) * 10;
  score += Number(input.crisisActions || 0) * 25;
  score += Number(input.repeatedFailures || 0) * 22;

  const state: ExecutionGovernanceState =
    score >= 130
      ? "emergency_control"
      : score >= 95
      ? "restricted"
      : score >= 60
      ? "controlled"
      : score >= 30
      ? "guided"
      : "normal";

  return {
    score,
    state,
    requiresHumanReview:
      state === "controlled" ||
      state === "restricted" ||
      state === "emergency_control",
  };
}

export function buildGovernanceDirective(state: ExecutionGovernanceState) {
  switch (state) {
    case "emergency_control":
      return "Pause risky autonomous actions and require human review.";
    case "restricted":
      return "Restrict high-risk automation and review pending actions.";
    case "controlled":
      return "Keep automation guided with approval checks.";
    case "guided":
      return "Monitor AI actions with light supervision.";
    default:
      return "Execution governance normal.";
  }
}

export async function notifyExecutionGovernance(input: {
  userId: string;
  url: string;
  state: ExecutionGovernanceState;
  score: number;
}) {
  if (!input.userId) return;

  await notifyUser(input.userId, {
    title: "AI execution governance update",
    body: buildGovernanceDirective(input.state),
    category:
      input.state === "emergency_control" || input.state === "restricted"
        ? "procurement_alert"
        : "operational_alert",
    url: input.url,
    data: {
      source: "ai_execution_governance",
      governanceState: input.state,
      governanceScore: String(input.score),
      directive: buildGovernanceDirective(input.state),
    },
  });
}