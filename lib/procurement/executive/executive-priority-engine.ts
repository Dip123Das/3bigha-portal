export type ExecutivePriorityInput = {
  critical?: number;
  warning?: number;
  recoveryPressure?: number;
  escalationPressure?: number;
  recoveryLikely?: boolean;
  blocked?: number;
};

export type ExecutivePriorityResult = {
  score: number;
  level: "stable" | "attention" | "priority" | "critical";
};

export function evaluateExecutivePriority(
  input: ExecutivePriorityInput
): ExecutivePriorityResult {
  let score = 0;

  score += (input.critical || 0) * 18;
  score += (input.warning || 0) * 8;
  score += (input.blocked || 0) * 10;

  score += Math.min(input.recoveryPressure || 0, 100) * 0.45;

  score += Math.min(input.escalationPressure || 0, 100) * 0.55;

  if (input.recoveryLikely === false) {
    score += 18;
  }

  if (score >= 90) {
    return {
      score,
      level: "critical",
    };
  }

  if (score >= 60) {
    return {
      score,
      level: "priority",
    };
  }

  if (score >= 30) {
    return {
      score,
      level: "attention",
    };
  }

  return {
    score,
    level: "stable",
  };
}
