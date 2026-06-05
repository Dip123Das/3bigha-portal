export type ProcurementHeartbeatState =
  | "healthy"
  | "watching"
  | "attention"
  | "stale";

export type ProcurementUrgencyLevel =
  | "normal"
  | "important"
  | "urgent"
  | "critical";

export type ProcurementWorkflowTone =
  | "active"
  | "waiting"
  | "progressing"
  | "completed";

export const PROCUREMENT_HEARTBEAT_LABELS: Record<
  ProcurementHeartbeatState,
  string
> = {
  healthy: "Operationally healthy",
  watching: "Monitoring activity",
  attention: "Needs attention",
  stale: "Workflow becoming stale",
};

export const PROCUREMENT_URGENCY_LABELS: Record<
  ProcurementUrgencyLevel,
  string
> = {
  normal: "Normal priority",
  important: "Important workflow",
  urgent: "Urgent response needed",
  critical: "Critical operational attention",
};

export const PROCUREMENT_WORKFLOW_TONES: Record<
  ProcurementWorkflowTone,
  string
> = {
  active: "Active workflow",
  waiting: "Awaiting response",
  progressing: "Progressing normally",
  completed: "Workflow completed",
};

export function normalizeProcurementUrgency(
  value?: string | null
): ProcurementUrgencyLevel {
  const normalized = value?.toLowerCase() || "";

  if (
    normalized.includes("critical") ||
    normalized.includes("risk")
  ) {
    return "critical";
  }

  if (
    normalized.includes("urgent") ||
    normalized.includes("high")
  ) {
    return "urgent";
  }

  if (
    normalized.includes("important") ||
    normalized.includes("attention")
  ) {
    return "important";
  }

  return "normal";
}

export function normalizeHeartbeatState(
  value?: string | null
): ProcurementHeartbeatState {
  const normalized = value?.toLowerCase() || "";

  if (
    normalized.includes("stale") ||
    normalized.includes("inactive")
  ) {
    return "stale";
  }

  if (
    normalized.includes("attention") ||
    normalized.includes("warning")
  ) {
    return "attention";
  }

  if (
    normalized.includes("watch") ||
    normalized.includes("monitor")
  ) {
    return "watching";
  }

  return "healthy";
}

export function normalizeWorkflowTone(
  value?: string | null
): ProcurementWorkflowTone {
  const normalized = value?.toLowerCase() || "";

  if (
    normalized.includes("complete") ||
    normalized.includes("done")
  ) {
    return "completed";
  }

  if (
    normalized.includes("wait") ||
    normalized.includes("pending")
  ) {
    return "waiting";
  }

  if (
    normalized.includes("progress") ||
    normalized.includes("processing")
  ) {
    return "progressing";
  }

  return "active";
}