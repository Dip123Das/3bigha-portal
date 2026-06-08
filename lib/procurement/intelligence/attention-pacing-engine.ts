import { ExecutiveAttentionMode } from "./adaptive-collapse-engine";

export type AttentionPacingInput = {
  attentionMode?: ExecutiveAttentionMode;
  interruptionCount?: number;
  visibleCards?: number;
  sessionMinutes?: number;
  criticalCount?: number;
};

export type AttentionPacingDecision = {
  pace: "immediate" | "batched" | "calm" | "sleep";
  maxVisibleInterruptions: number;
  summaryCadence: "live" | "short" | "periodic" | "quiet";
  reason: string;
};

export function resolveAttentionPacing(input: AttentionPacingInput = {}): AttentionPacingDecision {
  const interruptionCount = Number(input.interruptionCount || 0);
  const criticalCount = Number(input.criticalCount || 0);
  const visibleCards = Number(input.visibleCards || 0);
  const sessionMinutes = Number(input.sessionMinutes || 0);

  if (criticalCount > 0 || input.attentionMode === "critical") {
    return {
      pace: "immediate",
      maxVisibleInterruptions: 6,
      summaryCadence: "live",
      reason: "Critical conditions bypass calm pacing.",
    };
  }

  if (interruptionCount > 8 || visibleCards > 8 || sessionMinutes > 45) {
    return {
      pace: "calm",
      maxVisibleInterruptions: 3,
      summaryCadence: "periodic",
      reason: "High operational load compressed to reduce fatigue.",
    };
  }

  if (interruptionCount > 3 || input.attentionMode === "focused") {
    return {
      pace: "batched",
      maxVisibleInterruptions: 4,
      summaryCadence: "short",
      reason: "Moderate attention pressure batched into fewer surfaces.",
    };
  }

  return {
    pace: "sleep",
    maxVisibleInterruptions: 2,
    summaryCadence: "quiet",
    reason: "Stable operations remain quiet unless risk rises.",
  };
}
