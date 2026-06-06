import type { CognitiveSignal } from "./executive-cognitive-core";

const severityWeight: Record<CognitiveSignal["severity"], number> = {
  critical: 5,
  actionable: 4,
  watch: 3,
  passive: 2,
  noise: 1,
};

export type SequencedCognitiveSignal = CognitiveSignal & {
  sequenceRank: number;
  groupedReason: string;
};

export function sequenceExecutiveSignals(
  signals: CognitiveSignal[]
): SequencedCognitiveSignal[] {
  return [...signals]
    .sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity])
    .map((signal, index) => ({
      ...signal,
      sequenceRank: index + 1,
      groupedReason:
        signal.severity === "critical"
          ? "Placed first because it may block procurement continuity."
          : signal.severity === "actionable"
            ? "Placed next because it needs supervised human action."
            : signal.severity === "noise"
              ? "Moved lower to reduce unnecessary interruption."
              : "Sequenced for calm operational reading.",
    }));
}

export function batchLowValueInterruptions(signals: CognitiveSignal[]) {
  const priority = signals.filter(
    (s) => s.severity === "critical" || s.severity === "actionable"
  );

  const batched = signals.filter(
    (s) => s.severity === "watch" || s.severity === "passive" || s.severity === "noise"
  );

  return {
    priority,
    batched,
    explanation:
      batched.length > 0
        ? `${batched.length} low-pressure signal${batched.length > 1 ? "s were" : " was"} batched to protect focus.`
        : "No low-value interruptions required batching.",
  };
}
