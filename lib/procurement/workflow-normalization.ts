import {
  getWorkflowAttentionLevel,
  getWorkflowHeartbeat,
  resolveProcurementWorkflowState,
  type ProcurementWorkflowResolveInput,
  type WorkflowHealth,
} from "@/lib/procurement/workflow-state";

export type ProcurementSignalTone =
  | "critical"
  | "high"
  | "medium"
  | "active"
  | "closed";

export type NormalizedProcurementSignal = {
  workflowStage: string;
  workflowLabel: string;
  workflowHealth: WorkflowHealth;
  signalTone: ProcurementSignalTone;
  attentionLabel: string;
  heartbeatLabel: string;
  heartbeatDetail: string;
  progress: number;
  operationalMessage: string;
  primaryAction: string;
};

function toneFromWorkflowHealth(health: WorkflowHealth): ProcurementSignalTone {
  if (health === "critical") return "critical";
  if (health === "attention") return "high";
  if (health === "completed") return "closed";
  if (health === "healthy") return "active";
  return "medium";
}

export function normalizeProcurementSignal(
  input: ProcurementWorkflowResolveInput & {
    updatedAt?: string | number | null;
  } = {}
): NormalizedProcurementSignal {
  const workflow = resolveProcurementWorkflowState(input);

  const heartbeat = getWorkflowHeartbeat(input.updatedAt);

  const attention = getWorkflowAttentionLevel({
    updatedAt: input.updatedAt,
    workflowRisk: input.workflowRisk,
    stage: workflow.stage,
  });

  return {
    workflowStage: workflow.stage,
    workflowLabel: workflow.label,
    workflowHealth: workflow.health,
    signalTone: toneFromWorkflowHealth(workflow.health),
    attentionLabel: attention.label,
    heartbeatLabel: heartbeat.label,
    heartbeatDetail: heartbeat.detail,
    progress: workflow.progress,
    operationalMessage: workflow.operationalMessage,
    primaryAction: workflow.primaryAction,
  };
}

export function normalizeLiveProcurementTone(
  tone?: string | null,
  updatedAt?: string | number | null
): ProcurementSignalTone {
  const raw = String(tone || "").trim().toLowerCase();

  if (raw === "critical" || raw === "danger") return "critical";
  if (raw === "high" || raw === "warning") return "high";
  if (raw === "medium") return "medium";
  if (raw === "closed" || raw === "completed") return "closed";

  const heartbeat = getWorkflowHeartbeat(updatedAt);
  if (heartbeat.level === "attention") return "critical";
  if (heartbeat.level === "stale") return "high";
  if (heartbeat.level === "watching") return "medium";

  return "active";
}
