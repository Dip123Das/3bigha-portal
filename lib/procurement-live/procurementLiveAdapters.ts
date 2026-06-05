import {
  normalizeHeartbeatState,
  normalizeProcurementUrgency,
  normalizeWorkflowTone,
} from "./procurementLiveLanguage";

export function normalizeOperationalTone(value?: string | null) {
  const tone = normalizeWorkflowTone(value);

  switch (tone) {
    case "completed":
      return {
        key: tone,
        label: "Completed",
        color: "#64748b",
      };

    case "waiting":
      return {
        key: tone,
        label: "Awaiting response",
        color: "#2563eb",
      };

    case "progressing":
      return {
        key: tone,
        label: "Progressing",
        color: "#059669",
      };

    default:
      return {
        key: "active",
        label: "Operational",
        color: "#059669",
      };
  }
}

export function normalizeOperationalUrgency(
  value?: string | null
) {
  const urgency = normalizeProcurementUrgency(value);

  switch (urgency) {
    case "critical":
      return {
        key: urgency,
        label: "Critical attention",
        color: "#dc2626",
      };

    case "urgent":
      return {
        key: urgency,
        label: "Urgent",
        color: "#d97706",
      };

    case "important":
      return {
        key: urgency,
        label: "Needs attention",
        color: "#2563eb",
      };

    default:
      return {
        key: "normal",
        label: "Normal flow",
        color: "#059669",
      };
  }
}

export function normalizeOperationalHeartbeat(
  value?: string | null
) {
  const heartbeat = normalizeHeartbeatState(value);

  switch (heartbeat) {
    case "stale":
      return {
        key: heartbeat,
        label: "Workflow becoming stale",
        color: "#d97706",
      };

    case "attention":
      return {
        key: heartbeat,
        label: "Needs operational attention",
        color: "#dc2626",
      };

    case "watching":
      return {
        key: heartbeat,
        label: "Monitoring workflow",
        color: "#2563eb",
      };

    default:
      return {
        key: "healthy",
        label: "Operationally healthy",
        color: "#059669",
      };
  }
}