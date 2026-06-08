export type ExecutiveFatigueInput = {
  visibleCards?: number;
  interruptionCount?: number;
  repeatedSignals?: number;
  sessionMinutes?: number;
  criticalCount?: number;
};

export type ExecutiveFatigueState = {
  level: "low" | "medium" | "high" | "overloaded";
  score: number;
  recommendation: string;
  shouldEnterCalmMode: boolean;
};

export function evaluateExecutiveFatigue(input: ExecutiveFatigueInput = {}): ExecutiveFatigueState {
  const score =
    Number(input.visibleCards || 0) * 8 +
    Number(input.interruptionCount || 0) * 10 +
    Number(input.repeatedSignals || 0) * 6 +
    Math.min(40, Number(input.sessionMinutes || 0)) -
    Number(input.criticalCount || 0) * 4;

  if (score >= 120) {
    return {
      level: "overloaded",
      score,
      recommendation: "Enter calm mode and batch non-critical signals.",
      shouldEnterCalmMode: true,
    };
  }

  if (score >= 80) {
    return {
      level: "high",
      score,
      recommendation: "Suppress passive signals and summarize repeated intelligence.",
      shouldEnterCalmMode: true,
    };
  }

  if (score >= 45) {
    return {
      level: "medium",
      score,
      recommendation: "Keep active work visible and compress background intelligence.",
      shouldEnterCalmMode: false,
    };
  }

  return {
    level: "low",
    score,
    recommendation: "Operational load is calm.",
    shouldEnterCalmMode: false,
  };
}
