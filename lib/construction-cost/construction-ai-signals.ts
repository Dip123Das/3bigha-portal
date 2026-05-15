export type SignalSeverity = "low" | "medium" | "high" | "critical";

export type ConstructionAiSignal = {
  code: string;
  label: string;
  severity: SignalSeverity;
  message: string;
  scoreImpact: number;
};

export type ConstructionHealthScore = {
  score: number;
  grade: "excellent" | "stable" | "watch" | "risk" | "critical";
  summary: string;
};

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function severityWeight(severity: SignalSeverity): number {
  if (severity === "critical") return 30;
  if (severity === "high") return 20;
  if (severity === "medium") return 10;
  return 5;
}

export function gradeHealthScore(score: number): ConstructionHealthScore["grade"] {
  if (score >= 85) return "excellent";
  if (score >= 70) return "stable";
  if (score >= 55) return "watch";
  if (score >= 35) return "risk";
  return "critical";
}

export function summarizeHealth(score: number): string {
  const grade = gradeHealthScore(score);

  if (grade === "excellent") return "Project execution is healthy with strong delivery confidence.";
  if (grade === "stable") return "Project is broadly stable, but should be monitored regularly.";
  if (grade === "watch") return "Project needs attention because early execution risks are visible.";
  if (grade === "risk") return "Project is at execution risk and needs recovery supervision.";
  return "Project is critical and needs urgent recovery, escalation, and owner warning.";
}
