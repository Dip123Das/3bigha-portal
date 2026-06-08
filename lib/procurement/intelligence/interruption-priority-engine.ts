import { normalizeAttentionSeverity, getAttentionSeverityRank } from "./attention-severity";

export type InterruptionInput = {
  id?: string;
  module?: string;
  title?: string;
  priority?: string;
  tone?: string;
  score?: number;
  stale?: boolean;
  blocked?: boolean;
  repeated?: boolean;
  passive?: boolean;
};

export type InterruptionDecision = {
  shouldInterrupt: boolean;
  shouldSummarize: boolean;
  shouldDelay: boolean;
  severity: ReturnType<typeof normalizeAttentionSeverity>;
  rank: number;
  reason: string;
};

export function resolveInterruptionPriority(input: InterruptionInput): InterruptionDecision {
  const severity = normalizeAttentionSeverity({
    priority: input.priority,
    tone: input.tone,
    score: input.score,
    stale: input.stale,
    blocked: input.blocked,
  });

  const rank = getAttentionSeverityRank(severity);

  if (input.blocked || input.stale || severity === "critical") {
    return {
      shouldInterrupt: true,
      shouldSummarize: false,
      shouldDelay: false,
      severity,
      rank,
      reason: "Critical or blocked operation requires immediate attention.",
    };
  }

  if (severity === "high") {
    return {
      shouldInterrupt: true,
      shouldSummarize: false,
      shouldDelay: false,
      severity,
      rank,
      reason: "High-attention operation should surface now.",
    };
  }

  if (input.repeated || input.passive || severity === "stable" || severity === "watch") {
    return {
      shouldInterrupt: false,
      shouldSummarize: true,
      shouldDelay: true,
      severity,
      rank,
      reason: "Passive or repeated signal compressed for calm operation.",
    };
  }

  return {
    shouldInterrupt: false,
    shouldSummarize: true,
    shouldDelay: false,
    severity,
    rank,
    reason: "Medium signal summarized without interrupting executive focus.",
  };
}

export function filterInterruptions(inputs: InterruptionInput[] = []) {
  return inputs
    .map((input) => ({ input, decision: resolveInterruptionPriority(input) }))
    .sort((a, b) => b.decision.rank - a.decision.rank);
}
