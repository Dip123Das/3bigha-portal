export type AttentionSeverity =
  | "critical"
  | "high"
  | "medium"
  | "watch"
  | "stable";

export type AttentionSeverityInput = {
  priority?: string;
  tone?: string;
  stale?: boolean;
  blocked?: boolean;
  score?: number;
};

export function normalizeAttentionSeverity(input: AttentionSeverityInput): AttentionSeverity {
  const signal = `${input.priority || ""} ${input.tone || ""}`.toLowerCase();
  const score = Number(input.score || 0);

  if (input.blocked || input.stale || signal.includes("critical") || score >= 85) return "critical";
  if (signal.includes("high") || signal.includes("urgent") || score >= 70) return "high";
  if (signal.includes("medium") || signal.includes("attention") || score >= 45) return "medium";
  if (signal.includes("watch") || signal.includes("monitor") || score >= 25) return "watch";

  return "stable";
}

export function getAttentionSeverityRank(severity: AttentionSeverity) {
  return {
    critical: 5,
    high: 4,
    medium: 3,
    watch: 2,
    stable: 1,
  }[severity];
}

export function getAttentionSeverityLabel(severity: AttentionSeverity) {
  return {
    critical: "Critical",
    high: "High attention",
    medium: "Needs review",
    watch: "Watch",
    stable: "Stable",
  }[severity];
}
