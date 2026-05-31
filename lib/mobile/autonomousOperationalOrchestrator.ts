import { notifyUser } from "./notifyUser";

export type OrchestratorState =
  | "balanced"
  | "loaded"
  | "strained"
  | "overloaded"
  | "critical";

export function calculateOperationalOrchestrator(input: {
  activeWorkflows?: number;
  delayedWorkflows?: number;
  recoveryWorkflows?: number;
  urgentOperations?: number;
  failedOperations?: number;
  unreadOperationalEvents?: number;
  supplierStressSignals?: number;
  crisisOperations?: number;
}) {
  const active = Number(input.activeWorkflows || 0);
  const delayed = Number(input.delayedWorkflows || 0);
  const recovery = Number(input.recoveryWorkflows || 0);
  const urgent = Number(input.urgentOperations || 0);
  const failed = Number(input.failedOperations || 0);
  const unread = Number(input.unreadOperationalEvents || 0);
  const supplierStress = Number(input.supplierStressSignals || 0);
  const crises = Number(input.crisisOperations || 0);

  let score = 0;

  score += delayed * 12;
  score += recovery * 10;
  score += urgent * 15;
  score += failed * 20;
  score += supplierStress * 14;
  score += crises * 30;

  if (unread >= 10) score += 10;
  if (unread >= 25) score += 20;

  if (active >= 20) score += 10;
  if (active >= 50) score += 20;

  const state: OrchestratorState =
    score >= 130
      ? "critical"
      : score >= 95
      ? "overloaded"
      : score >= 65
      ? "strained"
      : score >= 35
      ? "loaded"
      : "balanced";

  return {
    score,
    state,

    requiresIntervention:
      state === "strained" ||
      state === "overloaded" ||
      state === "critical",
  };
}

export function buildOrchestratorDirective(
  state: OrchestratorState
) {
  switch (state) {
    case "critical":
      return {
        title: "Critical operational orchestration failure risk",

        body:
          "Multiple operational systems require immediate coordination.",

        directive:
          "Prioritize crisis workflows and recover failed operational chains.",
      };

    case "overloaded":
      return {
        title: "Operational systems overloaded",

        body:
          "Workflow pressure is exceeding healthy execution capacity.",

        directive:
          "Rebalance procurement priorities and resolve delayed workflows.",
      };

    case "strained":
      return {
        title: "Operational coordination strained",

        body:
          "Several workflows require active orchestration and follow-up.",

        directive:
          "Review urgent operations and recovery pipelines.",
      };

    case "loaded":
      return {
        title: "Operational activity elevated",

        body:
          "Execution activity is increasing across workflows.",

        directive:
          "Monitor procurement execution load carefully.",
      };

    default:
      return {
        title: "Operational orchestration balanced",

        body:
          "Operational systems currently stable.",

        directive:
          "Continue standard operational monitoring.",
      };
  }
}

export async function notifyOperationalOrchestrator(input: {
  userId: string;

  url: string;

  state: OrchestratorState;

  score: number;
}) {
  if (!input.userId) return;

  const directive =
    buildOrchestratorDirective(
      input.state
    );

  await notifyUser(input.userId, {
    title: directive.title,

    body: directive.body,

    category:
      input.state === "critical" ||
      input.state === "overloaded"
        ? "procurement_alert"
        : "operational_alert",

    url: input.url,

    data: {
      source:
        "ai_autonomous_operational_orchestrator",

      orchestratorState:
        input.state,

      orchestratorScore:
        String(input.score),

      directive:
        directive.directive,
    },
  });
}