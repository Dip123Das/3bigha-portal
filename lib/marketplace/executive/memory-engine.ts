import type { AmeDecision } from "./types";

const inMemoryDecisionLog: AmeDecision[] = [];

export function rememberAmeDecision(decision: AmeDecision): AmeDecision {
  inMemoryDecisionLog.unshift(decision);

  if (inMemoryDecisionLog.length > 50) {
    inMemoryDecisionLog.pop();
  }

  return decision;
}

export function getRecentAmeDecisions(): AmeDecision[] {
  return [...inMemoryDecisionLog];
}
